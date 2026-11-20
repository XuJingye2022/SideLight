import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * 第 139 轮 A3（B-229）静态门：`npm run verify` 的默认口径翻成「真实首载 = 门 + 常驻」。
 *
 * 背景：门只算 index.html 首屏集合，常驻的 `MarginRail-*.js`（启动即动态 import、默认视图下必然挂载）
 * 不在里面，于是「门 PASS、真实首载超 320,000」连续 14 轮躲过默认门禁（第 101 轮起 B-229 一直 open）。
 * 翻转后 `--max` 就是真实首载硬线：`--max 316200` 这种旧门槛会直接红；`--no-resident` 复旧口径。
 *
 * 这是文本门不是行为门：行为证据是三条命令（`docs/iteration/round-139/impl.md`）：
 *   node scripts/measure-first-screen.mjs                    → exit 0，real=319,806
 *   node scripts/measure-first-screen.mjs --no-resident      → exit 0，无 real 行
 *   node scripts/measure-first-screen.mjs --real-max 319000  → exit 1
 * 负向证据：删掉预算判定的 exit 分支 → 本文件 2 条红（`docs/iteration/round-139/impl.md`）。
 */
const source = readFileSync('scripts/measure-first-screen.mjs', 'utf8')

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1

test('默认口径：realMax 取 --real-max ?? max，预算判 real，real 超线 exit 1', () => {
  assert.equal(
    count(source, "const realMax = Number(readArg('--real-max', String(max)))"),
    1,
    '默认真实首载硬线必须等于 --max（显式 --real-max 才另给）',
  )
  assert.ok(
    source.includes('const budgetGzip = noResident ? totalGzip : realGzip'),
    '默认预算必须判 real（--no-resident 才判 total）',
  )
  assert.ok(source.includes('const budgetMax = noResident ? max : realMax'), '默认硬线必须取 realMax')
  const failAt = source.indexOf('if (budgetGzip > budgetMax) {')
  assert.ok(failAt >= 0, '缺「真实首载超硬线」的分支')
  const exitAt = source.indexOf('process.exit(1)', failAt)
  assert.ok(exitAt > failAt && exitAt - failAt < 400, '超线必须 exit 1（只打 WARN 等于没翻口径）')
})

test('--no-resident 复旧口径：不扫常驻、无 real 行、预算与 target 都判 total', () => {
  assert.ok(source.includes('if (!noResident) {'), '缺 --no-resident 分支')
  const realLineAt = source.indexOf('console.log(`real raw=')
  assert.ok(realLineAt >= 0, '找不到 real 行')
  const residentBlockAt = source.lastIndexOf('if (!noResident) {', realLineAt)
  assert.ok(residentBlockAt >= 0 && realLineAt > residentBlockAt, 'real 行必须在「扫常驻」那个分支里：--no-resident 不许打印')
  assert.ok(source.includes("const budgetName = noResident ? '首屏' : '真实首载'"), '旧口径的提示文案要写「首屏」')
  assert.ok(count(source, 'if (!noResident) {') === 2, '常驻扫描 + real 打印两块都受 noResident 守卫')
})

test('RESIDENT 只匹配 MarginRail-*.js（常驻 seed 名单，B-229 的 real 来源）', () => {
  assert.ok(source.includes('const RESIDENT = [/^MarginRail-.*\\.js$/]'), '常驻 seed 名单变了：新常驻 chunk 要同步进来')
  const pattern = /^MarginRail-.*\.js$/
  assert.ok(pattern.test('MarginRail-fR6tpMt8.js'), '真实产物名必须命中')
  assert.ok(!pattern.test('RailChat-CFiE9VZE.js'), '按需加载的面板 chunk 不算常驻')
  assert.ok(!pattern.test('index-CeZdXAGs.js'), '入口已在门里，不能再算一次')
})

test('预算判定排在常驻计算之后、PASS 之前（real 不能恒 0 假绿）', () => {
  const residentAt = source.indexOf('const resident = []')
  const budgetAt = source.indexOf('const budgetGzip = noResident ? totalGzip : realGzip')
  const passAt = source.indexOf("console.log('PASS')")
  assert.ok(residentAt >= 0 && budgetAt > residentAt, '预算判定必须在常驻算完之后，否则 real 恒 0')
  assert.ok(passAt > budgetAt, 'PASS 只能在预算判定之后')
  const failAt = source.indexOf('if (budgetGzip > budgetMax) {', budgetAt)
  assert.ok(failAt > budgetAt && failAt < passAt, '超线分支要落在预算判定与 PASS 之间')
})
