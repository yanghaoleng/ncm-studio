import { useEffect, useMemo, useRef, useState } from 'react'
import { ANALYTICS_BASE } from './lib/analytics.js'
import './data-dashboard.css'

const TOKEN_KEY = 'ncm-insights-token'
const PERIODS = [7, 30, 90]

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value || 0)
}

function formatDate(value, withTime = false) {
  if (!value) return '暂无'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value))
}

function AccessGate({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)

  async function submit(nextPin) {
    if (busy || nextPin.length !== 6) return
    if (Date.now() < lockedUntil) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${ANALYTICS_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: nextPin }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data.retryAfter) {
          setLockedUntil(Date.now() + data.retryAfter * 1000)
          setLockSeconds(data.retryAfter)
        }
        throw new Error(data.message || '访问码不正确')
      }
      sessionStorage.setItem(TOKEN_KEY, data.token)
      onUnlock(data.token)
    } catch (reason) {
      setError(reason.message || '暂时无法验证，请稍后重试')
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  function enter(value) {
    const next = `${pin}${value}`.slice(0, 6)
    setPin(next)
    setError('')
    if (next.length === 6) submit(next)
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (/^\d$/.test(event.key)) enter(event.key)
      if (event.key === 'Backspace') setPin((value) => value.slice(0, -1))
      if (event.key === 'Escape') setPin('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (!lockedUntil) return undefined
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setLockSeconds(remaining)
      if (!remaining) setLockedUntil(0)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lockedUntil])

  return <main className="gateShell">
    <section className="gatePanel" aria-labelledby="gate-title">
      <p className="eyebrow">NCM Studio · 数据</p>
      <h1 id="gate-title">输入六位访问码</h1>
      <p>数据由腾讯云后端保护。音频、文件名和个人身份不会进入统计。</p>
      <div className="pinDots" aria-label={`已输入 ${pin.length} 位`}>
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={index < pin.length ? 'filled' : ''} />)}
      </div>
      <p className="gateError" role="status">{lockSeconds ? `尝试过多，请 ${lockSeconds} 秒后重试` : error}</p>
      <div className="keypad">
        {[1,2,3,4,5,6,7,8,9].map((value) => <button key={value} onClick={() => enter(value)} disabled={busy || lockSeconds > 0}>{value}</button>)}
        <button className="keyText" onClick={() => setPin('')}>清除</button>
        <button onClick={() => enter(0)} disabled={busy || lockSeconds > 0}>0</button>
        <button className="keyText" onClick={() => setPin((value) => value.slice(0, -1))}>删除</button>
      </div>
    </section>
  </main>
}

function TrendChart({ rows, metric }) {
  const values = rows.map((row) => row[metric] || 0)
  const maximum = Math.max(...values, 1)
  return <div className="trendChart" role="img" aria-label={`${metric === 'visitors' ? '访客' : '转换成功'}每日趋势`}>
    {rows.map((row) => {
      const value = row[metric] || 0
      return <button key={row.date} className="trendBar" style={{ '--bar': `${Math.max(3, value / maximum * 100)}%` }} aria-label={`${row.date}：${value}`}>
        <span />
        <small>{formatDate(`${row.date}T00:00:00+08:00`)}</small>
        <em>{value}</em>
      </button>
    })}
  </div>
}

