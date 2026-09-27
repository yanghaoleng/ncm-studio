const ANALYTICS_BASE = import.meta.env.VITE_ANALYTICS_BASE || 'https://mikeywa.site/api/ncm-insights'
const VISITOR_KEY = 'ncm-studio-anonymous-id'
const SESSION_KEY = 'ncm-studio-session-id'

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}

function storedId(storage, key, prefix) {
  try {
    const current = storage.getItem(key)
    if (current) return current
    const next = randomId(prefix)
    storage.setItem(key, next)
    return next
  } catch {
    return randomId(prefix)
  }
}

export function sizeBucket(bytes = 0) {
  if (bytes < 5 * 1024 * 1024) return '<5 MB'
  if (bytes < 25 * 1024 * 1024) return '5–25 MB'
  if (bytes < 100 * 1024 * 1024) return '25–100 MB'
  return '≥100 MB'
}

export function durationBucket(milliseconds = 0) {
  if (milliseconds < 2000) return '<2 秒'
  if (milliseconds < 10000) return '2–10 秒'
  if (milliseconds < 30000) return '10–30 秒'
  return '≥30 秒'
}

export function fileFormat(filename = '') {
  return filename.split('.').pop()?.toUpperCase().slice(0, 5) || '未知'
}

export function trackEvent(name, properties = {}) {
  const payload = JSON.stringify({
    name,
    visitorId: storedId(localStorage, VISITOR_KEY, 'v'),
    sessionId: storedId(sessionStorage, SESSION_KEY, 's'),
    path: window.location.pathname,
    language: document.documentElement.lang || navigator.language,
    properties,
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${ANALYTICS_BASE}/events`, new Blob([payload], { type: 'application/json' }))
    return
  }

  fetch(`${ANALYTICS_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}

export { ANALYTICS_BASE }
