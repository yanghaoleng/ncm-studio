import assert from 'node:assert/strict'
import test from 'node:test'

import { convertMusicFile, isSupportedMusicFile } from './convert.js'

test('web input accepts supported local formats including FLAC and rejects KGG key-based files', () => {
  for (const name of ['song.ncm', 'song.flac', 'song.FLAC', 'song.kgm', 'song.KGMA', 'song.vpr']) {
    assert.equal(isSupportedMusicFile(name), true, name)
  }
  assert.equal(isSupportedMusicFile('song.kgg'), false)
})

test('direct FLAC import rejects files whose contents are not FLAC audio', async () => {
  const file = {
    name: 'renamed.flac',
    arrayBuffer: async () => Uint8Array.from([0x49, 0x44, 0x33]).buffer,
  }

  await assert.rejects(
    convertMusicFile(file),
    /内容不是有效的 FLAC 音频/,
  )
})
