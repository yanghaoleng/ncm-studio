import CryptoJS from 'crypto-js'
import { safeFilename } from './format.js'
import { transcodeToMp3 } from './audio.js'

// KGG v5 的密钥派生、数据库解密与 QMC2 算法按 Project Unlock Music
// 的 Rust 实现重新编写；原实现以 MIT OR Apache-2.0 双重许可发布。

const LEGACY_KGM_MAGIC = Uint8Array.from([
  0x7c, 0xd5, 0x32, 0xeb, 0x86, 0x02, 0x7f, 0x4b,
  0xa8, 0xaf, 0xa6, 0x8e, 0x0f, 0xff, 0x99, 0x14,
])
const VPR_MAGIC = Uint8Array.from([
  0x05, 0x28, 0xbc, 0x96, 0xe9, 0xe4, 0x5a, 0x43,
  0x91, 0xaa, 0xbd, 0xd0, 0x7a, 0xf5, 0x36, 0x31,
])
const SQLITE_HEADER = new TextEncoder().encode('SQLite format 3\0')
const DB_PAGE_SIZE = 0x400
const DB_MASTER_KEY = Uint8Array.from([
  0x1d, 0x61, 0x31, 0x45, 0xb2, 0x47, 0xbf, 0x7f,
  0x3d, 0x18, 0x96, 0x72, 0x14, 0x4f, 0xe4, 0xbf,
])
const RAW_KEY_PREFIX_V2 = new TextEncoder().encode('QQMusic EncV2,Key:')
const DERIVE_V2_KEY_1 = new TextEncoder().encode('386ZJY!@#*$%^&)(')
const DERIVE_V2_KEY_2 = new TextEncoder().encode('**#!(#$%&^a1cZ,T')
const DECRYPTION_BUFFER_SIZE = 2 * 1024 * 1024

function equalBytes(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function startsWithBytes(bytes, prefix) {
  return bytes.length >= prefix.length && prefix.every((value, index) => bytes[index] === value)
}

function readUint32LE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
}

function writeUint32LE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0, true)
}

