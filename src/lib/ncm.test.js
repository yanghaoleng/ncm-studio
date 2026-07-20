import assert from 'node:assert/strict'
import test from 'node:test'
import { attachMp3Tags } from './ncm.js'
import { buildTracksZip } from './zip.js'

function findAscii(bytes, text) {
  const needle = new TextEncoder().encode(text)
  for (let offset = 0; offset <= bytes.length - needle.length; offset += 1) {
    if (needle.every((value, index) => bytes[offset + index] === value)) return offset
  }
  return -1
}

test('attachMp3Tags writes the cover into an APIC frame', async () => {
  const audioBytes = Uint8Array.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0])
  const coverBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9])
  const taggedAudio = await attachMp3Tags(
    audioBytes,
    {
      musicName: '测试歌曲',
      artist: [['测试歌手']],
      album: '测试专辑',
    },
    coverBytes,
  )

  assert.deepEqual(Array.from(taggedAudio.subarray(0, 3)), [0x49, 0x44, 0x33])

  const apicOffset = findAscii(taggedAudio, 'APIC')
  assert.notEqual(apicOffset, -1)

  const frameSize = new DataView(
    taggedAudio.buffer,
    taggedAudio.byteOffset + apicOffset + 4,
    4,
  ).getUint32(0)
  const frameBytes = taggedAudio.subarray(apicOffset + 10, apicOffset + 10 + frameSize)
  const descriptionOffset = findAscii(frameBytes, 'Cover')
  assert.notEqual(descriptionOffset, -1)

  const coverOffset = descriptionOffset + 'Cover'.length + 1
  assert.deepEqual(Array.from(frameBytes.subarray(coverOffset)), Array.from(coverBytes))
  assert.deepEqual(Array.from(taggedAudio.subarray(-audioBytes.length)), Array.from(audioBytes))

  const zipBlob = await buildTracksZip([
    {
      title: '测试歌曲',
      filename: '测试歌曲.mp3',
      audioBytes: taggedAudio,
      audioBlob: new Blob([taggedAudio], { type: 'audio/mpeg' }),
      mime: 'audio/mpeg',
    },
  ])
  const zipBytes = new Uint8Array(await zipBlob.arrayBuffer())
  const zipView = new DataView(zipBytes.buffer)
  const zippedFileSize = zipView.getUint32(18, true)
  const zippedNameLength = zipView.getUint16(26, true)
  const zippedExtraLength = zipView.getUint16(28, true)
  const zippedAudioOffset = 30 + zippedNameLength + zippedExtraLength
  const zippedAudio = zipBytes.subarray(zippedAudioOffset, zippedAudioOffset + zippedFileSize)

  assert.deepEqual(Array.from(zippedAudio), Array.from(taggedAudio))
  assert.notEqual(findAscii(zippedAudio, 'APIC'), -1)
})
