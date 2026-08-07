import { convertNcmFile } from './ncm.js'
import { convertKugouFile, isKugouFileName } from './kugou.js'

export const SUPPORTED_FILE_PATTERN = /\.(?:ncm|kgg|kgm|kgma|vpr)$/i

export function isSupportedMusicFile(name) {
  return SUPPORTED_FILE_PATTERN.test(name || '')
}

export async function convertMusicFile(file, options = {}) {
  if (/\.ncm$/i.test(file.name)) return convertNcmFile(file, { enrichTags: true })
  if (isKugouFileName(file.name)) return convertKugouFile(file, options)
  throw new Error('不支持该文件格式')
}