function wordArrayFromBytes(bytes) {
  const words = []
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >>> 2] |= bytes[index] << (24 - (index % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

function bytesFromWordArray(wordArray) {
  const output = new Uint8Array(wordArray.sigBytes)
  for (let index = 0; index < wordArray.sigBytes; index += 1) {
    output[index] = (wordArray.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff
  }
  return output
}

function md5Bytes(bytes) {
  return bytesFromWordArray(CryptoJS.MD5(wordArrayFromBytes(bytes)))
}

function aesCbcDecryptNoPadding(cipherBytes, keyBytes, ivBytes) {
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: wordArrayFromBytes(cipherBytes) },
    wordArrayFromBytes(keyBytes),
    {
      iv: wordArrayFromBytes(ivBytes),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.NoPadding,
    },
  )
  return bytesFromWordArray(decrypted)
}

function nextPageIv(seed) {
  const left = Math.imul(seed, 0x9ef4) >>> 0
  const right = Math.imul(Math.floor(seed / 0xce26), 0x7fffff07) >>> 0
  const value = (left - right) >>> 0
  return (value & 0x80000000) === 0 ? value : (value + 0x7fffff07) >>> 0
}

function derivePageAesKey(seed) {
  const buffer = new Uint8Array(0x18)
  buffer.set(DB_MASTER_KEY)
  writeUint32LE(buffer, 0x10, seed)
  writeUint32LE(buffer, 0x14, 0x546c4173)
  return md5Bytes(buffer)
}

function derivePageAesIv(seed) {
  const iv = new Uint8Array(0x10)
  let value = (seed + 1) >>> 0
  for (let offset = 0; offset < 0x10; offset += 4) {
    value = nextPageIv(value)
    writeUint32LE(iv, offset, value)
  }
  return md5Bytes(iv)
}

function decryptDatabasePage(page, pageNumber, offset = 0) {
  const encrypted = page.slice(offset)
  const decrypted = aesCbcDecryptNoPadding(
    encrypted,
    derivePageAesKey(pageNumber),
    derivePageAesIv(pageNumber),
  )
  page.set(decrypted, offset)
}

function validateEncryptedPageOne(page) {
  if (page.length < 0x18) throw new Error('酷狗密钥库首页不完整')
  const offset10 = readUint32LE(page, 0x10)
  const offset14 = readUint32LE(page, 0x14)
  const pageSize = ((offset10 & 0xff) << 8) | ((offset10 & 0xff00) << 16)
  const valid = offset14 === 0x20204000
    && ((pageSize - 0x200) >>> 0) <= 0xfe00
    && (((pageSize - 1) & pageSize) === 0)
  if (!valid) throw new Error('不是支持的 KGMusicV3.db 密钥库')
}

export function decryptKugouDatabaseBytes(inputBytes) {
  const bytes = new Uint8Array(inputBytes)
  if (startsWithBytes(bytes, SQLITE_HEADER)) return bytes
  if (!bytes.length || bytes.length % DB_PAGE_SIZE !== 0) {
    throw new Error(`酷狗密钥库大小异常：${bytes.length} 字节`)
  }

  const firstPage = bytes.subarray(0, DB_PAGE_SIZE)
  validateEncryptedPageOne(firstPage)
  const expected = firstPage.slice(0x10, 0x18)
  firstPage.set(firstPage.slice(0x08, 0x10), 0x10)
  decryptDatabasePage(firstPage, 1, 0x10)
  if (!equalBytes(firstPage.slice(0x10, 0x18), expected)) {
    throw new Error('酷狗密钥库校验失败，可能是新版密钥库')
  }
  firstPage.set(SQLITE_HEADER, 0)

  for (let offset = DB_PAGE_SIZE, page = 2; offset < bytes.length; offset += DB_PAGE_SIZE, page += 1) {
    decryptDatabasePage(bytes.subarray(offset, offset + DB_PAGE_SIZE), page)
  }
  return bytes
}

export function parseKggKeyText(text) {
  const keyMap = new Map()
  String(text || '').split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf('$')
    if (separator <= 0) return
    const id = line.slice(0, separator).trim()
    const ekey = line.slice(separator + 1).trim()
    if (id && ekey) keyMap.set(id, ekey)
  })
  return keyMap
}

let sqlModulePromise

async function getSqlModule() {
  if (!sqlModulePromise) {
    sqlModulePromise = Promise.all([
      import('sql.js'),
      import('sql.js/dist/sql-wasm.wasm?url'),
    ]).then(([module, wasm]) => module.default({ locateFile: () => wasm.default }))
  }
  return sqlModulePromise
}

export async function loadKugouKeyFile(file) {
  if (!file) throw new Error('请选择 KGMusicV3.db 或 kgg.key')
  if (/\.(?:key|txt)$/i.test(file.name)) {
    const keyMap = parseKggKeyText(await file.text())
    if (!keyMap.size) throw new Error('密钥文件中没有找到有效记录')
    return keyMap
  }

  const decrypted = decryptKugouDatabaseBytes(new Uint8Array(await file.arrayBuffer()))
  const SQL = await getSqlModule()
  const database = new SQL.Database(decrypted)
  try {
    const result = database.exec(`
      SELECT EncryptionKeyId, EncryptionKey
      FROM ShareFileItems
      WHERE EncryptionKeyId IS NOT NULL AND EncryptionKeyId != ''
        AND EncryptionKey IS NOT NULL AND EncryptionKey != ''
    `)
    const keyMap = new Map()
    result[0]?.values?.forEach(([id, ekey]) => {
      if (id && ekey) keyMap.set(String(id), String(ekey))
    })
    if (!keyMap.size) throw new Error('密钥库中没有找到可用的歌曲密钥')
    return keyMap
  } finally {
    database.close()
  }
}

