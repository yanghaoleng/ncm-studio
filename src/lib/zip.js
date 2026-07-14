import { safeFilename } from './format.js'

const MAX_UINT16 = 0xffff
const MAX_UINT32 = 0xffffffff
const UTF8_FLAG = 0x0800
const STORE_METHOD = 0
const ZIP_VERSION = 20
const FILE_PROGRESS_PERCENT = 94
const YIELD_EVERY_LARGE_BATCH = 40
const DEFAULT_STALL_WARNING_MS = 20_000
const textEncoder = new TextEncoder()

const CRC32_TABLE = new Uint32Array(256)
for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  CRC32_TABLE[index] = value >>> 0
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  }
  return null
}

export function calculateCrc32(value) {
  const bytes = toUint8Array(value)
  if (!bytes) throw new TypeError('CRC32 input must be binary data')

  let crc = 0xffffffff
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

function uniqueArchiveFilename(track, usedNames) {
  const fallbackName = `${safeFilename(track.title) || 'untitled'}.mp3`
  const filename = safeFilename(track.filename || fallbackName) || fallbackName
  const dotIndex = filename.lastIndexOf('.')
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const extension = dotIndex > 0 ? filename.slice(dotIndex) : ''

  let candidate = filename
  let duplicateIndex = 2
  while (usedNames.has(candidate.toLocaleLowerCase())) {
    candidate = `${base} (${duplicateIndex})${extension}`
    duplicateIndex += 1
  }

  usedNames.add(candidate.toLocaleLowerCase())
  return candidate
}

function toDosDateTime(timestamp) {
  const candidate = new Date(timestamp || Date.now())
  const date = Number.isNaN(candidate.getTime()) ? new Date() : candidate
  const year = Math.min(2107, Math.max(1980, date.getFullYear()))

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function createLocalHeader(entry) {
  const header = new Uint8Array(30 + entry.nameBytes.length)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, ZIP_VERSION, true)
  view.setUint16(6, UTF8_FLAG, true)
  view.setUint16(8, STORE_METHOD, true)
  view.setUint16(10, entry.dosTime, true)
  view.setUint16(12, entry.dosDate, true)
  view.setUint32(14, entry.crc32, true)
  view.setUint32(18, entry.size, true)
  view.setUint32(22, entry.size, true)
  view.setUint16(26, entry.nameBytes.length, true)
  view.setUint16(28, 0, true)
  header.set(entry.nameBytes, 30)
  return header
}

function createCentralHeader(entry) {
  const header = new Uint8Array(46 + entry.nameBytes.length)
  const view = new DataView(header.buffer)

  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, ZIP_VERSION, true)
  view.setUint16(6, ZIP_VERSION, true)
  view.setUint16(8, UTF8_FLAG, true)
  view.setUint16(10, STORE_METHOD, true)
  view.setUint16(12, entry.dosTime, true)
  view.setUint16(14, entry.dosDate, true)
  view.setUint32(16, entry.crc32, true)
  view.setUint32(20, entry.size, true)
  view.setUint32(24, entry.size, true)
  view.setUint16(28, entry.nameBytes.length, true)
  view.setUint16(30, 0, true)
  view.setUint16(32, 0, true)
  view.setUint16(34, 0, true)
  view.setUint16(36, 0, true)
  view.setUint32(38, 0, true)
  view.setUint32(42, entry.offset, true)
  header.set(entry.nameBytes, 46)
  return header
}

function createEndRecord(entryCount, centralSize, centralOffset) {
  const record = new Uint8Array(22)
  const view = new DataView(record.buffer)

  view.setUint32(0, 0x06054b50, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0, true)
  view.setUint16(8, entryCount, true)
  view.setUint16(10, entryCount, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, centralOffset, true)
  view.setUint16(20, 0, true)
  return record
}

function audioBlobForTrack(track) {
  if (track.audioBlob instanceof Blob) return track.audioBlob
  const bytes = toUint8Array(track.audioBlob) || toUint8Array(track.audioBytes)
  if (!bytes) throw new TypeError('Track is missing audio data')
  return new Blob([bytes], { type: track.mime || 'application/octet-stream' })
}

async function crc32ForTrack(track, audioBlob) {
  if (Number.isInteger(track.archiveCrc32)) return track.archiveCrc32 >>> 0

  const bytes = toUint8Array(track.audioBytes) || toUint8Array(track.audioBlob)
  if (bytes) return calculateCrc32(bytes)
  return calculateCrc32(await audioBlob.arrayBuffer())
}

export async function buildTracksZip(
  tracks,
  {
    onProgress,
    onStall,
    stallWarningMs = DEFAULT_STALL_WARNING_MS,
  } = {},
) {
  if (tracks.length > MAX_UINT16) {
    throw new RangeError('ZIP contains too many files; split it into smaller batches')
  }

  const usedNames = new Set()
  const localParts = []
  const centralParts = []
  let localOffset = 0
  let centralSize = 0
  let lastActivityAt = Date.now()
  let lastReportedPercent = -1
  let stallReported = false

  const reportProgress = (value) => {
    const percent = Math.max(0, Math.min(100, Math.round(value)))
    const resumedFromStall = stallReported
    lastActivityAt = Date.now()
    stallReported = false

    if (percent !== lastReportedPercent || resumedFromStall) {
      lastReportedPercent = percent
      onProgress?.(percent)
    }
  }

  const stallMonitor = globalThis.setInterval(() => {
    if (stallReported || Date.now() - lastActivityAt < stallWarningMs) return
    stallReported = true
    onStall?.(lastReportedPercent)
  }, Math.min(5_000, Math.max(1_000, Math.round(stallWarningMs / 4))))

  try {
    reportProgress(0)

    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index]
      const audioBlob = audioBlobForTrack(track)
      const filename = uniqueArchiveFilename(track, usedNames)
      const nameBytes = textEncoder.encode(filename)

      if (nameBytes.length > MAX_UINT16 || audioBlob.size > MAX_UINT32) {
        throw new RangeError('ZIP entry is too large; split it into smaller batches')
      }

      const { time: dosTime, date: dosDate } = toDosDateTime(track.file?.lastModified)
      const entry = {
        nameBytes,
        size: audioBlob.size,
        crc32: await crc32ForTrack(track, audioBlob),
        offset: localOffset,
        dosTime,
        dosDate,
      }
      const localHeader = createLocalHeader(entry)
      const centralHeader = createCentralHeader(entry)

      localParts.push(localHeader, audioBlob)
      centralParts.push(centralHeader)
      localOffset += localHeader.byteLength + audioBlob.size
      centralSize += centralHeader.byteLength

      if (localOffset > MAX_UINT32 || centralSize > MAX_UINT32) {
        throw new RangeError('ZIP is larger than 4 GB; split it into smaller batches')
      }

      reportProgress(((index + 1) / tracks.length) * FILE_PROGRESS_PERCENT)

      if (
        tracks.length >= 100 &&
        (index + 1) % YIELD_EVERY_LARGE_BATCH === 0 &&
        index + 1 < tracks.length
      ) {
        await yieldToBrowser()
      }
    }

    if (localOffset + centralSize + 22 > MAX_UINT32) {
      throw new RangeError('ZIP is larger than 4 GB; split it into smaller batches')
    }

    const endRecord = createEndRecord(tracks.length, centralSize, localOffset)
    const blob = new Blob([...localParts, ...centralParts, endRecord], {
      type: 'application/zip',
    })
    reportProgress(100)
    return blob
  } finally {
    globalThis.clearInterval(stallMonitor)
  }
}
