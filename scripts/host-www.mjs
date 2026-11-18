// 宿主静态镜像：把 dist 同步到 host/bin/www，并检查两边是否分叉（第 85 轮 B-126）。
//
// 背景：host/build.ps1 只在编宿主时把 dist 拷进 host/bin/www；`npm run build` 只写 dist。
// 于是一次次换 chunk hash 后两边越差越多（第 66 轮起 www 停在旧入口），直接跑
// host/bin/Sidelight.exe 看到的是旧前端。安装包只读 dist，不受影响。
//
// 用法：node scripts/host-www.mjs [--check] [--dist <dir>] [--www <dir>]
//   无参   = 镜像：先拷 dist 全部文件（index.html 最后），全部成功后才删 www 里 dist 没有的路径。
//            任何一步失败都停在「新旧并存」，不删不回滚，警告后 exit 0。
//   --check = 只比 dist 侧：逐路径比内容字节；缺/差决定 exit code，多余只报告不清零。
//   两边任一缺失（无 dist/index.html 或 www 不存在）都算「跳过」：exit 0，Linux CI 也安全。
//
// 不引依赖（node:fs / node:path），不读环境变量，目标目录可用 --dist / --www 换。
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const DEFAULTS = { dist: join(ROOT, 'dist'), www: join(ROOT, 'host', 'bin', 'www') }
const FAILURE_HINT = '宿主可能正在运行，关掉后重跑 `npm run build`。'

const absolute = (root, rel) => join(root, ...rel.split('/'))
const messageOf = (error) => (error instanceof Error ? error.message : String(error))

function usage() {
  return [
    '用法：node scripts/host-www.mjs [--check] [--dist <dir>] [--www <dir>]',
    '  无参     镜像 dist → host/bin/www（先拷后删多余）',
    '  --check  只检查 dist 侧是否有缺文件 / 内容差（多余只报告）',
  ].join('\n')
}

function parseArgs(argv) {
  const options = { check: false, dist: DEFAULTS.dist, www: DEFAULTS.www }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--check') {
      options.check = true
      continue
    }
    if (arg === '--dist' || arg === '--www') {
      const value = argv[index + 1]
      if (!value) {
        console.error(`缺少参数值：${arg}\n${usage()}`)
        process.exit(2)
      }
      options[arg.slice(2)] = resolve(value)
      index += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage())
      process.exit(0)
    }
    console.error(`未知参数：${arg}\n${usage()}`)
    process.exit(2)
  }
  return options
}

/** 递归列出目录下所有文件的相对路径（统一用 `/` 分隔，排序后返回） */
function listFiles(root) {
  const files = []
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), rel)
      else if (entry.isFile()) files.push(rel)
    }
  }
  walk(root, '')
  return files.sort()
}

/** 可镜像 / 可检查的最小条件：dist 有 index.html、www 目录存在 */
function sidesReady({ dist, www }) {
  return existsSync(join(dist, 'index.html')) && existsSync(www)
}

/** dist 侧的入口 chunk（只用于打印，方便对照两边停在哪个 hash） */
function entryChunk(files) {
  return files.find((rel) => /^assets\/index-.*\.js$/.test(rel)) ?? '(无)'
}

function mirror(options) {
  const { dist, www } = options
  if (!sidesReady(options)) {
    console.log(`跳过：dist/index.html 或 ${relative(ROOT, www) || www} 不存在，不做镜像`)
    return 0
  }
  const distFiles = listFiles(dist)
  const before = new Set(listFiles(www))
  // index.html 最后写：新 chunk 全部在场之前，入口文件不会指向还不存在的文件
  const ordered = [...distFiles.filter((rel) => rel !== 'index.html'), ...distFiles.filter((rel) => rel === 'index.html')]
  for (const rel of ordered) {
    try {
      const target = absolute(www, rel)
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(absolute(dist, rel), target)
    } catch (error) {
      console.warn(`拷贝失败：${rel}（${messageOf(error)}）`)
      console.warn('镜像中断：新文件与旧文件并存，未删除多余文件。')
      console.warn(FAILURE_HINT)
      return 0
    }
  }
  // 全部拷成功后才删：先收集（依据拷贝前的 www 快照），再逐个删
  const stale = [...before].filter((rel) => !distFiles.includes(rel))
  let removed = 0
  for (const rel of stale) {
    try {
      rmSync(absolute(www, rel), { force: true })
      removed += 1
    } catch (error) {
      console.warn(`删除多余文件失败：${rel}（${messageOf(error)}）`)
    }
  }
  const after = listFiles(www)
  const bytes = after.reduce((sum, rel) => sum + statSync(absolute(www, rel)).size, 0)
  console.log(`已镜像：${distFiles.length} 个文件 → ${relative(ROOT, www) || www}（删除 ${removed} 个多余文件）`)
  console.log(`www：${after.length} 个文件，${bytes} B；入口 ${entryChunk(after)}`)
  return 0
}

function check(options) {
  const { dist, www } = options
  if (!sidesReady(options)) {
    console.log(`跳过：dist/index.html 或 ${relative(ROOT, www) || www} 不存在，不做检查`)
    return 0
  }
  const distFiles = listFiles(dist)
  const wwwFiles = listFiles(www)
  const present = new Set(wwwFiles)
  const missing = []
  const differing = []
  for (const rel of distFiles) {
    if (!present.has(rel)) {
      missing.push(rel)
      continue
    }
    // 只比 dist 侧文件的内容字节：www 多出来的旧 chunk 不清零也算一致
    if (!readFileSync(absolute(dist, rel)).equals(readFileSync(absolute(www, rel)))) differing.push(rel)
  }
  const extra = wwwFiles.filter((rel) => !distFiles.includes(rel))
  if (missing.length + differing.length === 0) {
    console.log(`一致：${distFiles.length} 个文件逐字节相同；多余 ${extra.length} 个（只报告，不影响退出码）`)
    return 0
  }
  console.log(`不一致：缺 ${missing.length} / 内容差 ${differing.length} / 多余 ${extra.length}`)
  for (const [label, list] of [
    ['缺', missing],
    ['内容差', differing],
  ]) {
    for (const rel of list.slice(0, 5)) console.log(`  ${label} ${rel}`)
    if (list.length > 5) console.log(`  …其余 ${list.length - 5} 个${label}文件未列出`)
  }
  console.log(`入口：dist ${entryChunk(distFiles)} / www ${entryChunk(wwwFiles)}`)
  return 1
}

const options = parseArgs(process.argv.slice(2))
process.exitCode = options.check ? check(options) : mirror(options)
