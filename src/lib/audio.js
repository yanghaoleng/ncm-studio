import { attachMp3Tags } from './ncm.js'

function hasBytes(bytes, offset, values) {
  if (offset + values.length > bytes.length) return false
  return values.every((value, index) => bytes[offset + index] === value)
}

export function detectAudioCodec(bytes) {
  if (!bytes?.length) return 'unknown'
  if (hasBytes(bytes, 0, [0x49, 0x44, 0x33])) return 'mp3'
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'mp3'
  if (hasBytes(bytes, 0, [0x66, 0x4c, 0x61, 0x43])) return 'flac'
  if (hasBytes(bytes, 0, [0x4f, 0x67, 0x67, 0x53])) return 'ogg'
  if (hasBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(bytes, 8, [0x57, 0x41, 0x56, 0x45])) return 'wav'
  if (hasBytes(bytes, 4, [0x66, 0x74, 0x79, 0x70])) return 'm4a'
  return 'unknown'
}

function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
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
  bitrate = 320,
  onProgress,
} = {}) {
  const sourceCodec = detectAudioCodec(audioBytes)
  if (sourceCodec === 'unknown') {
    throw new Error('解密成功，但无法识别内部音频格式')
  }

  if (sourceCodec === 'mp3') {
    const tagged = await attachMp3Tags(audioBytes, { musicName: title }, null)
    onProgress?.(100)
    return { audioBytes: tagged, sourceCodec }
  }

  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AudioContextClass) {
    throw new Error('当前浏览器不支持音频转码，请使用最新版 Chrome 或 Edge')
  }

  const audioContext = new AudioContextClass({ sampleRate: 48000 })
  try {
    const decoded = await audioContext.decodeAudioData(exactArrayBuffer(audioBytes))
    const channels = Math.min(2, Math.max(1, decoded.numberOfChannels))
    const left = decoded.getChannelData(0)
    const right = channels === 2 ? decoded.getChannelData(1) : null
    const { Mp3Encoder } = await import('@breezystack/lamejs')
    const encoder = new Mp3Encoder(channels, decoded.sampleRate, bitrate)
    const chunks = []
    const sampleBlockSize = 1152

    for (let offset = 0, block = 0; offset < decoded.length; offset += sampleBlockSize, block += 1) {
      const length = Math.min(sampleBlockSize, decoded.length - offset)
      const leftPcm = floatChannelToInt16(left, offset, length)
      const encoded = channels === 2
        ? encoder.encodeBuffer(leftPcm, floatChannelToInt16(right, offset, length))
        : encoder.encodeBuffer(leftPcm)
      if (encoded.length) chunks.push(Uint8Array.from(encoded))

      onProgress?.(Math.min(98, Math.round(((offset + length) / decoded.length) * 100)))
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

    const tagged = await attachMp3Tags(mp3, { musicName: title }, null)
    onProgress?.(100)
    return { audioBytes: tagged, sourceCodec }
  } catch (error) {
    throw new Error(`无法将 ${sourceCodec.toUpperCase()} 转换为 MP3：${error.message}`)
  } finally {
    await audioContext.close().catch(() => {})
  }
}
