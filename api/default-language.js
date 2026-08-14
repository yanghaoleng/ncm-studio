const COUNTRY_LANGUAGE = {
  CN: 'zh',
  SG: 'zh',
  HK: 'zh-Hant',
  MO: 'zh-Hant',
  TW: 'zh-Hant',
  JP: 'ja',
}

function getHeader(req, name) {
  const value = req.headers[name] || req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export default function handler(req, res) {
  const country = String(getHeader(req, 'x-vercel-ip-country') || '').trim().toUpperCase()
  const language = COUNTRY_LANGUAGE[country] || 'en'

  res.setHeader('Cache-Control', 'private, no-store')
  res.status(200).json({ language, country })
}
