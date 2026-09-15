import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AdaptiveTaskQueue,
  getConversionConcurrencyProfile,
  getConversionTaskWeight,
} from './concurrency.js'

test('selects a higher but bounded concurrency from CPU and memory', () => {
  assert.deepEqual(
    getConversionConcurrencyProfile({ hardwareConcurrency: 8, deviceMemory: 16 }),
    { minimum: 2, initial: 3, maximum: 3 },
  )
  assert.deepEqual(
    getConversionConcurrencyProfile({ hardwareConcurrency: 16, deviceMemory: 4 }),
    { minimum: 2, initial: 2, maximum: 2 },
  )
  assert.deepEqual(
    getConversionConcurrencyProfile({ hardwareConcurrency: 2, deviceMemory: 2 }),
    { minimum: 1, initial: 1, maximum: 1 },
  )
})

test('assigns extra queue weight to large encrypted audio files', () => {
  assert.equal(getConversionTaskWeight(20 * 1024 * 1024), 1)
  assert.equal(getConversionTaskWeight(100 * 1024 * 1024), 2)
  assert.equal(getConversionTaskWeight(300 * 1024 * 1024), 3)
})

test('reduces concurrency under sustained lag and restores it after stable samples', () => {
  const queue = new AdaptiveTaskQueue({
    capabilities: { hardwareConcurrency: 8, deviceMemory: 16 },
  })
  assert.equal(queue.limit, 3)
  queue.observeEventLoopLag(400)
  queue.observeEventLoopLag(400)
  assert.equal(queue.limit, 2)
  for (let index = 0; index < 8; index += 1) queue.observeEventLoopLag(20)
  assert.equal(queue.limit, 3)
  queue.dispose()
})

test('respects weighted capacity while continuing queued work', async () => {
  const queue = new AdaptiveTaskQueue({
    capabilities: { hardwareConcurrency: 4, deviceMemory: 8 },
  })
  const started = []
  const releases = []
  const makeTask = (id) => () => new Promise((resolve) => {
    started.push(id)
    releases.push(resolve)
  })

  queue.enqueue('large', makeTask('large'), { weight: 2 })
  queue.enqueue('small', makeTask('small'))
  await Promise.resolve()
  assert.deepEqual(started, ['large'])

  releases.shift()()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.deepEqual(started, ['large', 'small'])
  releases.shift()()
  queue.dispose()
})
