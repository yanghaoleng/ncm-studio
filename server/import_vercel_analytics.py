#!/usr/bin/env python3
"""Import a bounded, aggregate Vercel Web Analytics export without identities."""
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

DB_PATH = os.environ.get('NCM_INSIGHTS_DB', '/var/lib/ncm-insights/analytics.sqlite3')
SOURCE = 'vercel_web_analytics'

def main():
    with open(sys.argv[1], encoding='utf-8') as handle:
        daily_payload = json.load(handle)
    with open(sys.argv[2], encoding='utf-8') as handle:
        totals_payload = json.load(handle)
    rows = daily_payload.get('data') or []
    query = daily_payload.get('query') or {}
    since = query.get('since', '')[:10]
    until_raw = query.get('until', '')[:10]
    until = (datetime.strptime(until_raw, '%Y-%m-%d') - timedelta(days=1)).date().isoformat() if until_raw else ''
    if not rows or not since or not until:
        raise SystemExit('missing Vercel aggregate data')
    total = totals_payload.get('data') or {}
    imported_at = datetime.now(timezone.utc).isoformat()
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    database = sqlite3.connect(DB_PATH)
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
    database.executemany('INSERT OR REPLACE INTO legacy_daily(source,day,visitors,pageviews,imported_at) VALUES(?,?,?,?,?)', [
        (SOURCE, row['timestamp'][:10], max(0, int(row.get('visitors', 0))), max(0, int(row.get('pageviews', 0))), imported_at)
        for row in rows
    ])
    database.execute('INSERT OR REPLACE INTO legacy_totals(source,since_day,until_day,visitors,pageviews,imported_at) VALUES(?,?,?,?,?,?)', (SOURCE, since, until, max(0, int(total.get('visitors', 0))), max(0, int(total.get('pageviews', 0))), imported_at))
    database.commit()
    print(json.dumps({'source':SOURCE,'since':since,'until':until,'days':len(rows),'visitors':int(total.get('visitors',0)),'pageviews':int(total.get('pageviews',0))}, ensure_ascii=False))

if __name__ == '__main__':
    main()
