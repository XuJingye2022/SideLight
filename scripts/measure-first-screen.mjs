// 体积预算：首屏「必须等待」的字节（脚本 + 样式 + modulepreload + preload）。
// 用法：node scripts/measure-first-screen.mjs [--dir dist] [--max 286000]
// 只读产物，不构建；超线 exit 1，首屏集合里出现 katex / lazy chunk 也 exit 1。
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}
const positional = args.find((arg) => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--max' && args[args.indexOf(arg) - 1] !== '--dir')
const dir = resolve(readArg('--dir', positional || 'dist'))
const max = Number(readArg('--max', '286000'))
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
console.log(`gzip 省下 ${saved} B（${percent.toFixed(1)}%）`)

const banned = entries.filter((entry) => /katex/i.test(entry.url) || /lazy/i.test(entry.url))
if (banned.length > 0) {
  console.log(`FAIL 首屏集合含 katex/lazy chunk：${banned.map((entry) => entry.url).join(', ')}`)
  process.exit(1)
}
if (totalGzip > max) {
  console.log(`FAIL 首屏 gzip ${totalGzip} 超过上限 ${max}`)
  process.exit(1)
}
console.log('PASS')
