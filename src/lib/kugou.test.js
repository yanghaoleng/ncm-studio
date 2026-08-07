import assert from 'node:assert/strict'
import test from 'node:test'
import KgmCryptoModule from '@xhacker/kgmwasm/KgmWasmBundle.js'
import { detectAudioCodec } from './audio.js'
import {
  Qmc2MapCipher,
  Qmc2Rc4Cipher,
  convertKugouFile,
  deriveKggAudioKey,
  decryptKugouDatabaseBytes,
  decryptTencentTea,
  isKugouFileName,
  parseKggHeader,
  parseKggKeyText,
} from './kugou.js'

const KGM_MAGIC = Uint8Array.from([
  0x7c, 0xd5, 0x32, 0xeb, 0x86, 0x02, 0x7f, 0x4b,
  0xa8, 0xaf, 0xa6, 0x8e, 0x0f, 0xff, 0x99, 0x14,
])
const VPR_MAGIC = Uint8Array.from([
  0x05, 0x28, 0xbc, 0x96, 0xe9, 0xe4, 0x5a, 0x43,
  0x91, 0xaa, 0xbd, 0xd0, 0x7a, 0xf5, 0x36, 0x31,
])
const UPSTREAM_EKEY_V1 = 'NUZ6b0lad2bfoKIOhMlnmtDttgWgo2qeAmUIcT7rAh4EmZOfOPynvr+x+riMPtQTjOd7xyObMJ3L3bc7tevenkhPpVRZQ0mNEPKMjKfxLMRBvDk91sYkt908pjHWYE8rVm+smV/6+ZHRSGwGCAH1/IOB2SnJ6GQVMhZ2KEGQlPJRrznZZV1XDvIJ54sNt9wvQieQRzjeZb8zghfYTPmOTaQ1ZNELV4M8lPeFWoe5jvUIyakGb7GgIm0JGGExDJst5VU3+DMHO8q35ItVIBBr+/IF9aI7KCKZFy5OuyqYaz6wN/ndzbL55GlX85dwYL6piBH04IZxj3ZzCqniyssR43G8VGd2Dxw4ZyLpngjPrp/U8ojzyXe5kOAf1egPsiz6mO+W0Atid+6jpZyb6fP4QgdFskcpVHaaW177G/VYgd34FOkUoJq0nM3P+m2wWp1YDkdIrsNZNgNkUMuFy7YnpjeRd8KokEjQ842hSdex1lgJL92d+pkT8Da3j1GvY0nHE60fOLieX8IOhbMJeeqkp2njfhfCKQEfND/6IxJR2AfXbRj0ynwmqaRPd7wh60KY5HGjqnp4jXVRKHVPlKp5B/u24L+LDzaCSLBxAXsb6JZSvnEo0P202zrFFTem/EDtSn7+jv7dRpOfLSv8+NGAgRrTZB1IMBXcYPaRp0g8/j1fqyD/M5hcQcvpWIWrWAyn'

function writeUint32LE(bytes, offset, value) {
  new DataView(bytes.buffer).setUint32(offset, value, true)
}

let fixtureModulePromise

async function makeLegacyFixture(extension) {
  const header = new Uint8Array(1024)
  header.set(extension === 'vpr' ? VPR_MAGIC : KGM_MAGIC)
  writeUint32LE(header, 0x10, header.length)
  for (let index = 0; index < 16; index += 1) header[0x1c + index] = index * 7 + 3

  const plainAudio = Uint8Array.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0])
  fixtureModulePromise ||= KgmCryptoModule()
  const module = await fixtureModulePromise
  const pointer = module._malloc(header.length)
  try {
    module.writeArrayToMemory(header, pointer)
    module.preDec(pointer, header.length, extension === 'vpr' ? 'vpr' : 'kgm')
    const zeroes = new Uint8Array(plainAudio.length)
    module.writeArrayToMemory(zeroes, pointer)
    module.decBlob(pointer, zeroes.length, 0)
    const decoderConstant = module.HEAPU8.slice(pointer, pointer + zeroes.length)
    const encrypted = Uint8Array.from(plainAudio, (value, index) => {
      const intermediate = value ^ decoderConstant[index]
      return intermediate ^ ((intermediate & 0x0f) << 4)
    })
    const fixture = new Uint8Array(header.length + encrypted.length)
    fixture.set(header)
    fixture.set(encrypted, header.length)
    return fixture
  } finally {
    module._free(pointer)
  }
}

test('recognizes all supported KuGou file extensions', () => {
  for (const name of ['song.kgg', 'song.kgm', 'song.KGMA', 'song.vpr']) {
    assert.equal(isKugouFileName(name), true)
  }
  assert.equal(isKugouFileName('song.mp3'), false)
})

test('detects common decrypted audio codecs', () => {
  assert.equal(detectAudioCodec(Uint8Array.from([0xff, 0xfb])), 'mp3')
  assert.equal(detectAudioCodec(new TextEncoder().encode('fLaC')), 'flac')
  assert.equal(detectAudioCodec(new TextEncoder().encode('OggS')), 'ogg')
})