function base64ToBytes(value) {
  const binary = atob(value.replace(/\s+/g, ''))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function teaDecryptBlock(block, key) {
  const source = new DataView(block.buffer, block.byteOffset, 8)
  const keyView = new DataView(key.buffer, key.byteOffset, 16)
  let left = source.getUint32(0, false)
  let right = source.getUint32(4, false)
  const delta = 0x9e3779b9
  const rounds = 16
  let sum = Math.imul(delta, rounds) >>> 0
  const keys = [0, 4, 8, 12].map((offset) => keyView.getUint32(offset, false))

  for (let round = 0; round < rounds; round += 1) {
    right = (right - ((((left << 4) + keys[2]) ^ (left + sum) ^ ((left >>> 5) + keys[3])) >>> 0)) >>> 0
    left = (left - ((((right << 4) + keys[0]) ^ (right + sum) ^ ((right >>> 5) + keys[1])) >>> 0)) >>> 0
    sum = (sum - delta) >>> 0
  }

  const output = new Uint8Array(8)
  const view = new DataView(output.buffer)
  view.setUint32(0, left, false)
  view.setUint32(4, right, false)
  return output
}

function xorEight(left, right) {
  return Uint8Array.from(left, (value, index) => value ^ right[index])
}

export function decryptTencentTea(input, key) {
  if (input.length < 16 || input.length % 8 !== 0) throw new Error('无效的酷狗 ekey')

  const plain = new Uint8Array(input.length)
  let previousCipher = new Uint8Array(8)
  let previousTeaInput = new Uint8Array(8)
  for (let offset = 0; offset < input.length; offset += 8) {
    const cipherBlock = input.slice(offset, offset + 8)
    const teaInput = teaDecryptBlock(xorEight(cipherBlock, previousTeaInput), key)
    plain.set(xorEight(teaInput, previousCipher), offset)
    previousCipher = cipherBlock
    previousTeaInput = teaInput
  }

  const paddingLength = plain[0] & 0x7
  const start = 1 + paddingLength + 2
  const end = input.length - 7
  if (start > end || plain.subarray(end).some((value) => value !== 0)) {
    throw new Error('酷狗 ekey 校验失败')
  }
  return plain.slice(start, end)
}

function simpleMakeKey(salt, length) {
  return Uint8Array.from({ length }, (_, index) => Math.floor(Math.abs(Math.tan(salt + index * 0.1)) * 100) & 0xff)
}

function deriveKeyV1(decoded) {
  if (decoded.length < 16) throw new Error('酷狗 ekey 过短')
  const simpleKey = simpleMakeKey(106, 8)
  const teaKey = new Uint8Array(16)
  for (let index = 0; index < 8; index += 1) {
    teaKey[index * 2] = simpleKey[index]
    teaKey[index * 2 + 1] = decoded[index]
  }
  const body = decryptTencentTea(decoded.subarray(8), teaKey)
  const output = new Uint8Array(8 + body.length)
  output.set(decoded.subarray(0, 8))
  output.set(body, 8)
  return output
}

export function deriveKggAudioKey(ekey) {
  let decoded = base64ToBytes(ekey)
  if (startsWithBytes(decoded, RAW_KEY_PREFIX_V2)) {
    decoded = decryptTencentTea(decoded.subarray(RAW_KEY_PREFIX_V2.length), DERIVE_V2_KEY_1)
    decoded = decryptTencentTea(decoded, DERIVE_V2_KEY_2)
    decoded = base64ToBytes(new TextDecoder().decode(decoded))
  }
  return deriveKeyV1(decoded)
}

export class Qmc2MapCipher {
  constructor(key) {
    if (!key.length) throw new Error('酷狗音频密钥为空')
    this.key = Uint8Array.from({ length: 128 }, (_, index) => {
      const sourceIndex = (index * index + 71214) % key.length
      const value = key[sourceIndex]
      const rotation = (sourceIndex + 4) % 8
      return ((value << rotation) | (value >> rotation)) & 0xff
    })
  }

  mask(offset) {
    const position = offset > 0x7fff ? offset % 0x7fff : offset
    return this.key[position % this.key.length]
  }

  decrypt(bytes, offset) {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] ^= this.mask(offset + index)
  }
}

