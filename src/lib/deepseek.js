function extractJsonObject(content) {
  const trimmed = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  let start = -1
  let depth = 0
  let inString = false
  let isEscaped = false

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]

    if (start === -1) {
      if (char === '{') {
        start = index
        depth = 1
      }
      continue
    }

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (char === '\\' && inString) {
      isEscaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) {
      return JSON.parse(trimmed.slice(start, index + 1))
    }
  }

  throw new Error('AI 返回内容不是有效 JSON')
}

function normalizeDeepseekRows(rows, sourceLines) {
  return rows
    .map((row, index) => {
      if (typeof row === 'string') {
        return { title: row.trim(), artist: '', album: '', source: sourceLines[index] || row }
      }

      return {
        title: String(row?.title || '').trim(),
        artist: String(row?.artist || '').trim(),
        album: String(row?.album || '').trim(),
        source: String(row?.source || sourceLines[index] || row?.title || '').trim(),
      }
    })
    .filter((row) => row.title)
    .map((row, index) => ({
      id: `playlist-ai-${Date.now()}-${index}`,
      title: row.title,
      artist: row.artist,
      album: row.album,
      source: row.source || row.title,
      status: 'queued',
      confidence: row.artist ? 96 : 82,
    }))
}

export async function enhancePlaylistWithDeepSeek(playlistText, firstPassItems) {
  const sourceLines = playlistText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const response = await fetch('/api/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playlistText,
      firstPassItems: firstPassItems.map(({ title, artist, album, source }) => ({
        title,
        artist,
        album,
        source,
      })),
    }),
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error || `DeepSeek 增强解析失败：${response.status}`)
  }

  const data = await response.json()
  const content = data?.content
  const parsed = extractJsonObject(content)
  const rows = Array.isArray(parsed?.tracks) ? parsed.tracks : []
  const items = normalizeDeepseekRows(rows, sourceLines)

  if (!items.length) throw new Error('DeepSeek 未返回可用歌单结果')
  return items
}
