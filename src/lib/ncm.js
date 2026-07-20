import CryptoJS from 'crypto-js'
import { extensionFromMime, joinArtists, safeFilename } from './format.js'

const CORE_KEY = CryptoJS.enc.Hex.parse('687A4852416D736F356B496E62617857')
const META_KEY = CryptoJS.enc.Hex.parse('2331346C6A6B5F215C5D2630553C2728')
const NCM_HEADER = 'CTENFDAM'
const META_PREFIX = '163 key(Don\'t modify):'

function readUint32LE(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0
}

function bytesToBinary(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return binary
}

function wordArrayToUint8Array(wordArray) {
  const { words, sigBytes } = wordArray
  const result = new Uint8Array(sigBytes)
  for (let i = 0; i < sigBytes; i += 1) {
    result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return result
}

function uint8ArrayToWordArray(bytes) {
  const words = []
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

function aesEcbDecrypt(bytes, key) {
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: uint8ArrayToWordArray(bytes) },
    key,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  return wordArrayToUint8Array(decrypted)
}

function createKeyBox(keyData) {
  const box = new Uint8Array(256)
  for (let i = 0; i < 256; i += 1) box[i] = i

  let c = 0
  let lastByte = 0
  let keyOffset = 0

  for (let i = 0; i < 256; i += 1) {
    const swap = box[i]
    c = (swap + lastByte + keyData[keyOffset]) & 0xff
    keyOffset = (keyOffset + 1) % keyData.length
    box[i] = box[c]
    box[c] = swap
    lastByte = c
  }

  return box
}

function decryptAudio(bytes, keyBox) {
  const audio = new Uint8Array(bytes)
  for (let i = 0; i < audio.length; i += 1) {
    const j = (i + 1) & 0xff
    audio[i] ^= keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff]
  }
  return audio
}

function parseMetadata(bytes) {
  if (!bytes.length) return {}

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] ^= 0x63
  }

  const encoded = new TextDecoder().decode(bytes)
  const payload = encoded.startsWith(META_PREFIX)
    ? encoded.slice(META_PREFIX.length)
    : encoded

  if (!payload.trim()) return {}

  const encrypted = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
  const decrypted = aesEcbDecrypt(encrypted, META_KEY)
  const jsonText = new TextDecoder().decode(decrypted.slice(6)).replace(/\0+$/g, '')

  try {
    return JSON.parse(jsonText)
  } catch {
    return {}
  }
}

function hasBytes(bytes, offset, values) {
  if (offset + values.length > bytes.length) return false
  return values.every((value, index) => bytes[offset + index] === value)
}

function hasMpegFrameHeader(bytes) {
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
}

