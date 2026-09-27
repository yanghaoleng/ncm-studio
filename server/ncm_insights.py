#!/usr/bin/env python3
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

DB_PATH = os.environ.get('NCM_INSIGHTS_DB', '/var/lib/ncm-insights/analytics.sqlite3')
ACCESS_CODE = os.environ.get('NCM_INSIGHTS_CODE', '')
PORT = int(os.environ.get('NCM_INSIGHTS_PORT', '8146'))
ALLOWED_ORIGINS = {value.strip() for value in os.environ.get('NCM_INSIGHTS_ORIGINS', 'https://ncm.mikeywa.icu').split(',') if value.strip()}
TZ = timezone(timedelta(hours=8))
TOKENS = {}
FAILURES = defaultdict(list)
VALID_EVENTS = {
    'page_view', 'upload_click', 'files_added', 'conversion_success',
    'conversion_failure', 'download', 'cli_click', 'donate_click',
}
VALID_FORMATS = {'NCM', 'FLAC', 'KGM', 'KGMA', 'VPR', '未知'}
VALID_UPLOAD_SURFACES = {'hero', 'choose_more', 'drop'}
VALID_CLI_ACTIONS = {'open', 'close', 'copy_link'}
VALID_DONATE_ACTIONS = {'open', 'close', 'alipay', 'wechat', 'copy_wechat'}

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def connect():
    database = sqlite3.connect(DB_PATH)
    database.row_factory = sqlite3.Row
    database.execute('PRAGMA journal_mode=WAL')
    database.execute('''CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, day TEXT NOT NULL,
        name TEXT NOT NULL, visitor_id TEXT NOT NULL, session_id TEXT NOT NULL,
        path TEXT NOT NULL, language TEXT NOT NULL, properties TEXT NOT NULL
    )''')
    database.execute('CREATE INDEX IF NOT EXISTS idx_events_day_name ON events(day, name)')
    database.execute('''CREATE TABLE IF NOT EXISTS legacy_daily (
        source TEXT NOT NULL, day TEXT NOT NULL, visitors INTEGER NOT NULL,
        pageviews INTEGER NOT NULL, imported_at TEXT NOT NULL,
        PRIMARY KEY (source, day)
    )''')
    database.execute('''CREATE TABLE IF NOT EXISTS legacy_totals (
        source TEXT NOT NULL, since_day TEXT NOT NULL, until_day TEXT NOT NULL,
        visitors INTEGER NOT NULL, pageviews INTEGER NOT NULL, imported_at TEXT NOT NULL,
        PRIMARY KEY (source, since_day, until_day)
    )''')
    database.commit()
    return database

def clean_id(value, prefix):
    value = str(value or '')
    return value if value.startswith(prefix) and 3 <= len(value) <= 80 and all(c.isalnum() or c in '_-' for c in value) else ''

def clean_properties(name, raw):
    raw = raw if isinstance(raw, dict) else {}
    result = {}
    if name == 'upload_click':
        result['surface'] = raw.get('surface') if raw.get('surface') in VALID_UPLOAD_SURFACES else 'hero'
    elif name == 'files_added':
        result['count'] = max(0, min(100, int(raw.get('count', 0) or 0)))
        formats = raw.get('formats') if isinstance(raw.get('formats'), dict) else {}
        result['formats'] = {key: max(0, min(100, int(value or 0))) for key, value in formats.items() if key in VALID_FORMATS}
    elif name.startswith('conversion_'):
        result['format'] = raw.get('format') if raw.get('format') in VALID_FORMATS else '未知'
        result['sizeBucket'] = raw.get('sizeBucket') if raw.get('sizeBucket') in {'<5 MB','5–25 MB','25–100 MB','≥100 MB'} else '未知'
        if name == 'conversion_success':
            result['durationBucket'] = str(raw.get('durationBucket', '未知'))[:20]
            try: duration_ms = int(raw.get('durationMs', 0) or 0)
            except (TypeError, ValueError): duration_ms = 0
            result['durationMs'] = max(0, min(900000, duration_ms))
        else: result['reason'] = str(raw.get('reason', 'conversion_error'))[:30]
    elif name == 'download':
        result['kind'] = raw.get('kind') if raw.get('kind') in {'single','zip'} else 'single'
        result['count'] = max(1, min(100, int(raw.get('count', 1) or 1)))
        if raw.get('format') in VALID_FORMATS: result['format'] = raw['format']
    elif name == 'cli_click':
        result['action'] = raw.get('action') if raw.get('action') in VALID_CLI_ACTIONS else 'open'
    elif name == 'donate_click':
        result['action'] = raw.get('action') if raw.get('action') in VALID_DONATE_ACTIONS else 'open'
    return result

