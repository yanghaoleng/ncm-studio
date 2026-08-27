import { transcodeToMp3 } from './audio.js'
import { convertNcmFile } from './ncm.js'

function replaceExtension(filename, extension) {
  return /\.[^.]+$/.test(filename)
    ? filename.replace(/\.[^.]+$/, `.${extension}`)
    : `${filename}.${extension}`
}

export async function finalizeNcmAsMp3(result, options = {}) {
  const transcoded = await transcodeToMp3(result.rawAudioBytes, {
    title: result.title,
    metadata: result.metadata,
    coverBytes: result.coverBytes,
    bitrate: options.bitrate,
    onProgress: options.onProgress,
  })

  return {
    ...result,
    audioBytes: transcoded.audioBytes,
    mime: 'audio/mpeg',
    extension: 'mp3',
    filename: replaceExtension(result.filename, 'mp3'),
    sourceCodec: transcoded.sourceCodec,
    sourceFormat: 'ncm',
  }
}

export async function convertNcmToMp3(file, options = {}) {
  options.onProgress?.(2)
  const result = await convertNcmFile(file, {
    enrichTags: false,
    fetchCover: options.fetchCover !== false,
  })
  options.onProgress?.(5)
  return finalizeNcmAsMp3(result, options)
}
