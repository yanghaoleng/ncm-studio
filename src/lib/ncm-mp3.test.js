import assert from 'node:assert/strict'
import test from 'node:test'

import CryptoJS from 'crypto-js'

import { detectAudioCodec } from './audio.js'
import { convertNcmToMp3 } from './ncm-mp3.js'

const CORE_KEY = CryptoJS.enc.Hex.parse('687A4852416D736F356B496E62617857')

function uint8ArrayToWordArray(bytes) {
  const words = []
  for (let index = 0; index < bytes.length; index += 1) {
    words[index >>> 2] |= bytes[index] << (24 - (index % 4) * 8)
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

function wordArrayToUint8Array(wordArray) {
  const output = new Uint8Array(wordArray.sigBytes)
  for (let index = 0; index < wordArray.sigBytes; index += 1) {
    output[index] = (wordArray.words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff
  }
  return output
}

function writeUint32LE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, true)
}

function createKeyBox(keyData) {
  const box = Uint8Array.from({ length: 256 }, (_, index) => index)
  let c = 0
  let lastByte = 0
  let keyOffset = 0

  for (let index = 0; index < box.length; index += 1) {
    const swap = box[index]
    c = (swap + lastByte + keyData[keyOffset]) & 0xff
    keyOffset = (keyOffset + 1) % keyData.length
    box[index] = box[c]
    box[c] = swap
    lastByte = c
  }

  return box
}

function cryptAudio(bytes, keyBox) {
  const output = new Uint8Array(bytes)
  for (let index = 0; index < output.length; index += 1) {
    const j = (index + 1) & 0xff
    output[index] ^= keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff]
  }
  return output
}

function createPcmWav({ sampleRate = 96000, durationSeconds = 0.08 } = {}) {
  const channels = 2
  const frameCount = Math.round(sampleRate * durationSeconds)
  const bytesPerFrame = channels * 2
  const output = new Uint8Array(44 + frameCount * bytesPerFrame)
  const view = new DataView(output.buffer)
  output.set(new TextEncoder().encode('RIFF'), 0)
  view.setUint32(4, output.length - 8, true)
  output.set(new TextEncoder().encode('WAVEfmt '), 8)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerFrame, true)
  view.setUint16(32, bytesPerFrame, true)
  view.setUint16(34, 16, true)
  output.set(new TextEncoder().encode('data'), 36)
  view.setUint32(40, frameCount * bytesPerFrame, true)

  for (let frame = 0; frame < frameCount; frame += 1) {
    const sample = Math.round(Math.sin(frame / sampleRate * Math.PI * 2 * 440) * 12000)
    view.setInt16(44 + frame * bytesPerFrame, sample, true)
    view.setInt16(46 + frame * bytesPerFrame, sample, true)
  }

  return output
}

function createNcmFixture(audioBytes) {
  const audioKey = new TextEncoder().encode('fixture-audio-key')
  const keyPrefix = new TextEncoder().encode('neteasecloudmusic')
  const plainKey = new Uint8Array(keyPrefix.length + audioKey.length)
  plainKey.set(keyPrefix)
  plainKey.set(audioKey, keyPrefix.length)
  const encryptedKey = wordArrayToUint8Array(CryptoJS.AES.encrypt(
    uint8ArrayToWordArray(plainKey),
    CORE_KEY,
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
  ).ciphertext)
  for (let index = 0; index < encryptedKey.length; index += 1) encryptedKey[index] ^= 0x64

  const encryptedAudio = cryptAudio(audioBytes, createKeyBox(audioKey))
  const output = new Uint8Array(10 + 4 + encryptedKey.length + 4 + 5 + 4 + encryptedAudio.length)
  output.set(new TextEncoder().encode('CTENFDAM'), 0)
  let offset = 10
  writeUint32LE(output, offset, encryptedKey.length)
  offset += 4
  output.set(encryptedKey, offset)
  offset += encryptedKey.length
  writeUint32LE(output, offset, 0)
  offset += 4 + 5
  writeUint32LE(output, offset, 0)
  offset += 4
  output.set(encryptedAudio, offset)
  return output
}

test('converts a high-sample-rate non-MP3 NCM payload into a real MP3', async () => {
  const ncmBytes = createNcmFixture(createPcmWav())
  const result = await convertNcmToMp3({
    name: 'fixture.ncm',
    arrayBuffer: async () => ncmBytes.buffer,
  }, { fetchCover: false })

  assert.equal(result.sourceFormat, 'ncm')
  assert.equal(result.sourceCodec, 'wav')
  assert.equal(result.extension, 'mp3')
  assert.equal(result.mime, 'audio/mpeg')
  assert.equal(result.filename, 'fixture.mp3')
  assert.equal(detectAudioCodec(result.audioBytes), 'mp3')
})

test('distinguishes AAC ADTS from an MP3 frame header', () => {
  assert.equal(detectAudioCodec(Uint8Array.from([0xff, 0xf1])), 'aac')
  assert.equal(detectAudioCodec(Uint8Array.from([0xff, 0xfb])), 'mp3')
})
