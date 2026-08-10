import assert from 'node:assert/strict'
import test from 'node:test'

import { isSupportedMusicFile } from './convert.js'

test('web input accepts supported local formats and rejects KGG key-based files', () => {
  for (const name of ['song.ncm', 'song.kgm', 'song.KGMA', 'song.vpr']) {
    assert.equal(isSupportedMusicFile(name), true, name)
  }
  assert.equal(isSupportedMusicFile('song.kgg'), false)
})
