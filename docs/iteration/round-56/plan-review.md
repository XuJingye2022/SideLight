# 第 56 轮计划审查（critic，final）

判定：**REVISE**（1 条 P1 未落）。

核对（HEAD `882eb49`；462 条 / 297,656 B 与 plan 一致）：`inlineSyntax.ts:35-37`、`SettingsDialog.tsx:119`、`inlineSyntax.test.ts:100-108`、`themes.ts:24`、`styles.css:77`、`themes.test.ts:13-35`、`host/Program.cs:201-215/300-301/571-583`、`assetResolve.ts:31`、`App.tsx:977-981/989-1001` 相符。

## 上一版 6 条 P1：5 条已落

- P1-1 假绿：已修。5 条换 finder 复现串、删 `~a~与~b~`；按现码复推，5 条修前都红（`a ^ b 与 c^d` 现出 1 个 caretSup，finder 写盘 `a  ^b 与 c^d`）。
- P1-2 左邻不可达：已修。`start()` 只定位 + 连续段整段吃 + `tokens.at(-1)?.raw` 备选，与 marked 17 的 `p.call({lexer:this}, e, t)` 一致；验收加了 `a====b==c`。
- P1-4/P1-5/P1-6 已落：`themes.ts` 进文件表、`#736349` 复算 paper 4.798 / panel 4.541；砍单顺序写明；MimeMap 补 `.jpg/.webp` + `UnescapeDataString` 与 403/404 用例。
- **P1-3（A3 门槛）未落**，见下。

## P1-1（原 P1-3）A3 门槛仍不可达，且两条规则互相冲突

30% 达不到，计划自己的数就否掉它：sync 段可移除的只有 `serializeDocument` 10 ms（100 KB，loadMarks 2860→2870）+ 归一化/比较 ~2 ms，占 p95 66 ms 的 ~18%；1 MB 51 ms（11888→11939）+ ~4 ms，占 252 ms 的 ~22%。30% 要求 ≤46 / ≤176，差得远，浏览器 ±10% 噪声也盖不住。而「残值 ≥ 原绝对门槛（20 / 60 ms）→ 该尺寸只记基线」对两尺寸都成立（~54 / ~199），与同一句「不达相对目标则回滚」直接冲突：executor 按前半干 25 分钟后按后半必然回滚，B-116 又白干一轮（第 53 轮同型）。

修法（写进 plan，二选一）：

- (a) 删「降 ≥30%」与「不达相对目标则回滚」，验收改成可核对的事实：① `onUpdate` 同步段不再调 `serializeDocument`（`contentRef.current()` 现 :978，改后只留在 :3118 赋值与新增的 300 ms 回调两处）；② 实测 `keyHandler` p95 不劣于基线 +5%（100 KB ≤69、1 MB ≤265）；③ 新值记 `.tmp/r56-a3-perf.json` 并写 B-116 新基线。
- (b) 要留收益门槛就按可移除量定：`p95 降 ≥ 可移除量的 80%`（100 KB ≥10 ms→≤56、1 MB ≥44 ms→≤208），达不到才回滚。

附：1 MB 每停顿会在 300 ms 回调里多一次全文序列化 ~51 ms（derive 已花一次 `current.getMarkdown()`）；接受就写进 impl，否则写「复用同一份串」。

## P2（可顺手改）

1. A1「整段按字面吃」要返回完整 token：`{type:'text', raw:'====', text:'===='}`。只给 `raw` 会被解析侧当空文本吞掉；现有 `'====\n'`（`inlineSyntax.test.ts:102`）就是金丝雀，先看它变红再动手。
2. A2「读 `:root` / `[data-theme='dark']`」没有现成 helper：`cssThemeVars()`（`themes.test.ts:13-25`）只找 `html[data-theme='<id>'] {`；要么写「扩 helper 支持 `:root`/`dark`」，要么删这条子项（470 → 469 条）。
3. B1 的 `__asset` e2e 没写怎么打得到宿主：dev 页面在 5175、宿主在 47821，按计划不加 CORS 头，跨源 `fetch`/`<img>` 取不到状态与字节。要写「新开 tab 顶层导航到 `http://127.0.0.1:47821/__asset?path=…` 读 status+body」或「用 9333 的宿主 CDP」，否则 tester 15 分钟只能记 UNVERIFIED。

结论：改 A3 验收（P2 三条顺手改）即可放行，其余照 r1 执行。
