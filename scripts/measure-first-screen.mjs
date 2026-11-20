// 体积预算：首屏「必须等待」的字节（脚本 + 样式 + modulepreload + preload）。
// 口径：首屏集合 = dist/index.html 里的 JS/CSS 与 modulepreload/preload 产物，不含入口 HTML 自身；
// 宿主经回环 HTTP 加载 dist，不发 gzip，「首屏 gzip」指线上经 gzip 传输时的字节。
// 两条线：--target 内部预算（默认 310000，超了只打 WARN，不 exit）；
//         --max 硬线（默认 320000，超了 exit 1）。
// 用法：node scripts/measure-first-screen.mjs [--dir dist] [--max 320000] [--target 310000]
//       [--real-max N] [--no-resident]
// 只读产物，不构建；超硬线 exit 1，首屏集合里出现 katex / lazy chunk 也 exit 1。
//
// 两个口径（第 136 轮，B-229）：
//   门（total）= 仍按上面的首屏集合算，默认门禁与 CI（ci.yml:39、release.yml:82/155）都用它，不改。
//   真实首载（real）= 门 + 常驻 chunk；常驻 = 启动后立刻动态 import、默认视图下无条件挂载的 chunk，
//   目前只有 MarginRail-*.js（App.tsx 的 lazy + 默认 edit 下挂载）。常驻按「seed 名单 + 它静态 import 的
//   传递闭包（已在门里计过的入口文件排除）」算，否则拆出共享 chunk 后会漏算（第 136 轮 plan-review CR-6）。
//   实测（第 136 轮 A2 前）：门 316,131 + 常驻 7,999 = 真实首载 324,130（超硬线 4,130）；
//   A2 拆完 R1/R2/asset 后：门 315,279 + 常驻 7,801 = 323,080（仍超线 3,080，B-229 保持 open）。
//   real 超硬线只 WARN（默认门禁不动，B-229 仍 open）；显式 --real-max N 才 FAIL exit 1（不进 verify/CI）。
//   --no-resident 复旧口径：不扫不入常驻，也不打印 real 行。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { URL } from 'node:url'
import { gzipSync } from 'node:zlib'

// 常驻 seed：启动后立刻动态 import 的 chunk 文件名。新常驻 chunk 要手动加进来（plan-review CR-5）。
const RESIDENT = [/^MarginRail-.*\.js$/]

