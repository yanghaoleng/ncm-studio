import { copyFile, cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, 'public')
await mkdir(target, { recursive: true })
await cp(resolve(root, 'licenses'), resolve(target, 'licenses'), { recursive: true })
for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'DISTRIBUTION_COMPLIANCE.md']) {
  await copyFile(resolve(root, name), resolve(target, name))
}