export class Qmc2Rc4Cipher {
  constructor(key) {
    this.key = key
    this.size = key.length
    this.box = new Uint8Array(this.size)
    for (let index = 0; index < this.size; index += 1) this.box[index] = index
    for (let index = 0, swap = 0; index < this.size; index += 1) {
      swap = (swap + this.box[index] + key[index % this.size]) % this.size
      ;[this.box[index], this.box[swap]] = [this.box[swap], this.box[index]]
    }
    this.hash = 1
    for (const value of key) {
      if (!value) continue
      const nextHash = Math.imul(this.hash, value) >>> 0
      if (!nextHash || nextHash <= this.hash) break
      this.hash = nextHash
    }
  }

  segmentSkip(id) {
    const seed = this.key[id % this.size]
    if (!seed) return 0
    return Math.trunc((this.hash / ((id + 1) * seed)) * 100) % this.size
  }

  decryptFirstSegment(bytes, offset) {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] ^= this.key[this.segmentSkip(offset + index)]
    }
  }

  decryptSegment(bytes, offset) {
    const box = this.box.slice()
    let first = 0
    let second = 0
    const skip = (offset % 5120) + this.segmentSkip(Math.floor(offset / 5120))
    for (let index = -skip; index < bytes.length; index += 1) {
      first = (first + 1) % this.size
      second = (box[first] + second) % this.size
      ;[box[first], box[second]] = [box[second], box[first]]
      if (index >= 0) bytes[index] ^= box[(box[first] + box[second]) % this.size]
    }
  }

  decrypt(bytes, offset) {
    let processed = 0
    let position = offset
    if (position < 128) {
      const size = Math.min(bytes.length, 128 - position)
      this.decryptFirstSegment(bytes.subarray(0, size), position)
      processed += size
      position += size
    }
    if (processed < bytes.length && position % 5120 !== 0) {
      const size = Math.min(bytes.length - processed, 5120 - (position % 5120))
      this.decryptSegment(bytes.subarray(processed, processed + size), position)
      processed += size
      position += size
    }
    while (bytes.length - processed > 5120) {
      this.decryptSegment(bytes.subarray(processed, processed + 5120), position)
      processed += 5120
      position += 5120
    }
    if (processed < bytes.length) this.decryptSegment(bytes.subarray(processed), position)
  }
}

function createQmc2Cipher(ekey) {
  const key = deriveKggAudioKey(ekey)
  return key.length > 300 ? new Qmc2Rc4Cipher(key) : new Qmc2MapCipher(key)
}

export function parseKggHeader(bytes) {
  if (bytes.length < 0x48) throw new Error('酷狗 KGG 文件头不完整')
  const magic = bytes.subarray(0, 16)
  if (!equalBytes(magic, LEGACY_KGM_MAGIC) && !equalBytes(magic, VPR_MAGIC)) {
    throw new Error('这不是有效的酷狗加密文件')
  }
  const headerLength = readUint32LE(bytes, 0x10)
  const cryptoVersion = readUint32LE(bytes, 0x14)
  if (cryptoVersion !== 5) throw new Error(`该文件不是 KGG/KGM v5（版本 ${cryptoVersion}）`)
  const hashLength = readUint32LE(bytes, 0x44)
  if (!hashLength || hashLength > 256 || 0x48 + hashLength > bytes.length || headerLength >= bytes.length) {
    throw new Error('酷狗 KGG 文件头异常')
  }
  return {
    headerLength,
    cryptoVersion,
    audioHash: new TextDecoder().decode(bytes.subarray(0x48, 0x48 + hashLength)),
  }
}

