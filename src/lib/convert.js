import { convertKugouFile } from './kugou.js'
import { convertNcmToMp3 } from './ncm-mp3.js'
import { convertFlacToMp3 } from './audio.js'

export { SUPPORTED_FILE_PATTERN, isSupportedMusicFile } from './supported-files.js'

export async function convertMusicFile(file, options = {}) {
  if (/\.ncm$/i.test(file.name)) return convertNcmToMp3(file, options)
  if (/\.flac$/i.test(file.name)) return convertFlacToMp3(file, options)
  if (/\.(?:kgm|kgma|vpr)$/i.test(file.name)) return convertKugouFile(file, options)
  throw new Error('不支持该文件格式')
}