function detectMime(audioBytes, metadata = {}) {
  if (
    audioBytes[0] === 0x66 &&
    audioBytes[1] === 0x4c &&
    audioBytes[2] === 0x61 &&
    audioBytes[3] === 0x43
  ) {
    return 'audio/flac'
  }

  if (hasBytes(audioBytes, 0, [0x49, 0x44, 0x33]) || hasMpegFrameHeader(audioBytes)) {
    return 'audio/mpeg'
  }

  if (hasBytes(audioBytes, 0, [0x4f, 0x67, 0x67, 0x53])) {
    return 'audio/ogg'
  }

  if (hasBytes(audioBytes, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(audioBytes, 8, [0x57, 0x41, 0x56, 0x45])) {
    return 'audio/wav'
  }

  if (hasBytes(audioBytes, 4, [0x66, 0x74, 0x79, 0x70])) {
    return 'audio/mp4'
  }

  const format = String(metadata.format || '').toLowerCase()
  if (format === 'flac') return 'audio/flac'
  if (format === 'mp3') return 'audio/mpeg'
  if (format === 'ogg') return 'audio/ogg'
  if (format === 'wav') return 'audio/wav'
  if (format === 'm4a' || format === 'mp4' || format === 'aac') return 'audio/mp4'

  return 'audio/mpeg'
}

function audioHeaderScore(header) {
  if (hasBytes(header, 0, [0x49, 0x44, 0x33])) return 120
  if (hasBytes(header, 0, [0x66, 0x4c, 0x61, 0x43])) return 120
  if (hasMpegFrameHeader(header)) return 100
  if (hasBytes(header, 0, [0x4f, 0x67, 0x67, 0x53])) return 90
  if (hasBytes(header, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(header, 8, [0x57, 0x41, 0x56, 0x45])) return 90
  if (hasBytes(header, 4, [0x66, 0x74, 0x79, 0x70])) return 80

  return 0
}

function readAudioSection(bytes, sectionOffset, keyBox) {
  const candidates = []

  function addCandidate(name, coverOffset, coverLength, audioOffset) {
    if (
      coverOffset < 0 ||
      coverLength < 0 ||
      audioOffset < coverOffset ||
      audioOffset > bytes.length ||
      coverOffset + coverLength > bytes.length
    ) {
      return
    }

    const header = decryptAudio(bytes.slice(audioOffset, Math.min(audioOffset + 16, bytes.length)), keyBox)
    candidates.push({
      name,
      coverOffset,
      coverLength,
      audioOffset,
      score: audioHeaderScore(header),
    })
  }

  // NCM files in the wild use two image section layouts. Newer files may reserve
  // an image space before the actual image length, so choose by validating audio.
  const skip5Offset = sectionOffset + 5
  if (skip5Offset + 8 <= bytes.length) {
    const imageSpace = readUint32LE(bytes, skip5Offset)
    const imageLength = readUint32LE(bytes, skip5Offset + 4)
    if (imageSpace >= imageLength) {
      addCandidate('spaced-image-section', skip5Offset + 8, imageLength, skip5Offset + 8 + imageSpace)
    }
  }

  if (skip5Offset + 4 <= bytes.length) {
    const imageLength = readUint32LE(bytes, skip5Offset)
    addCandidate('compact-image-section', skip5Offset + 4, imageLength, skip5Offset + 4 + imageLength)
  }

  const skip9Offset = sectionOffset + 9
  if (skip9Offset + 4 <= bytes.length) {
    const imageLength = readUint32LE(bytes, skip9Offset)
    addCandidate('legacy-padded-image-section', skip9Offset + 4, imageLength, skip9Offset + 4 + imageLength)
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0]
  if (!best?.score) {
    throw new Error('未能定位 NCM 音频数据段')
  }

  return {
    audioBytes: decryptAudio(bytes.slice(best.audioOffset), keyBox),
    coverBytes: best.coverLength ? bytes.slice(best.coverOffset, best.coverOffset + best.coverLength) : null,
  }
}

async function loadImageBytes(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null
  const secureUrl = url.replace(/^http:\/\//i, 'https://')
  try {
    const response = await fetch(secureUrl)
    if (!response.ok) return null
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return null
  }
}

function exactArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

export async function attachMp3Tags(audioBytes, metadata, coverBytes) {
  if (detectMime(audioBytes) !== 'audio/mpeg') return audioBytes

  try {
    const id3WriterModule = await import('browser-id3-writer')
    const ID3Writer = id3WriterModule.ID3Writer || id3WriterModule.default
    if (typeof ID3Writer !== 'function') throw new Error('ID3Writer 导出不可用')

    const writer = new ID3Writer(exactArrayBuffer(audioBytes))
    const title = metadata.musicName || metadata.title
    const artist = joinArtists(metadata.artist) || metadata.artistName
    const album = metadata.album || metadata.albumName

    if (title) writer.setFrame('TIT2', title)
    if (artist) writer.setFrame('TPE1', [artist])
    if (album) writer.setFrame('TALB', album)
    if (coverBytes?.length) {
      writer.setFrame('APIC', {
        type: 3,
        data: exactArrayBuffer(coverBytes),
        description: 'Cover',
      })
    }

    writer.addTag()
    return new Uint8Array(writer.arrayBuffer)
  } catch (error) {
    console.warn('MP3 标签写入失败，将保留原始音频', error)
    return audioBytes
  }
}

export async function convertNcmFile(file, { enrichTags = true } = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const header = bytesToBinary(bytes.slice(0, 8))

  if (header !== NCM_HEADER) {
    throw new Error('这不是有效的 NCM 文件')
  }

  let offset = 10

  const keyLength = readUint32LE(bytes, offset)
  offset += 4
  const encryptedKey = bytes.slice(offset, offset + keyLength)
  offset += keyLength
  for (let i = 0; i < encryptedKey.length; i += 1) encryptedKey[i] ^= 0x64

  const decryptedKey = aesEcbDecrypt(encryptedKey, CORE_KEY)
  const ncmKey = decryptedKey.slice(17)
  const keyBox = createKeyBox(ncmKey)

  const metaLength = readUint32LE(bytes, offset)
  offset += 4
  const metadata = parseMetadata(bytes.slice(offset, offset + metaLength))
  offset += metaLength

  const { audioBytes: rawAudio, coverBytes: embeddedCover } = readAudioSection(bytes, offset, keyBox)
  const mime = detectMime(rawAudio, metadata)
  const coverBytes = embeddedCover || (enrichTags ? await loadImageBytes(metadata.albumPic) : null)
  const taggedAudio = enrichTags ? await attachMp3Tags(rawAudio, metadata, coverBytes) : rawAudio
  const extension = extensionFromMime(mime)
  const artist = joinArtists(metadata.artist)
  const baseName = safeFilename(
    [artist, metadata.musicName || file.name.replace(/\.ncm$/i, '')].filter(Boolean).join(' - '),
  )

  return {
    audioBytes: taggedAudio,
    rawAudioBytes: rawAudio,
    coverBytes,
    metadata,
    mime,
    extension,
    filename: `${baseName}.${extension}`,
    title: metadata.musicName || file.name.replace(/\.ncm$/i, ''),
    artist,
    album: metadata.album,
  }
}