async function decryptKgg(bytes, keyMap, onProgress) {
  if (!keyMap?.size) throw new Error('转换 KGG 前请先导入 KGMusicV3.db 或 kgg.key')
  const header = parseKggHeader(bytes)
  const ekey = keyMap.get(header.audioHash)
  if (!ekey) throw new Error('密钥库中没有这首歌，请先在酷狗客户端播放一次后重新导入')
  const cipher = createQmc2Cipher(ekey)
  const output = bytes.slice(header.headerLength)
  for (let offset = 0; offset < output.length; offset += DECRYPTION_BUFFER_SIZE) {
    cipher.decrypt(output.subarray(offset, Math.min(output.length, offset + DECRYPTION_BUFFER_SIZE)), offset)
    onProgress?.(Math.min(55, Math.round(((offset + DECRYPTION_BUFFER_SIZE) / output.length) * 55)))
    await Promise.resolve()
  }
  return output
}

let legacyKgmModulePromise
let legacyKgmQueue = Promise.resolve()

function getLegacyKgmModule() {
  if (!legacyKgmModulePromise) {
    legacyKgmModulePromise = import('@xhacker/kgmwasm/KgmWasmBundle.js')
      .then((imported) => imported.default())
      .catch((error) => {
        legacyKgmModulePromise = null
        throw new Error(`酷狗解码模块加载失败：${error.message}`)
      })
  }
  return legacyKgmModulePromise
}

async function decryptLegacyKgmQueued(bytes, extension, onProgress) {
  const module = await getLegacyKgmModule()

  const pointer = module._malloc(DECRYPTION_BUFFER_SIZE)
  try {
    const initialSize = Math.min(DECRYPTION_BUFFER_SIZE, bytes.length)
    module.writeArrayToMemory(bytes.subarray(0, initialSize), pointer)
    const headerLength = module.preDec(pointer, initialSize, extension === 'vpr' ? 'vpr' : 'kgm')
    if (!headerLength || headerLength >= bytes.length) throw new Error('酷狗文件头无效')
    const encrypted = bytes.subarray(headerLength)
    const output = new Uint8Array(encrypted.length)
    for (let offset = 0; offset < encrypted.length; offset += DECRYPTION_BUFFER_SIZE) {
      const block = encrypted.subarray(offset, Math.min(encrypted.length, offset + DECRYPTION_BUFFER_SIZE))
      module.writeArrayToMemory(block, pointer)
      module.decBlob(pointer, block.length, offset)
      output.set(module.HEAPU8.subarray(pointer, pointer + block.length), offset)
      onProgress?.(Math.min(55, Math.round(((offset + block.length) / encrypted.length) * 55)))
      await Promise.resolve()
    }
    return output
  } finally {
    module._free(pointer)
  }
}

export function decryptLegacyKgm(bytes, extension, onProgress) {
  const task = legacyKgmQueue.then(() => decryptLegacyKgmQueued(bytes, extension, onProgress))
  legacyKgmQueue = task.catch(() => {})
  return task
}

export function isKugouFileName(name) {
  return /\.(?:kgg|kgm|kgma|vpr)$/i.test(name || '')
}

export async function convertKugouFile(file, { keyMap, onProgress } = {}) {
  const extension = file.name.split('.').pop().toLowerCase()
  if (!isKugouFileName(file.name)) throw new Error('不支持的酷狗文件格式')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const title = file.name.replace(/\.(?:kgg|kgm|kgma|vpr)$/i, '')
  const decoded = extension === 'kgg'
    ? await decryptKgg(bytes, keyMap, onProgress)
    : await decryptLegacyKgm(bytes, extension, onProgress)
  const result = await transcodeToMp3(decoded, {
    title,
    onProgress: (progress) => onProgress?.(55 + Math.round(progress * 0.45)),
  })
  const baseName = safeFilename(title)
  return {
    audioBytes: result.audioBytes,
    rawAudioBytes: decoded,
    coverBytes: null,
    metadata: {},
    mime: 'audio/mpeg',
    extension: 'mp3',
    filename: `${baseName}.mp3`,
    title,
    artist: '',
    album: '',
    sourceCodec: result.sourceCodec,
    sourceFormat: extension,
  }
}
