import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const cliPath = fileURLToPath(new URL('./ncm-studio.mjs', import.meta.url))

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' })
}

test('CLI prints help', () => {
  const result = runCli(['--help'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /ncm-studio convert/)
  assert.match(result.stdout, /--json/)
})

test('CLI prints the package version', () => {
  const result = runCli(['--version'])
  assert.equal(result.status, 0)
  assert.equal(result.stdout.trim(), '0.1.0')
})

test('CLI returns machine-readable errors', () => {
  const result = runCli(['convert', './missing.ncm', '--json'])
  assert.equal(result.status, 1)
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: false,
    error: '找不到输入: ./missing.ncm',
  })
})