test('parses kgg.key mappings and ignores invalid rows', () => {
  const keyMap = parseKggKeyText('hash-a$ekey-a\r\ninvalid\nhash-b$ekey-b\n')
  assert.equal(keyMap.size, 2)
  assert.equal(keyMap.get('hash-a'), 'ekey-a')
  assert.equal(keyMap.get('hash-b'), 'ekey-b')
})

test('accepts an already decrypted SQLite key database', () => {
  const database = new Uint8Array(1024)
  database.set(new TextEncoder().encode('SQLite format 3\0'))
  assert.deepEqual(decryptKugouDatabaseBytes(database), database)
})

test('parses KGG v5 header metadata', () => {
  const bytes = new Uint8Array(2048)
  bytes.set(KGM_MAGIC)
  writeUint32LE(bytes, 0x10, 1024)
  writeUint32LE(bytes, 0x14, 5)
  const hash = new TextEncoder().encode('test-audio-hash')
  writeUint32LE(bytes, 0x44, hash.length)
  bytes.set(hash, 0x48)

  assert.deepEqual(parseKggHeader(bytes), {
    headerLength: 1024,
    cryptoVersion: 5,
    audioHash: 'test-audio-hash',
  })
})

test('Tencent TEA decrypts the upstream known-good vector', () => {
  const encrypted = Uint8Array.from([
    0x91, 0x09, 0x51, 0x62, 0xe3, 0xf5, 0xb6, 0xdc,
    0x6b, 0x41, 0x4b, 0x50, 0xd1, 0xa5, 0xb8, 0x4e,
    0xc5, 0x0d, 0x0c, 0x1b, 0x11, 0x96, 0xfd, 0x3c,
  ])
  const key = new TextEncoder().encode('12345678ABCDEFGH')
  assert.deepEqual(decryptTencentTea(encrypted, key), Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]))
})

test('converts a KGG fixture with a real upstream ekey into MP3', async () => {
  const audioHash = 'fixture-kgg-audio-hash'
  const plainAudio = Uint8Array.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0])
  const encryptedAudio = plainAudio.slice()
  const audioKey = deriveKggAudioKey(UPSTREAM_EKEY_V1)
  assert.equal(audioKey.length, 512)
  assert.deepEqual(Array.from(audioKey.subarray(0, 8)), [0x35, 0x46, 0x7a, 0x6f, 0x49, 0x5a, 0x77, 0x66])
  new Qmc2Rc4Cipher(audioKey).decrypt(encryptedAudio, 0)

  const header = new Uint8Array(1024)
  header.set(KGM_MAGIC)
  writeUint32LE(header, 0x10, header.length)
  writeUint32LE(header, 0x14, 5)
  const hashBytes = new TextEncoder().encode(audioHash)
  writeUint32LE(header, 0x44, hashBytes.length)
  header.set(hashBytes, 0x48)
  const fixture = new Uint8Array(header.length + encryptedAudio.length)
  fixture.set(header)
  fixture.set(encryptedAudio, header.length)

  const result = await convertKugouFile({
    name: 'fixture.kgg',
    arrayBuffer: async () => fixture.buffer,
  }, { keyMap: new Map([[audioHash, UPSTREAM_EKEY_V1]]) })
  assert.equal(result.extension, 'mp3')
  assert.equal(result.sourceCodec, 'mp3')
  assert.deepEqual(Array.from(result.audioBytes.subarray(0, 3)), [0x49, 0x44, 0x33])
})

test('QMC2 map cipher matches the known KuGou vector', () => {
  const alphabet = new TextEncoder().encode('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
  const key = Uint8Array.from({ length: 325 }, (_, index) => alphabet[index % alphabet.length])
  const bytes = Uint8Array.from([
    0x00, 0x9e, 0x41, 0xc1, 0x71, 0x36, 0x00, 0x80,
    0xf4, 0x00, 0x75, 0x9e, 0x36, 0x00, 0x14, 0x8a,
  ])
  new Qmc2MapCipher(key).decrypt(bytes, 32760)
  assert.deepEqual(bytes, new Uint8Array(16))
})

test('QMC2 RC4 cipher matches the known KuGou vector', () => {
  const key = Uint8Array.from({ length: 400 }, (_, index) => (index * 7 + 3) & 0xff)
  const bytes = new Uint8Array(16)
  new Qmc2Rc4Cipher(key).decrypt(bytes, 0x1400)
  assert.deepEqual(Array.from(bytes), [
    0xc5, 0xda, 0x55, 0x61, 0xb1, 0xa5, 0x7e, 0xea,
    0x47, 0x05, 0x51, 0x8a, 0x81, 0x61, 0xde, 0x6a,
  ])
})

for (const extension of ['kgm', 'kgma', 'vpr']) {
  test(`converts a ${extension.toUpperCase()} fixture into a real MP3`, async () => {
    const bytes = await makeLegacyFixture(extension)
    const file = {
      name: `fixture.${extension}`,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    }
    const result = await convertKugouFile(file)
    assert.equal(result.extension, 'mp3')
    assert.equal(result.mime, 'audio/mpeg')
    assert.equal(result.sourceCodec, 'mp3')
    assert.deepEqual(Array.from(result.audioBytes.subarray(0, 3)), [0x49, 0x44, 0x33])
  })
}