// 静态依赖（import … from / export … from / import "…"）的模块说明符；动态 import(…) 不算——
// 区分「首载即下载」与「点开才下载」正是常驻口径要解决的问题。
function staticImports(source) {
  const out = []
  for (const match of source.matchAll(/\b(?:import|export)\s*(?:[^'"]*?\bfrom\s*)?['"]([^'"]+)['"]/g)) out.push(match[1])
  return out
}

// 把 `./x.js` / `../assets/x.js` 这类相对说明符按 ESM URL 语义解析成 `/assets/x.js` 形式。
function resolveSpecifier(fromUrl, spec) {
  if (!spec.startsWith('.')) return null
  try {
    return new URL(spec, new URL(fromUrl, 'http://local')).pathname
  } catch {
    return null
  }
}

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}
const positional = args.find((arg, i) => !arg.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'))
const dir = resolve(readArg('--dir', positional || 'dist'))
const max = Number(readArg('--max', '320000'))
const target = Number(readArg('--target', '310000'))
// --real-max 显式给了才把「真实首载超线」当 FAIL（默认只 WARN，门禁口径不动）
const realMaxArg = readArg('--real-max', '')
const realMax = realMaxArg === '' ? null : Number(realMaxArg)
const noResident = args.includes('--no-resident')
const indexHtml = readFileSync(join(dir, 'index.html'), 'utf8')

const urls = new Set()
const push = (value) => {
  if (!value) return
  const clean = value.split('?')[0].split('#')[0]
  if (clean.startsWith('data:')) return
  urls.add(clean)
}

// <script src=…>（含 type=module）；内联脚本不计
for (const match of indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) push(match[1])
// <link rel=stylesheet|modulepreload|preload as=script|style href=…>
for (const match of indexHtml.matchAll(/<link\b[^>]*>/gi)) {
  const tag = match[0]
  const rel = (tag.match(/\brel=["']([^"']+)["']/i) || [])[1] || ''
  const as = (tag.match(/\bas=["']([^"']+)["']/i) || [])[1] || ''
  const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1] || ''
  if (rel === 'stylesheet') push(href)
  else if (rel === 'modulepreload') push(href)
  else if (rel === 'preload' && (as === 'script' || as === 'style')) push(href)
}

const entries = [...urls].map((url) => {
  const file = join(dir, url.replace(/^\//, ''))
  const raw = statSync(file).size
  const gzip = gzipSync(readFileSync(file), { level: 9 }).length
  return { url, raw, gzip }
})

let totalRaw = 0
let totalGzip = 0
for (const entry of entries) {
  totalRaw += entry.raw
  totalGzip += entry.gzip
  console.log(`${entry.raw.toString().padStart(9)} ${entry.gzip.toString().padStart(8)}  ${entry.url}`)
}
// 预算按 gzip（首屏传输字节）算；raw 只做对照。与 Vite 日志的 gzip 相差约 1.3%，验收以本脚本为准。
const saved = totalRaw - totalGzip
const percent = totalRaw === 0 ? 0 : (saved / totalRaw) * 100
console.log(`total raw=${totalRaw} gzip=${totalGzip} headroom=${max - totalGzip} files=${entries.length} max=${max}`)
console.log(`target=${target} gap=${target - totalGzip}`)
console.log(`gzip 省下 ${saved} B（${percent.toFixed(1)}%）`)

const banned = entries.filter((entry) => /katex/i.test(entry.url) || /lazy/i.test(entry.url) || /mermaid/i.test(entry.url))
if (banned.length > 0) {
  console.log(`FAIL 首屏集合含 katex/lazy/mermaid chunk：${banned.map((entry) => entry.url).join(', ')}`)
  process.exit(1)
}
if (totalGzip > target) {
  console.log(`WARN 首屏 gzip ${totalGzip} 超过内部预算 ${target}（越过 ${totalGzip - target} B），仍在硬线 ${max} 内`)
}
// 余量预警：距硬线不到 5% 时提醒下一轮先算体积（第 37 轮；只提醒，不改 exit 码）
const headroom = max - totalGzip
if (headroom > 0 && headroom < max * 0.05) {
  console.log(`WARN 首屏距硬线 ${max} 只余 ${headroom} B（<5%），下一轮加静态代码前先算体积`)
}

// 常驻 seed 与两条计数守卫先跑：计数错了要立刻红，不能被后面的总门 FAIL 盖住（第 136 轮验收）。
const seeds = []
if (!noResident) {
  try {
    for (const name of readdirSync(join(dir, 'assets'))) {
      if (RESIDENT.some((pattern) => pattern.test(name))) seeds.push(`/assets/${name}`)
    }
  } catch {
    seeds.length = 0
  }
  if (seeds.length === 0) {
    console.log(`FAIL 常驻 chunk 未找到：assets 里没有匹配 ${RESIDENT.map(String).join(' / ')} 的文件`)
    process.exit(1)
  }
  // 常驻若已在门里（index.html 首屏集合），再加一次就是重复计数——宁可红，不出假的 real。
  const duplicated = seeds.filter((url) => urls.has(url))
  if (duplicated.length > 0) {
    console.log(`FAIL 重复计数：常驻 chunk 同时出现在门（index.html 首屏集合）里：${duplicated.join(', ')}`)
    process.exit(1)
  }
}
if (totalGzip > max) {
  console.log(`FAIL 首屏 gzip ${totalGzip} 超过上限 ${max}`)
  process.exit(1)
}

// ── 真实首载 = 门 + 常驻（第 136 轮，B-229；默认门禁不翻，--no-resident 复旧口径）──
if (!noResident) {
  const resident = []
  const visited = new Set()
  const queue = [...seeds]
  while (queue.length > 0) {
    const url = queue.shift()
    if (visited.has(url)) continue
    visited.add(url)
    const file = join(dir, url.replace(/^\//, ''))
    if (!existsSync(file)) continue
    const buffer = readFileSync(file)
    resident.push({ url, raw: buffer.length, gzip: gzipSync(buffer, { level: 9 }).length })
    for (const spec of staticImports(buffer.toString('utf8'))) {
      const target = resolveSpecifier(url, spec)
      // 门里已计过的文件（入口 index/runtime/css 等）不重复计；只补「首载会下载但门没算」的。
      if (!target || urls.has(target) || visited.has(target)) continue
      queue.push(target)
    }
  }
  let residentRaw = 0
  let residentGzip = 0
  for (const entry of resident) {
    residentRaw += entry.raw
    residentGzip += entry.gzip
    console.log(`${entry.raw.toString().padStart(9)} ${entry.gzip.toString().padStart(8)}  ${entry.url}  （常驻）`)
  }
  const realRaw = totalRaw + residentRaw
  const realGzip = totalGzip + residentGzip
  console.log(`resident raw=${residentRaw} gzip=${residentGzip} files=${resident.length}`)
  console.log(`real raw=${realRaw} gzip=${realGzip} headroom=${max - realGzip} max=${max}`)
  console.log(`total=${totalGzip} resident=${residentGzip} real=${realGzip}`)
  if (realMax !== null && realGzip > realMax) {
    console.log(`FAIL 真实首载 gzip ${realGzip} 超过 --real-max ${realMax}（越过 ${realGzip - realMax} B）`)
    process.exit(1)
  }
  if (realGzip > max) {
    console.log(`WARN 真实首载 gzip ${realGzip} 超硬线 ${max}（越过 ${realGzip - max} B），默认门禁仍按旧口径（B-229）`)
  }
}
console.log('PASS')
