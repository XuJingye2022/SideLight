import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 144 轮 A1：取消首屏硬线，体积只记录（用户 2026-11-21「取消 325,000 B 首屏硬线，
 * 不要为体积砍体验」）。`--max` / `--real-max` 默认 **null**：不传就只打印 total/resident/real
 * 与 `headroom=none`，退出码始终 0；显式传值才是硬线（超线 exit 1）。安装包 50,000,000 B 硬线不动。
 *
 * 这是文本门不是行为门：行为证据是四条命令（`docs/iteration/round-144/impl.md`）：
 *   node scripts/measure-first-screen.mjs                        → exit 0，real=321,273、headroom=none
 *   node scripts/measure-first-screen.mjs --max 1000             → exit 1（FAIL 首屏 gzip…）
 *   node scripts/measure-first-screen.mjs --real-max 1000        → exit 1（FAIL 真实首载 gzip…）
 *   node scripts/measure-first-screen.mjs --no-resident --max 1000 → exit 1
 * CI 三处裸调用（ci.yml:39、release.yml:82、release.yml:155）不带 --max，因此不再因体积失败。
 */
const source = readFileSync('scripts/measure-first-screen.mjs', 'utf8')
const read = (file: string): string => readFileSync(file, 'utf8')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

test('默认不判体积：--max / --real-max 默认 null，两处体积 FAIL 都按 null 守卫', () => {
  assert.equal(
    count(source, "const max = numberOrNull(readArg('--max', null))"),
    1,
    '--max 必须默认 null（不传就只记录）',
  )
  assert.equal(
    count(source, "const realMax = numberOrNull(readArg('--real-max', null)) ?? max"),
    1,
    '--real-max 必须默认跟随 --max（两者都不传时都是 null）',
  )
  assert.equal(count(source, "const hasHardLine = budgetMax !== null"), 1, '缺「有没有硬线」这一个判据')
  // 两处体积 FAIL：门（total）与预算（real）。写成 `totalGzip > null` 恒真，无参调用必红。
  assert.ok(
    source.includes('if (max !== null && totalGzip > max) {'),
    '门超线分支必须按 max !== null 守卫（否则无参调用必红）',
  )
  assert.ok(
    source.includes('if (hasHardLine && budgetGzip > budgetMax) {'),
    '预算超线分支必须按 hasHardLine 守卫（否则无参调用必红）',
  )
  assert.ok(!source.includes("readArg('--max', '325000')"), '旧的 325000 默认值必须删掉')
  assert.ok(source.includes('headroomOf'), '余量打印要能打 none（没有硬线时 headroom=none）')
  assert.ok(source.includes("console.log('PASS')"), '无参调用仍要打印 PASS')
})

test('显式传硬线仍 exit 1：--max 判门、--real-max 判真实首载、--no-resident 判门', () => {
  const gateAt = source.indexOf('if (max !== null && totalGzip > max) {')
  assert.ok(gateAt >= 0, '缺「首屏门超硬线」的分支')
  assert.ok(source.indexOf('process.exit(1)', gateAt) - gateAt < 400, '门超线必须 exit 1')

  const budgetAt = source.indexOf('if (hasHardLine && budgetGzip > budgetMax) {')
  assert.ok(budgetAt >= 0, '缺「预算超硬线」的分支')
  assert.ok(source.indexOf('process.exit(1)', budgetAt) - budgetAt < 400, '预算超线必须 exit 1')
  assert.ok(source.includes('const budgetMax = noResident ? max : realMax'), '--no-resident 判门、默认判 realMax')
})

test('保留非体积守卫：katex/lazy/mermaid 禁入、常驻 seed、重复计数、RESIDENT 名单', () => {
  assert.ok(source.includes("if (banned.length > 0) {"), '首屏集合禁入 katex/lazy/mermaid 的守卫不能跟着体积门一起删')
  assert.ok(source.includes('FAIL 常驻 chunk 未找到'), '常驻 seed 0 命中仍要 exit 1')
  assert.ok(source.includes('FAIL 重复计数'), '常驻同时出现在门里仍要 exit 1')
  assert.ok(source.includes('const RESIDENT = [/^MarginRail-.*\\.js$/]'), '常驻 seed 名单变了：新常驻 chunk 要同步进来')
  const pattern = /^MarginRail-.*\.js$/
  assert.ok(pattern.test('MarginRail-fR6tpMt8.js'), '真实产物名必须命中')
  assert.ok(!pattern.test('RailChat-CFiE9VZE.js'), '按需加载的面板 chunk 不算常驻')
})

test('文档同步：首屏只记录、不阻塞；安装包硬线原句不动；BRIEF 不再写首屏硬线数字', () => {
  for (const file of ['AGENTS.md', 'README.md', 'docs/iteration/BRIEF.md']) {
    const text = read(file)
    assert.ok(text.includes('只记录'), `${file} 必须写明体积只记录`)
    assert.ok(text.includes('不阻塞'), `${file} 必须写明体积不阻塞`)
    assert.ok(!text.includes('真实首载 gzip 字节门'), `${file} 仍把 verify 说成「字节门」`)
  }
  assert.ok(!read('docs/iteration/BRIEF.md').includes('325,000'), 'BRIEF 不再写首屏硬线数字')
  assert.ok(!read('scripts/measure-first-screen.mjs').includes('325000'), '脚本里不再出现 325000')
  const agents = read('AGENTS.md')
  assert.ok(agents.includes('50,000,000 B'), '安装包硬线 50,000,000 原句必须仍在')
  assert.ok(agents.includes('45,000,000 B'), '安装包内部预算 45,000,000 原句必须仍在')
})
