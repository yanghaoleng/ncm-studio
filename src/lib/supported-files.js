export const SUPPORTED_FILE_PATTERN = /\.(?:ncm|flac|kgm|kgma|vpr)$/i

export function isSupportedMusicFile(name) {
  return SUPPORTED_FILE_PATTERN.test(name || '')
}
