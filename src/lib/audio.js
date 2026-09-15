import decodeFlac from '@audio/decode-flac'
import decodeVorbis from '@audio/decode-vorbis'
import decodeWav from '@audio/decode-wav'
import { Mp3Encoder } from '@breezystack/lamejs'
import { attachMp3Tags } from './ncm.js'
import { safeFilename } from './format.js'

const MP3_SAMPLE_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000]
const AUDIO_DECODERS = {
  flac: decodeFlac,
  ogg: decodeVorbis,
  wav: decodeWav,
}

function hasBytes(bytes, offset, values) {
  if (offset + values.length > bytes.length) return false
  return values.every((value, index) => bytes[offset + index] === value)
}

export function detectAudioCodec(bytes) {
  if (!bytes?.length) return 'unknown'
  if (hasBytes(bytes, 0, [0x49, 0x44, 0x33])) return 'mp3'
  if (bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return 'aac'
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0) return 'mp3'
  if (hasBytes(bytes, 0, [0x66, 0x4c, 0x61, 0x43])) return 'flac'
  if (hasBytes(bytes, 0, [0x4f, 0x67, 0x67, 0x53])) return 'ogg'
  if (hasBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(bytes, 8, [0x57, 0x41, 0x56, 0x45])) return 'wav'
  if (hasBytes(bytes, 4, [0x66, 0x74, 0x79, 0x70])) return 'm4a'
  return 'unknown'
}

function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

async function decodeToPcm(audioBytes, sourceCodec) {
  const decoder = AUDIO_DECODERS[sourceCodec]
  if (decoder) {
    return decoder(audioBytes)
  }

  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AudioContextClass) {
    throw new Error(`当前运行环境不支持 ${sourceCodec.toUpperCase()} 音频解码`)
  }

  const audioContext = new AudioContextClass({ sampleRate: 48000 })
  try {
    const decoded = await audioContext.decodeAudioData(exactArrayBuffer(audioBytes))
    return {
      channelData: Array.from(
        { length: decoded.numberOfChannels },
        (_, index) => decoded.getChannelData(index),
      ),
      sampleRate: decoded.sampleRate,
    }
  } finally {
    await audioContext.close().catch(() => {})
  }
}

function selectMp3SampleRate(sampleRate) {
  if (MP3_SAMPLE_RATES.includes(sampleRate)) return sampleRate

  const cappedRate = Math.min(48000, Math.max(8000, sampleRate || 48000))
  return MP3_SAMPLE_RATES.reduce((best, candidate) => (
    Math.abs(candidate - cappedRate) < Math.abs(best - cappedRate) ? candidate : best
  ))
}

function resampleChannel(channel, sourceRate, targetRate) {
  if (sourceRate === targetRate) return channel

  const outputLength = Math.max(1, Math.round(channel.length * targetRate / sourceRate))
  const output = new Float32Array(outputLength)
  const ratio = sourceRate / targetRate

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * ratio
    const leftIndex = Math.min(channel.length - 1, Math.floor(sourcePosition))
    const rightIndex = Math.min(channel.length - 1, leftIndex + 1)
    const fraction = sourcePosition - leftIndex
    output[index] = channel[leftIndex] + (channel[rightIndex] - channel[leftIndex]) * fraction
  }

  return output
}

function floatChannelToInt16(channel, start, length) {
  const output = new Int16Array(length)
  for (let index = 0; index < length; index += 1) {
    const sample = Math.max(-1, Math.min(1, channel[start + index] || 0))
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return output
}

function nextPaint() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

export async function transcodeToMp3(audioBytes, {
  title = '',
  metadata,
  coverBytes = null,
  bitrate = 320,
  onProgress,
} = {}) {
  const sourceCodec = detectAudioCodec(audioBytes)
  const tagMetadata = metadata || { musicName: title }
  if (sourceCodec === 'unknown') {
    throw new Error('解密成功，但无法识别内部音频格式')
  }

  if (sourceCodec === 'mp3') {
    const tagged = await attachMp3Tags(audioBytes, tagMetadata, coverBytes)
    onProgress?.(100)
    return { audioBytes: tagged, sourceCodec }
  }

  try {
    onProgress?.(5)
    const decoded = await decodeToPcm(audioBytes, sourceCodec)
    if (!decoded.channelData?.length || !decoded.sampleRate) {
      throw new Error('音频解码后没有可用的 PCM 数据')
    }

    const channels = Math.min(2, decoded.channelData.length)
    const sampleRate = selectMp3SampleRate(decoded.sampleRate)
    const left = resampleChannel(decoded.channelData[0], decoded.sampleRate, sampleRate)
    const right = channels === 2
      ? resampleChannel(decoded.channelData[1], decoded.sampleRate, sampleRate)
      : null
    const encoder = new Mp3Encoder(channels, sampleRate, bitrate)
    const chunks = []
    const sampleBlockSize = 1152

    for (let offset = 0, block = 0; offset < left.length; offset += sampleBlockSize, block += 1) {
      const length = Math.min(sampleBlockSize, left.length - offset)
      const leftPcm = floatChannelToInt16(left, offset, length)
      const encoded = channels === 2
        ? encoder.encodeBuffer(leftPcm, floatChannelToInt16(right, offset, length))
        : encoder.encodeBuffer(leftPcm)
      if (encoded.length) chunks.push(Uint8Array.from(encoded))

      onProgress?.(Math.min(98, 10 + Math.round(((offset + length) / left.length) * 88)))
      if (block > 0 && block % 64 === 0) await nextPaint()
    }

    const tail = encoder.flush()
    if (tail.length) chunks.push(Uint8Array.from(tail))
    const size = chunks.reduce((total, chunk) => total + chunk.length, 0)
    const mp3 = new Uint8Array(size)
    let outputOffset = 0
    chunks.forEach((chunk) => {
      mp3.set(chunk, outputOffset)
      outputOffset += chunk.length
    })

    const tagged = await attachMp3Tags(mp3, tagMetadata, coverBytes)
    onProgress?.(100)
    return { audioBytes: tagged, sourceCodec, sampleRate }
  } catch (error) {
    throw new Error(`无法将 ${sourceCodec.toUpperCase()} 转换为 MP3：${error.message}`)
  }
}

export async function convertFlacToMp3(file, { bitrate, onProgress } = {}) {
  const audioBytes = new Uint8Array(await file.arrayBuffer())
  if (detectAudioCodec(audioBytes) !== 'flac') {
    throw new Error('文件扩展名是 FLAC，但内容不是有效的 FLAC 音频')
  }

  const title = file.name.replace(/\.flac$/i, '')
  const metadata = { musicName: title }
  const transcoded = await transcodeToMp3(audioBytes, {
    title,
    metadata,
    bitrate,
    onProgress,
  })

  return {
    audioBytes: transcoded.audioBytes,
    rawAudioBytes: audioBytes,
    coverBytes: null,
    metadata,
    mime: 'audio/mpeg',
    extension: 'mp3',
    filename: `${safeFilename(title)}.mp3`,
    title,
    artist: '',
    album: '',
    sourceCodec: transcoded.sourceCodec,
    sourceFormat: 'flac',
  }
}
