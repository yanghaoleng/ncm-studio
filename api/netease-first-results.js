function playlistSearchQuery(item) {
  return [item?.title, item?.artist, item?.album].filter(Boolean).join(' ').trim()
}

function neteaseSearchUrl(item) {
  const query = playlistSearchQuery(item)
  return `https://music.163.com/#/search/m/?s=${encodeURIComponent(query)}&type=1`
}

function neteaseOuterDownloadUrl(songId) {
  return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`
}

const NETEASE_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  Cookie: 'os=pc; appver=8.10.70;',
  Referer: 'https://music.163.com/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
}

const SEARCH_ENDPOINTS = [
  {
    name: 'cloudsearch',
    url: 'https://music.163.com/api/cloudsearch/pc',
  },
  {
    name: 'websearch',
    url: 'https://music.163.com/api/search/get/web',
  },
]

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}')

  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

function compact(value) {
  return `${value || ''}`.trim()
}

function unique(values) {
  return [...new Set(values.map(compact).filter(Boolean))]
}

function queryVariants(item) {
  const title = compact(item?.title)
  const artist = compact(item?.artist)
  const album = compact(item?.album)

  return unique([
    [title, artist, album].filter(Boolean).join(' '),
    [title, artist].filter(Boolean).join(' '),
    [artist, title].filter(Boolean).join(' '),
    title,
  ])
}

function normalizeSong(song, query, source) {
  if (!song?.id) return null

  const artists = song.artists || song.ar || []
  const album = song.album || song.al || {}

  return {
    query,
    source,
    found: true,
    songId: song.id,
    songUrl: `https://music.163.com/#/song?id=${song.id}`,
    title: song.name || '',
    artist: Array.isArray(artists) ? artists.map((artist) => artist.name).filter(Boolean).join(' / ') : '',
    album: album.name || '',
  }
}

async function fetchSearchSongs(endpoint, query) {
  const params = new URLSearchParams({
    csrf_token: '',
    s: query,
    type: '1',
    offset: '0',
    limit: '3',
  })
  const response = await fetch(`${endpoint.url}?${params}`, {
    headers: NETEASE_HEADERS,
  })

  if (!response.ok) throw new Error(`NetEase ${endpoint.name} failed: ${response.status}`)

  const rawText = await response.text()
  const data = JSON.parse(rawText)
  return Array.isArray(data?.result?.songs) ? data.result.songs : []
}

async function fetchFirstSong(item) {
  const fallbackQuery = playlistSearchQuery(item)
  const fallbackUrl = neteaseSearchUrl(item)
  const variants = queryVariants(item)

  if (!variants.length) {
    return { query: fallbackQuery, songUrl: fallbackUrl, searchUrl: fallbackUrl, found: false }
  }

  const failures = []

  for (const query of variants) {
    for (const endpoint of SEARCH_ENDPOINTS) {
      try {
        const songs = await fetchSearchSongs(endpoint, query)
        const result = normalizeSong(songs[0], query, endpoint.name)
        if (result) {
          return {
            ...result,
            downloadUrl: neteaseOuterDownloadUrl(result.songId),
            downloadIsOuterFallback: true,
            searchUrl: fallbackUrl,
          }
        }
      } catch (error) {
        failures.push(`${endpoint.name}: ${error.message || 'search failed'}`)
      }
    }
  }

  return {
    query: fallbackQuery,
    songUrl: fallbackUrl,
    searchUrl: fallbackUrl,
    found: false,
    error: failures[0] || '网易云没有返回歌曲结果',
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: '只支持 POST 请求' })
  }

  try {
    const { tracks = [] } = await readJsonBody(request)
    const safeTracks = Array.isArray(tracks) ? tracks.slice(0, 80) : []
    const results = await mapWithConcurrency(safeTracks, 4, fetchFirstSong)

    response.setHeader('Cache-Control', 'no-store')
    return response.status(200).json({ results })
  } catch (error) {
    return response.status(500).json({ error: error.message || '获取网易云首条结果失败' })
  }
}
