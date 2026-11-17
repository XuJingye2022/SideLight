# 第 56 轮独立验收（tester）

轮前 `882eb49`。未读 `impl.md`。判定 **PASS**（A1 B-119、A3 B-116）。

## 1 门禁（一次跑完）

| 门 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run verify` | PASS，首屏 gzip **297,719 B**（内部 310,000 / 硬线 320,000，余 12,281 / 22,281；主 chunk 922,726 raw） | `.tmp/r56-tester-verify.log` |
| `tsc --noEmit` | 0（含在 build 里） | 同上 |
| `npm test` | **37 文件 467 条，0 失败** | `.tmp/r56-tester-test.log` |
| `npm run roundtrip` | PASS：rich 6/8、source 8/8（`04` -4/+1、`06` -0/+1，与改前一致） | `.tmp/r56-tester-roundtrip.log` |

## 2 A1 B-119 行内定界符守卫

- **红→绿独立复现**：把 `src/lib/inlineSyntax.ts` 临时换回 HEAD 版（备份后 `git checkout HEAD --`），只跑该测试文件：14 条里 **5 条 B-119 红**（`==== 与 ==不闭合`、`x ==== y ==z`、`^^ 与 ^不闭合`、`a ^ b 与 c^d`、`~a~ ~b~ 与 a ~ b 与 H~2~O`），实际值 `[' 与 ']`/`[' y ']`/`[' 与 ']`/`[' b 与 c']`/`['a','b',' b 与 H']`。随后从备份还原，SHA256 与改后一致（`RESTORED_OK=True`）。`.tmp/r56-tester-tests-red.log`；交付方的 `.tmp/r56-a1-tests-red.log`/`-green.log` 与我们复现一致（绿 14/14）。
- **E2E（自跑，CDP 9222，先 `reset.mjs`）**：finder 6 例 +`a====b==c`+`== a ==`+正向对照，开关各一轮 8 例，`Ctrl+S` 写盘的字节与源串**逐字节相同**（`offAllSame/onAllSame` 全 true）。开态 mark 计数：`a====b==c` 与 `== a ==` 的 `.sl-eq` 均 **0**；`==== 与 ==不闭合`、`x ==== y ==z` 的 eq 0；`^^ 与 ^不闭合`、`a ^ b 与 c^d` 的 sup 0；`~a~ ~b~ 与 a ~ b 与 H~2~O` 的 sub **3**；正向对照 `==高亮== 与 ^上标^ 与 H~2~O` 为 eq 1 / sup 1 / sub 1；0 控制台错误。`.tmp/r56-tester-a1-e2e.json`（交付方同结论，`.tmp/r56-a1-e2e.impl.json`）。
- 设置提示已改「成对且不贴空白才解析」（`src/components/SettingsDialog.tsx:119`），不再声称「写回字节两种状态都一样」。

## 3 A3 B-116 逐键脏判定去全文序列化

**残值（交付方先记，`.tmp/r56-a3-residual.json`）**：100 KB p50 38 / p95 40；1 MB p50 148 / p95 248。两个尺寸的残值都 ≥ 原绝对门槛（100 KB 20 / 1 MB 60 ms）→ 按计划**只记 B-116 新基线，不设绝对门槛**。残值 p50 与改后 p50 相同（见下），说明已在 PM 与视图地板；1 MB 残值 p95 的 248 是单次尖峰（n=40，max 248），p50 才是地板。

**p95 门（同一窗口同脚本 A/B：临时 `git checkout HEAD -- src/App.tsx` → 跑 → 还原，SHA256 一致）**：

| 尺寸 | 改前（本机 A/B） | 计划基线 | 改后（我跑） | 计划绝对门 | 对计划基线 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 100 KB | p50 43 / p95 **50** | p95 66 | p50 38 / p95 **39** | ≤46 ✓ | **−40.9%** |
| 1 MB | p50 229 / p95 **234** | p95 252 | p50 147 / p95 **154** | ≤176 ✓ | **−38.9%** |

注记（非缺陷）：对**同窗口**改前基线，1 MB 降 **34.2%**（≥30%），100 KB 只降 **22%**（50→39）——100 KB 的 p95 地板是 40 ms，对 50 ms 基线最多 −20%，30% 不可达；这属计划里「残值 ≥ 绝对门槛 → 只记新基线」的尺寸。两个绝对门（39≤46、154≤176）都过。`.tmp/r56-tester-{baseline.log,perf.json}`。

**脏判定与保存（自跑，`.tmp/r56-tester-a3-dirty.json`、`.tmp/r56-tester-a3-load.json`）**：打字后 `.dirty` **1 ms** 出现（≤300）；`Ctrl+S` 写出 `abc`、提示「已保存 r56-a3-disk.md」；撤销 1 次回基线、`.dirty` **334 ms** 消失（≤800）；干净后 `Ctrl+S` 不再写盘、提示「没有改动，未写入。」；1 MB 载入 **5 条 mark** 齐、`loadMs 1148`（≤3.5 s）、`chars 980015`、0 控制台错误。与交付方读数一致（`.tmp/r56-a3-dirty.impl.json`、`.tmp/r56-a3-load.impl.json`）。

## 4 回归（A/B：改前 `App.tsx` 同样结果）

- `scripts/save-acceptance.mjs` **24/25**：唯一 FAIL「提示含「已保存」与文件名」——脚本期「示例 · 未命名.md」，`reset.mjs` 清掉工作区后实际「已保存 未命名.md」。
- `scripts/keyboard-acceptance.mjs` **51/52**：唯一 FAIL「Ctrl+Shift+S 不出现新的已保存/已取消提示」。
- 两条在改前 `App.tsx` 上**同样失败、同一条**（`.tmp/r56-tester-ab-{save,keyboard}.log`），属既有脚本过期/时序，不是本轮回归。跑完已 `git checkout -- shots/round-04 shots/round-05` 还原。

## 5 UNVERIFIED

- 真实 FSA/磁盘保存字节（A1 用打桩 `showSaveFilePicker` 收内存串；A3 同）。
- 真实中文 IME 逐键（性能用合成键盘输入）。
- 100 KB / 1 MB 逐键 p95 的跨窗口可比性：不同浏览器窗口基线不同（finder 9225 为 66 / 252，本机 9222 为 50 / 234），只有同窗口 A/B 可比。
- 宿主 WebView2 内的表现本轮未测。
