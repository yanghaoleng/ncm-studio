#!/usr/bin/env node

import { createRequire } from 'node:module'
import { basename, extname, join, resolve } from 'node:path'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { convertNcmFile } from '../src/lib/ncm.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json')

const HELP = `ncm-studio ${version}

将本地 NCM 文件转换为可播放音频。文件仅在本机处理。

用法:
  ncm-studio convert <文件或目录...> [选项]
  ncm-studio <文件或目录...> [选项]

选项:
  -o, --output <目录>  输出目录，默认为 ./converted
      --overwrite      覆盖同名文件，默认自动添加后缀
      --no-network     不请求缺失的网络封面
      --json           在 stdout 输出机器可读 JSON
      --quiet          不输出进度
  -h, --help           显示帮助
  -v, --version        显示版本

示例:
  ncm-studio convert ./music -o ./mp3
  ncm-studio ./song.ncm --json --no-network
`

function usageError(message) {
  const error = new Error(message)
  error.code = 'NCM_STUDIO_USAGE'
  return error
}

function parseArgs(argv) {
  const args = [...argv]
  const options = {
    inputs: [],
    output: './converted',
    overwrite: false,
    noNetwork: false,
    json: false,
    quiet: false,
    help: false,
    version: false,
  }

  if (args[0] === 'convert') args.shift()

  let positionalOnly = false
  while (args.length) {
    const argument = args.shift()
    if (argument === '--') {
      positionalOnly = true
      continue
    }
    if (!positionalOnly && (argument === '-h' || argument === '--help')) {
      options.help = true
    } else if (!positionalOnly && (argument === '-v' || argument === '--version')) {
      options.version = true
    } else if (!positionalOnly && (argument === '-o' || argument === '--output')) {
      const output = args.shift()
      if (!output) throw usageError(`${argument} 需要一个目录参数`)
      options.output = output
    } else if (!positionalOnly && argument === '--overwrite') {
      options.overwrite = true
    } else if (!positionalOnly && argument === '--no-network') {
      options.noNetwork = true
    } else if (!positionalOnly && argument === '--json') {
      options.json = true
    } else if (!positionalOnly && argument === '--quiet') {
      options.quiet = true
    } else if (!positionalOnly && argument.startsWith('-')) {
      throw usageError(`未知选项: ${argument}`)
    } else {
      options.inputs.push(argument)
    }
  }

  return options
}

async function collectDirectory(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectDirectory(entryPath, files)
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.ncm') {
      files.push(entryPath)
    }
  }
}

async function collectInputs(inputs) {
  const files = []
  for (const input of inputs) {
    const inputPath = resolve(input)
    let inputStat
    try {
      inputStat = await stat(inputPath)
    } catch {
      throw new Error(`找不到输入: ${input}`)
    }

    if (inputStat.isDirectory()) {
      await collectDirectory(inputPath, files)
    } else if (inputStat.isFile() && extname(inputPath).toLowerCase() === '.ncm') {
      files.push(inputPath)
    } else {
      throw new Error(`不是 NCM 文件或目录: ${input}`)
    }
  }

  return [...new Set(files.map((file) => resolve(file)))]
}

function exactArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function destinationFor(outputDirectory, filename, overwrite) {
  const directPath = join(outputDirectory, filename)
  if (overwrite) return directPath

  const extension = extname(filename)
  const stem = filename.slice(0, filename.length - extension.length)
  let candidate = directPath
  let suffix = 2
  while (true) {
    try {
      await stat(candidate)
      candidate = join(outputDirectory, `${stem} (${suffix})${extension}`)
      suffix += 1
    } catch {
      return candidate
    }
  }
}

function outputResult(result, options) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return
  }

  if (result.ok) {
    process.stdout.write(`\n完成: ${result.succeeded}/${result.total} 个文件已输出到 ${result.outputDirectory}\n`)
  } else {
    process.stdout.write(`\n完成: ${result.succeeded}/${result.total}，失败 ${result.failed} 个。\n`)
  }
}

async function convert(options) {
  if (!options.inputs.length) throw usageError('请至少提供一个 NCM 文件或目录')

  const files = await collectInputs(options.inputs)
  if (!files.length) throw new Error('输入中没有找到 .ncm 文件')

  const outputDirectory = resolve(options.output)
  await mkdir(outputDirectory, { recursive: true })

  const converted = []
  const errors = []
  for (let index = 0; index < files.length; index += 1) {
    const sourcePath = files[index]
    try {
      const sourceBytes = await readFile(sourcePath)
      const file = {
        name: basename(sourcePath),
        arrayBuffer: async () => exactArrayBuffer(sourceBytes),
      }
      const result = await convertNcmFile(file, { fetchCover: !options.noNetwork })
      const destination = await destinationFor(outputDirectory, result.filename, options.overwrite)
      await writeFile(destination, result.audioBytes)

      converted.push({
        input: sourcePath,
        output: destination,
        title: result.title,
        artist: result.artist,
        album: result.album || '',
        format: result.extension,
        bytes: result.audioBytes.byteLength,
      })

      if (!options.quiet && !options.json) {
        const percent = Math.round(((index + 1) / files.length) * 100)
        process.stderr.write(`[${index + 1}/${files.length}] ${percent}%  ${basename(sourcePath)} -> ${basename(destination)}\n`)
      }
    } catch (error) {
      errors.push({ input: sourcePath, error: error.message })
      if (!options.quiet && !options.json) {
        process.stderr.write(`[${index + 1}/${files.length}] 失败  ${basename(sourcePath)}: ${error.message}\n`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    total: files.length,
    succeeded: converted.length,
    failed: errors.length,
    outputDirectory,
    files: converted,
    errors,
  }
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
    if (options.help) {
      process.stdout.write(HELP)
      return
    }
    if (options.version) {
      process.stdout.write(`${version}\n`)
      return
    }

    const result = await convert(options)
    outputResult(result, options)
    if (!result.ok) process.exitCode = 1
  } catch (error) {
    const json = options?.json || process.argv.includes('--json')
    const result = { ok: false, error: error.message }
    if (json) {
      process.stdout.write(`${JSON.stringify(result)}\n`)
    } else {
      process.stderr.write(`错误: ${error.message}\n`)
      if (error.code === 'NCM_STUDIO_USAGE') process.stderr.write('\n运行 ncm-studio --help 查看用法。\n')
    }
    process.exitCode = 1
  }
}

await main()
