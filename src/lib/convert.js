import { convertNcmFile } from './ncm.js'
import { convertKugouFile } from './kugou.js'

export const SUPPORTED_FILE_PATTERN = /\.(?:ncm|kgm|kgma|vpr)$/i

export function isSupportedMusicFile(name) {
  return SUPPORTED_FILE_PATTERN.test(name || '')
}

export async function convertMusicFile(file, options = {}) {
  if (/\.ncm$/i.test(file.name)) return convertNcmFile(file, { enrichTags: true })
  if (/\.(?:kgm|kgma|vpr)$/i.test(file.name)) return convertKugouFile(file, options)
  throw new Error('不支持该文件格式')
}