function Dashboard({ token, onExpired }) {
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [tab, setTab] = useState('visitors')
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState('count')
  const sectionRefs = useRef([])
  const [activeSection, setActiveSection] = useState('summary')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${ANALYTICS_BASE}/summary?days=${period}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (response.status === 401) { onExpired(); return null }
      if (!response.ok) throw new Error('load failed')
      return response.json()
    }).then((result) => {
      if (!result) return
      setData(result); setStatus('ready')
    }).catch((error) => { if (error.name !== 'AbortError') setStatus('error') })
    return () => controller.abort()
  }, [period, token, onExpired])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveSection(visible.target.id)
    }, { rootMargin: '-20% 0px -65%', threshold: [0, .25, .6] })
    sectionRefs.current.forEach((node) => node && observer.observe(node))
    return () => observer.disconnect()
  }, [data])

  const formats = useMemo(() => {
    const rows = [...(data?.formats || [])]
    return rows.sort((a, b) => sort === 'successRate' ? b.successRate - a.successRate : b.count - a.count)
  }, [data, sort])

  if (status === 'loading') return <main className="dashboardState">正在读取近 {period} 天数据…</main>
  if (status === 'error') return <main className="dashboardState"><strong>数据暂时没有读到</strong><button onClick={() => setPeriod((value) => value === 30 ? 29 : 30)}>重试</button></main>

  const k = data.kpis
  const conversionSentence = k.conversionAttempts
    ? `近 ${period} 天完成 ${formatNumber(k.conversionSuccesses)} 次转换，成功率 ${k.conversionRate}%。`
    : `近 ${period} 天还没有收到转换事件，上线后的真实数据会从这里开始累积。`
  const downloadSentence = k.downloads
    ? `${formatNumber(k.downloads)} 次下载来自 ${formatNumber(k.downloadingVisitors)} 位匿名访客。`
    : '目前没有下载记录，不能据此判断用户是否完成了最终任务。'

  const sections = [['summary','结论'],['trend','趋势'],['formats','格式'],['quality','数据说明']]
  return <div className="dashboard">
    <header className="dashboardHeader">
      <div><p className="eyebrow">NCM Studio · 产品数据</p><h1>转换体验看板</h1><p>北京时间 · 匿名聚合 · 更新于 {formatDate(data.freshAt, true)}</p></div>
      <div className="periods" aria-label="时间范围">{PERIODS.map((value) => <button key={value} className={period === value ? 'active' : ''} onClick={() => { setStatus('loading'); setPeriod(value) }}>近 {value} 天</button>)}</div>
    </header>
    <nav className="sectionNav" aria-label="看板章节">{sections.map(([id,label]) => <a key={id} className={activeSection === id ? 'active' : ''} href={`#${id}`}>{label}</a>)}</nav>

    <section id="summary" ref={(node) => { sectionRefs.current[0] = node }} className="summaryBand reveal">
      <h2>现在发生了什么</h2>
      <p className="finding">{conversionSentence}</p>
      <p className="finding">{downloadSentence}</p>
      <p className="finding muted">统计从 {formatDate(data.collectionStartedAt, true)} 开始；上线前的 Vercel 访问不能被还原成这套产品行为数据。</p>
      <div className="metricStrip">
        <div><span>匿名访客</span><strong>{formatNumber(k.visitors)}</strong><small>{formatNumber(k.sessions)} 个会话</small></div>
        <div><span>导入文件</span><strong>{formatNumber(k.filesAdded)}</strong><small>{formatNumber(k.fileAddingVisitors)} 位访客</small></div>
        <div><span>转换成功率</span><strong>{k.conversionAttempts ? `${k.conversionRate}%` : '—'}</strong><small>{formatNumber(k.conversionAttempts)} 次尝试</small></div>
        <div><span>下载次数</span><strong>{formatNumber(k.downloads)}</strong><small>单曲与 ZIP 合计</small></div>
      </div>
    </section>

    <section id="trend" ref={(node) => { sectionRefs.current[1] = node }} className="analysisSection reveal">
      <div className="sectionHeading"><div><h2>{tab === 'visitors' ? '每日使用趋势' : '每日转换完成量'}</h2><p>{tab === 'visitors' ? '按匿名访客去重，适合观察到访节奏。' : '只统计浏览器实际返回成功的转换。'}</p></div>
        <div className="tabs" role="tablist">{[['visitors','访客'],['conversions','转换']].map(([id,label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
      </div>
      <TrendChart rows={data.daily} metric={tab} />
    </section>

    <section id="formats" ref={(node) => { sectionRefs.current[2] = node }} className="analysisSection reveal">
      <div className="sectionHeading"><div><h2>文件格式表现</h2><p>只记录扩展名、数量与结果，不记录文件名或歌曲信息。</p></div>
        <label>排序 <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="count">导入量</option><option value="successRate">成功率</option></select></label>
      </div>
      {!formats.length ? <div className="emptyState">还没有格式数据。导入第一批文件后，这里才会形成真实比较。</div> : <div className="tableWrap"><table><thead><tr><th>格式</th><th>导入</th><th>成功</th><th>失败</th><th>成功率</th></tr></thead><tbody>{formats.slice(0, expanded ? formats.length : 8).map((row) => <tr key={row.format}><th>{row.format}</th><td>{row.count}</td><td>{row.successes}</td><td>{row.failures}</td><td>{row.successRate}%</td></tr>)}</tbody></table>{formats.length > 8 && <button className="expandTable" onClick={() => setExpanded((value) => !value)}>{expanded ? '收起' : `展开全部 ${formats.length} 项`}</button>}</div>}
    </section>

    <section id="quality" ref={(node) => { sectionRefs.current[3] = node }} className="qualityBand reveal">
      <h2>数据口径与边界</h2>
      <div className="qualityGrid"><p><strong>来源</strong>网页内的匿名产品事件，经 HTTPS 写入腾讯云 SQLite。</p><p><strong>身份</strong>浏览器随机标识；不能识别真实人物，清理浏览器数据后会成为新访客。</p><p><strong>排除</strong>不上传音频、文件名、歌曲元数据、原始 IP、原始 User-Agent。</p><p><strong>时区与新鲜度</strong>按 Asia/Shanghai 分日；刷新看板时即时汇总。</p></div>
    </section>
  </div>
}

export default function DataDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.lang = 'zh-CN'
    document.title = '转换体验看板｜NCM Studio'
  }, [])
  function expire() { sessionStorage.removeItem(TOKEN_KEY); setToken('') }
  return token ? <Dashboard token={token} onExpired={expire} /> : <AccessGate onUnlock={setToken} />
}
