# 第 56 轮实现（executor）

轮前 `startSha` `882eb49`；dev 5175 未重启；CDP 9222。未 commit、未改版本/`release/`。

## A1 B-119 行内定界符守卫（完成）

- `src/lib/inlineSyntax.ts:27-66`：`SyntaxSpec` 加 `literalRun`；三条 `whole` 加 flanking（开后 `(?![\s=])`/`(?![\s^])`/`(?![\s~])`，收尾前 `(?<!\s)`）；`=` 连续 ≥3、`^` 连续 ≥2 时整段按字面吃（`~` 不守，留给 `~~`）。
- `src/lib/inlineSyntax.ts:77-90`：tokenizer 先吃连续段，返回 `{type:'text',raw,text}`。
- `src/components/SettingsDialog.tsx:119`：「写回字节两种状态都一样」→「成对且不贴空白才解析」。
- `src/lib/inlineSyntax.test.ts:110-153`：5 条 finder 复现串，断言 mark 文本 + `roundTrip(source)===source`。
- 证据：修前 5 红 `.tmp/r56-a1-tests-red.log`（14 tests / 9 pass / 5 fail），修后同文件 14/14 绿。`.tmp/e2e-r56-a1-inline.mjs` → `.tmp/r56-a1-e2e.json`：8 例 × 开关两态，`offAllSame`/`onAllSame`/`onAllMarks`/`offNoMarks` 全 true、0 错误；开态写盘逐字节同源且 `.sl-eq`=0 覆盖 finder 6 例与 `a====b==c`、`== a ==`，`~a~ ~b~ 与 a ~ b 与 H~2~O` 的 `.sl-sub`=3，正向对照 `==高亮== 与 ^上标^ 与 H~2~O` 各 1。截图 `shots/round-56/a1-settings-hint.png`。
- 命令：`tsc --noEmit` 0；`roundtrip` 0；`verify` 0（gzip 297,719 B）。

## A3 B-116 逐键脏判定去全文序列化（完成；两档按残值记新基线）

改动 `src/App.tsx:973-1008`：同步段只置脏（`baselineRef!==null && !dirtyRef` → `dirtyRef=true; setDirty(true)`）；原 `:977-981` 的 `contentRef.current()` 比较移进 300 ms derive 回调（同一序列化，双向纠正）。

同一脚本 `.tmp/e2e-r56-finder-perf.mjs`（9222）读数：

| 尺寸 | 改前同机基线 p50/p95 | 残值 | 改后 p50/p95 |
| :--- | :--- | :--- | :--- |
| 100 KB | 42 / 50 | 38 / 40 | 38 / 39 |
| 1 MB | 226 / 229 | 148 / 248 | 148 / 159 |

- 对 plan 基线（66 / 252）：39（−41%，≤46）、159（−37%，≤176）都过。绝对值 `.tmp/r56-a3-perf.json`，基线/残值分记 `.tmp/r56-a3-baseline.json` / `.tmp/r56-a3-residual.json`。
- 残值 40 / 248 都 ≥ 原绝对门槛（20 / 60 ms）：按验收这两档不设绝对门槛，只记 B-116 新基线 = **100 KB p50 38 / p95 39；1 MB p50 148 / p95 159**。1 MB p95 抖动大；回调多一次全文序列化（~51 ms，不进逐键）。
- `.tmp/e2e-r56-a3-dirty.mjs` → `.tmp/r56-a3-dirty.json`：打字后 `.dirty` 2 ms 出现（≤300），撤销 333 ms 消失（≤800），脏时 Ctrl+S 写盘、干净时不写（「没有改动，未写入。」），0 错误。
- 1 MB 载入：`.tmp/e2e-r56-a3-load.mjs` → `.tmp/r56-a3-load.json`，980,015 字符从空白页载入，`sl-load-start`→`sl-sync-done` **1,158 ms**（≤3.5 s），5 mark 齐。plan 的 perf 脚本此项假阳（见踩坑 1）。

## 门禁

`tsc --noEmit` 0；`npm test` **37 文件 467 条全过**（`.tmp/r56-a1-a3-test.log`）；`roundtrip` 0（`.tmp/r56-a1-a3-roundtrip.log`）；`verify` 0，首屏 gzip 297,719 B（`.tmp/r56-a1-a3-verify.log`）。

## CHANGELOG 一行建议

- 修复：快捷行内语法打开后，`====`／`^^` 这类连续符号与空格旁的单侧符号不再被当成定界符改写正文；设置提示改成「成对且不贴空白才解析」。
- 优化：逐键不再做全文序列化（1 MB 逐键 p50 226→148 ms），脏标记改成停顿 300 ms 后与保存基线比对。

## 新踩坑

1. **perf 脚本 1 MB 载入读数假阳**：`waitForFunction` 等「末尾标记」，上一档 100 KB 文档里也有同一串 → 立即满足。测载入要从空白页载入并等 `sl-sync-done`。
2. **marked 17 行内扩展每轮拿「当前位置起的剩余串」调用**，`start()` 收到 `src.slice(1)`、返回下标 +1 才是候选位：`^` 锚点即当前位置，位置 0 左向断言恒真，flanking 只能做右侧。
3. **连续段守卫必须返回 `{type:'text',raw,text}`**：只给 `raw` 会被解析侧当空文本吞掉。