class Handler(BaseHTTPRequestHandler):
    server_version = 'NcmInsights/1.0'

    def log_message(self, fmt, *args):
        print('%s %s' % (self.log_date_time_string(), fmt % args))

    def origin(self):
        return self.headers.get('Origin', '')

    def send_json(self, status, payload, extra=None):
        body = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        if self.origin() in ALLOWED_ORIGINS:
            self.send_header('Access-Control-Allow-Origin', self.origin())
            self.send_header('Vary', 'Origin')
        for key, value in (extra or {}).items(): self.send_header(key, value)
        self.end_headers(); self.wfile.write(body)

    def do_OPTIONS(self):
        if self.origin() not in ALLOWED_ORIGINS: return self.send_json(403, {'ok': False})
        self.send_json(204, {}, {'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'86400'})

    def body(self):
        length = int(self.headers.get('Content-Length', '0'))
        if length > 16384: raise ValueError('too large')
        return json.loads(self.rfile.read(length) or b'{}')

    def client_key(self):
        forwarded = self.headers.get('X-Forwarded-For', '').split(',')[0].strip()
        return hashlib.sha256((forwarded or self.client_address[0]).encode()).hexdigest()[:20]

    def authorized(self):
        header = self.headers.get('Authorization', '')
        token = header[7:] if header.startswith('Bearer ') else ''
        expiry = TOKENS.get(token, 0)
        if expiry <= time.time():
            TOKENS.pop(token, None); return False
        return True

    def do_POST(self):
        path = urlparse(self.path).path
        if self.origin() and self.origin() not in ALLOWED_ORIGINS: return self.send_json(403, {'message':'origin not allowed'})
        try: data = self.body()
        except Exception: return self.send_json(400, {'message':'invalid request'})
        if path.endswith('/auth'):
            key = self.client_key(); cutoff = time.time() - 600
            FAILURES[key] = [value for value in FAILURES[key] if value > cutoff]
            if len(FAILURES[key]) >= 5:
                retry = int(max(1, FAILURES[key][0] + 600 - time.time()))
                return self.send_json(429, {'message':'尝试过多','retryAfter':retry})
            if not ACCESS_CODE or not hmac.compare_digest(str(data.get('code','')), ACCESS_CODE):
                FAILURES[key].append(time.time()); return self.send_json(401, {'message':'访问码不正确'})
            FAILURES.pop(key, None); token = secrets.token_urlsafe(32); TOKENS[token] = time.time() + 8 * 3600
            return self.send_json(200, {'token':token,'expiresIn':28800})
        if path.endswith('/events'):
            name = data.get('name')
            visitor = clean_id(data.get('visitorId'), 'v_'); session = clean_id(data.get('sessionId'), 's_')
            if name not in VALID_EVENTS or not visitor or not session: return self.send_json(400, {'message':'invalid event'})
            created = datetime.now(timezone.utc); day = created.astimezone(TZ).date().isoformat()
            path_value = str(data.get('path','/'))[:40] if str(data.get('path','/')).startswith('/') else '/'
            language = str(data.get('language',''))[:16]
            props = clean_properties(name, data.get('properties'))
            with connect() as database:
                database.execute('INSERT INTO events(created_at,day,name,visitor_id,session_id,path,language,properties) VALUES(?,?,?,?,?,?,?,?)', (created.isoformat(),day,name,visitor,session,path_value,language,json.dumps(props,separators=(',',':'))))
            return self.send_json(202, {'ok':True})
        return self.send_json(404, {'message':'not found'})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.endswith('/health'): return self.send_json(200, {'ok':True,'time':now_iso()})
        if not parsed.path.endswith('/summary'): return self.send_json(404, {'message':'not found'})
        if not self.authorized(): return self.send_json(401, {'message':'unauthorized'})
        try: days = max(1, min(90, int(parse_qs(parsed.query).get('days',['30'])[0])))
        except ValueError: days = 30
        end = datetime.now(TZ).date(); start = end - timedelta(days=days-1)
        with connect() as database:
            rows = database.execute('SELECT * FROM events WHERE day >= ? AND day <= ? ORDER BY created_at', (start.isoformat(),end.isoformat())).fetchall()
            first = database.execute('SELECT MIN(created_at) AS value FROM events').fetchone()['value']
            legacy_rows = database.execute('SELECT day, visitors, pageviews FROM legacy_daily WHERE source = ? AND day >= ? AND day <= ? ORDER BY day', ('vercel_web_analytics', start.isoformat(), end.isoformat())).fetchall()
            legacy_total = database.execute('SELECT visitors, pageviews, since_day, until_day, imported_at FROM legacy_totals WHERE source = ? AND since_day <= ? AND until_day >= ? ORDER BY imported_at DESC LIMIT 1', ('vercel_web_analytics', start.isoformat(), end.isoformat())).fetchone()
        daily = { (start + timedelta(days=i)).isoformat(): {'date':(start + timedelta(days=i)).isoformat(),'visitors':set(),'conversions':0,'legacyVisitors':0,'legacyPageviews':0} for i in range(days) }
        for legacy in legacy_rows:
            if legacy['day'] in daily:
                daily[legacy['day']]['legacyVisitors'] = legacy['visitors']
                daily[legacy['day']]['legacyPageviews'] = legacy['pageviews']
        visitors=set(); sessions=set(); file_visitors=set(); download_visitors=set(); upload_click_visitors=set(); cli_visitors=set(); donate_visitors=set()
        files=successes=failures=downloads=upload_clicks=upload_batches=0
        upload_batch_sizes=[]; duration_values=[]; cli_clicks=donate_clicks=0
        cli_actions=defaultdict(int); donate_actions=defaultdict(int)
        format_stats=defaultdict(lambda:{'count':0,'successes':0,'failures':0})
        for row in rows:
            props=json.loads(row['properties']); visitors.add(row['visitor_id']); sessions.add(row['session_id']); daily[row['day']]['visitors'].add(row['visitor_id'])
            if row['name']=='upload_click':
                upload_clicks += 1; upload_click_visitors.add(row['visitor_id'])
            elif row['name']=='files_added':
                file_visitors.add(row['visitor_id']); files += props.get('count',0)
                upload_batches += 1; upload_batch_sizes.append(props.get('count', 0))
                for fmt,count in props.get('formats',{}).items(): format_stats[fmt]['count'] += count
            elif row['name']=='conversion_success':
                successes += 1; daily[row['day']]['conversions'] += 1; format_stats[props.get('format','未知')]['successes'] += 1
                duration_ms = props.get('durationMs')
                if isinstance(duration_ms, int) and duration_ms > 0: duration_values.append(duration_ms)
            elif row['name']=='conversion_failure': failures += 1; format_stats[props.get('format','未知')]['failures'] += 1
            elif row['name']=='download': downloads += 1; download_visitors.add(row['visitor_id'])
            elif row['name']=='cli_click':
                cli_clicks += 1; cli_visitors.add(row['visitor_id']); cli_actions[props.get('action','open')] += 1
            elif row['name']=='donate_click':
                donate_clicks += 1; donate_visitors.add(row['visitor_id']); donate_actions[props.get('action','open')] += 1
        attempts=successes+failures
        formats=[]
        for fmt,values in format_stats.items():
            attempt=values['successes']+values['failures']; formats.append({'format':fmt,**values,'successRate':round(values['successes']/attempt*100,1) if attempt else 0})
        legacy_since = legacy_total['since_day'] if legacy_total else (legacy_rows[0]['day'] if legacy_rows else None)
        legacy_until = legacy_total['until_day'] if legacy_total else (legacy_rows[-1]['day'] if legacy_rows else None)
        if legacy_total and start.isoformat() <= legacy_since and end.isoformat() >= legacy_until:
            merged_legacy_visitors = legacy_total['visitors']
        else:
            merged_legacy_visitors = sum(value['legacyVisitors'] for value in daily.values())
        local_visitors_after_legacy = {row['visitor_id'] for row in rows if not legacy_until or row['day'] > legacy_until}
        merged_visitors = merged_legacy_visitors + len(local_visitors_after_legacy)
        sorted_durations = sorted(duration_values)
        median_duration = sorted_durations[len(sorted_durations) // 2] if sorted_durations else 0
        if sorted_durations and len(sorted_durations) % 2 == 0:
            midpoint = len(sorted_durations) // 2
            median_duration = round((sorted_durations[midpoint - 1] + sorted_durations[midpoint]) / 2)
        depth = {
            'uploadClicks': upload_clicks,
            'uploadClickVisitors': len(upload_click_visitors),
            'uploadBatches': upload_batches,
            'uploadBatchVisitors': len(file_visitors),
            'filesAdded': files,
            'avgFilesPerUpload': round(files / upload_batches, 1) if upload_batches else 0,
            'maxFilesPerUpload': max(upload_batch_sizes, default=0),
            'downloadClicks': downloads,
            'downloadVisitors': len(download_visitors),
            'downloadCtr': round(len(download_visitors) / len(file_visitors) * 100, 1) if file_visitors else 0,
            'conversionDurationCount': len(duration_values),
            'conversionDurationAvgMs': round(sum(duration_values) / len(duration_values)) if duration_values else 0,
            'conversionDurationP50Ms': median_duration,
            'cliClicks': cli_clicks,
            'cliVisitors': len(cli_visitors),
            'cliActions': dict(cli_actions),
            'donateClicks': donate_clicks,
            'donateVisitors': len(donate_visitors),
            'donateActions': dict(donate_actions),
        }
        payload={'freshAt':now_iso(),'collectionStartedAt':first,'period':{'days':days,'start':start.isoformat(),'end':end.isoformat(),'timezone':'Asia/Shanghai'},'kpis':{'visitors':merged_visitors,'sessions':len(sessions),'filesAdded':files,'fileAddingVisitors':len(file_visitors),'conversionAttempts':attempts,'conversionSuccesses':successes,'conversionRate':round(successes/attempts*100,1) if attempts else 0,'downloads':downloads,'downloadingVisitors':len(download_visitors)},'depth':depth,'daily':[{'date':value['date'],'visitors':value['legacyVisitors'] or len(value['visitors']),'conversions':value['conversions']} for value in daily.values()],'formats':formats}
        self.send_json(200,payload)

if __name__ == '__main__':
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    connect().close()
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
