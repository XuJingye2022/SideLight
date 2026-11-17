// 迭代度量：把一行追加到 docs/iteration/METRICS.md
// 用法：node scripts/iteration/metrics.mjs --batch v2-1 --rounds 51-54 --agents 24 \
//   --wall 190 --kb 72 --findings 18 --tasks 12 --tests 400 --screen 293751 --escapes 0 --note "两轮一侦察"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const get = (name, fallback = '') => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}
const path = resolve('docs/iteration/METRICS.md')
const header = '# 迭代度量\n\n| 批次 | 轮 | 代理数 | 墙钟 min | 报告 KB/轮 | 发现 | 任务 | 测试 | 首屏 B | 逃逸 BUG | 备注 |\n| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |\n'
const row = `| ${get('batch', 'v2')} | ${get('rounds', '')} | ${get('agents', '')} | ${get('wall', '')} | ${get('kb', '')} | ${get('findings', '')} | ${get('tasks', '')} | ${get('tests', '')} | ${get('screen', '')} | ${get('escapes', '')} | ${get('note', '')} |`
mkdirSync(dirname(path), { recursive: true })
const text = existsSync(path) ? readFileSync(path, 'utf8') : header
const lines = text.split('\n')
const headerAt = lines.findIndex((line) => line.startsWith('| 批次 |'))
if (headerAt < 0) {
  writeFileSync(path, `${header}${row}\n`, 'utf8')
} else {
  lines.splice(headerAt + 2, 0, row)
  writeFileSync(path, `${lines.join('\n').replace(/\n+$/, '')}\n`, 'utf8')
}
console.log(row)
