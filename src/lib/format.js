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
