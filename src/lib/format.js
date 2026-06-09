export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function safeFilename(name) {
  return String(name || 'untitled')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export function joinArtists(artists) {
  if (!Array.isArray(artists)) return ''
  return artists
    .map((artist) => {
      if (Array.isArray(artist)) return artist[0]
      if (artist && typeof artist === 'object') return artist.name
      return artist
    })
    .filter(Boolean)
    .join(' / ')
}

export function extensionFromMime(mime) {
  if (mime?.includes('flac')) return 'flac'
  if (mime?.includes('mpeg')) return 'mp3'
  if (mime?.includes('ogg')) return 'ogg'
  if (mime?.includes('wav')) return 'wav'
  if (mime?.includes('mp4')) return 'm4a'
  return 'mp3'
}

export function parsePlaylistText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•\d.、\])]+\s*/, '').trim())
    .filter(Boolean)
    .map((line, index) => {
      const separators = [' - ', ' — ', ' – ', ' | ', '\t']
      const sep = separators.find((item) => line.includes(item))
      const [title, artist] = sep ? line.split(sep, 2) : [line, '']
      return {
        id: `playlist-${Date.now()}-${index}`,
        title: title.trim() || line,
        artist: artist.trim(),
        album: '',
        source: line,
        status: 'queued',
        confidence: artist ? 92 : 72,
      }
    })
}

export function playlistSearchQuery(item) {
  return [item?.title, item?.artist, item?.album].filter(Boolean).join(' ').trim()
}

export function neteaseSearchUrl(item) {
  const query = playlistSearchQuery(item)
  return `https://music.163.com/#/search/m/?s=${encodeURIComponent(query)}&type=1`
}

export function normalizeMusicText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.(ncm|mp3|flac|wav|m4a|aac)$/i, '')
    .replace(/[（(【[].*?[）)】\]]/g, '')
    .replace(/[\s·・,，.。:：;；'"“”‘’!?！？_\-—–|/\\]+/g, '')
    .trim()
}

function titleScore(candidateTitle, playlistTitle, fullText) {
  if (!playlistTitle || !candidateTitle) return 0
  if (candidateTitle === playlistTitle) return 76
  if (candidateTitle.includes(playlistTitle) || playlistTitle.includes(candidateTitle)) return 62
  if (fullText.includes(playlistTitle)) return 56
  return 0
}

export function scorePlaylistMatch(track, item) {
  const playlistTitle = normalizeMusicText(item.title)
  const playlistArtist = normalizeMusicText(item.artist)
  const trackTitle = normalizeMusicText(track.title)
  const trackArtist = normalizeMusicText(track.artist)
  const trackAlbum = normalizeMusicText(track.album)
  const fileName = normalizeMusicText(track.file?.name)
  const fullText = `${trackTitle}${trackArtist}${trackAlbum}${fileName}`

  let score = Math.max(
    titleScore(trackTitle, playlistTitle, fullText),
    titleScore(fileName, playlistTitle, fullText),
  )

  if (score && playlistArtist) {
    if (trackArtist === playlistArtist || trackArtist.includes(playlistArtist) || playlistArtist.includes(trackArtist)) {
      score += 22
    } else if (fullText.includes(playlistArtist)) {
      score += 14
    } else {
      score -= 10
    }
  }

  return Math.max(0, Math.min(99, score))
}

export function matchPlaylistToTracks(items, tracks) {
  if (!items.length || !tracks.length) {
    return {
      items: items.map((item) => ({ ...item, status: 'queued', confidence: item.artist ? 72 : 62 })),
      tracks,
      matchedCount: 0,
    }
  }

  const candidates = []
  items.forEach((item) => {
    tracks.forEach((track) => {
      const score = scorePlaylistMatch(track, item)
      if (score >= 56) candidates.push({ itemId: item.id, trackId: track.id, score })
    })
  })

  candidates.sort((a, b) => b.score - a.score)

  const itemMatches = new Map()
  const trackMatches = new Map()
  candidates.forEach((candidate) => {
    if (itemMatches.has(candidate.itemId) || trackMatches.has(candidate.trackId)) return
    itemMatches.set(candidate.itemId, candidate)
    trackMatches.set(candidate.trackId, candidate)
  })

  const enrichedItems = items.map((item) => {
    const match = itemMatches.get(item.id)
    const track = match ? tracks.find((current) => current.id === match.trackId) : null
    return {
      ...item,
      status: match ? 'matched' : 'queued',
      confidence: match ? match.score : item.artist ? 72 : 62,
      matchedTrackId: match?.trackId || '',
      matchedTrackTitle: track?.title || '',
      matchedTrackArtist: track?.artist || '',
    }
  })

  const enrichedTracks = tracks.map((track) => {
    const match = trackMatches.get(track.id)
    const item = match ? items.find((current) => current.id === match.itemId) : null
    return {
      ...track,
      playlistItemId: match?.itemId || '',
      playlistMatchScore: match?.score || 0,
      playlistTitle: item?.title || '',
      playlistArtist: item?.artist || '',
      playlistAlbum: item?.album || '',
    }
  })

  return {
    items: enrichedItems,
    tracks: enrichedTracks,
    matchedCount: itemMatches.size,
  }
}
