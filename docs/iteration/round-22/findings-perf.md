# 第 22 轮侦察 · 性能第二批（perf）

日期：2026-11-16 11:41–11:56。仓库 `D:\Documents\SidelightProgram`，HEAD `584d5e7`（v0.30.4），finder 只读：未改 `src/`、`host/`、`host-mac/`，未跑 `npm run build`。

环境：Windows 11、Edge 157.0.4341.46（CDP `9226`，每个用例独立 `browser.newContext()`）。**主数据用 dist**：`dist` 由本轮其他环节在 11:41:23 构建（同一 HEAD），用 `npx vite preview --port 4180` 起在 `http://localhost:4180`；dev `http://localhost:5173` 只做交叉核对，源码级函数名在 dev 上取。

取证脚本（都在 `.tmp/r22-perf/`，不在产品代码里）：`typing.mjs`（100 KB/1 MB 逐键、方向键对照、长任务）、`attr.mjs`（经 React fiber 拿到 Tiptap Editor，包 `getMarkdown` 计次计时；dev 上再单独量 `serializeDocument` 修复链）、`attr2.mjs`（CDP CPU profile）、`cachegm.mjs`（把 `getMarkdown` 换成缓存常量再测，作为「序列化成本≈0」对照）、`variant.mjs`（样本形状对照：单换行 vs 空行分段）、`one1m.mjs`（1 MB 首键/第二键/分段载入）、`mem.mjs`（1 MB 载入/滚动/保存/开关堆）、`confirm.mjs`（复跑）。原始 JSON 同名，日志 `*.log`。

样本：`# 长文性能样本` + 重复中文行。旧样本每行只隔一个 `\n`（Markdown 软换行），整篇只解析出 **2 个块、一个 102,396 字符的文本节点**；新样本每行隔空行（`\n\n`），100 KB = 3,658 块，1 MB = 37,450 块。正文不含公式、批注、表格。两个样本的总字符数相同，只有块结构不同。

## P1（P0）真实分段的 1 MB 载入 54.2 s；单段落 1 MB 第二键 >25 s——第 21 轮的「1 MB 载入 372 ms」是样本假象

- 证据（dist，`one1m-dist.json` / `variant-dist.json` / `mem-dist.json`）：
  - 1 MB 空行分段（37,450 块，973,676 字符）：**载入 54,227 ms**（180 s 上限内完成），复跑 **53,119 ms**（`confirm-dist.json`）。载入后逐键 121.7 / 101.7 ms。
  - 1 MB 旧样本（2 块）：载入 374 ms；第一键 317 ms（与第 21 轮 306–340 ms 一致）；**第二键 25,004.7 ms 脚本上限超时**（>25 s；第 21 轮上限是 12 s）。超时后主线程仍忙：`page.evaluate(() => 1)` 回包 **3,538 ms**。
  - 规模：100 KB→1 MB，分段样本载入 624/644 ms→54,227/53,119 ms（体积 ×10，耗时 **×82–87**）；单段落样本 194→374 ms（×1.9）。分段文档的 1 MB 载入是超线性热点。
- 影响：1 MB 真实长文（约 2 万个自然段）打开要等近一分钟，期间没有进度提示，用户会以为卡死；1 MB 单段落文档能载入、能保存（24 ms），但第二键起冻结 ≥25 s——仍是「能载入不能写」。第 21 轮 P5 的「1 MB 载入 372–373 ms」只对单段落样本成立，**不要当预算**。
- 成本：**M–L**。分段样本载入慢、载入后逐键只有约 100 ms，说明慢不在序列化，而在 markdown→ProseMirror→37k 块首次建 DOM。要分块渲染/虚拟化或给长文载入加进度与取消，牵涉编辑器内核（Tiptap），先出方案 ADR。

## P2（P1）100 KB 逐键 p95 未改善（153.8–167.4 ms），但热点不是全文序列化，而是「整篇一个 100 KB 文本节点」的每键重排

- 证据（dist，`typing-dist.json` / `variant-dist.json` / `attr-dev.json` / `cachegm-dist.json` / `attr2-dev.json`）：
  - 旧样本（单换行，2 块）100 KB：20 键 p50 **153.8** ms、p95 **162.8** ms、载入 194 ms；另一轮 3×15 键 p95 **161 / 167.4 / 238.2 ms**；dev 12 键 p50 159.3、p95 165.3 ms。旧值 155–171 ms，**同区间，没有改善**（属实测复现，不是回退）。
  - 同样 100 KB、只把分隔符从 `\n` 换成 `\n\n`（3,658 块）：20 键 p50 **9.7** ms、p95 **12.4** ms、载入 624 ms；复跑 15 键 p50 9.6、p95 **15.0** ms、载入 644 ms（`confirm-dist.json`）。同一份文字，**11–13 倍差**。
  - 方向键 15 次（只触发 `onSelectionUpdate`，不改 DOM 文本）：p50 1.8 ms、p95 **4.0 ms** → `readBlocks`/`buildContext`/`extractOutline` 不是瓶颈。
  - `getMarkdown()`（每键 dirty 比较的入口）12 键被调 12 次，单次 **2.0–4.4 ms**（合计 34 ms）；`serializeDocument` 的修复链（repairMath/repairHtml/reuseTables/拼 frontmatter，dev 内联模块实测）**0.3–0.4 ms/次**。
  - 把 `getMarkdown` 在运行中换成返回缓存常量（序列化成本≈0）后，14 键 p95 **160.7 ms**（对照 162.8 ms）→ 全文序列化对每键只占 **约 2 ms（1.3%）**。
  - CDP CPU profile（dev，8 键，采样 100 µs）：`(program)` **1,283.6 ms**（原生：布局/绘制/事件），`jsxDEV` 112 ms，`nodesBetween` 4.1 ms、`collectMarkSpanTexts` 2.2 ms。JS 具名帧合计约 146 ms / 8 键 ≈ 18 ms/键（dev 构建含 `jsxDEV`），其余是浏览器原生时间。
- 归因：第 21 轮 P1/P2 的「每键全文序列化」主嫌**不成立**。文档只有一个 102 KB 文本节点时，每键改它都会让浏览器重排整段（约 3,000 个视觉行）；改成分段后只重排末段，p95 从 162.8 ms 降到 12.4–15.0 ms。方向键不触发文本重排，所以只有 4 ms。
- 影响：真实中文长文（空行分段）不是瓶颈，12.4–15.0 ms 已低于第 21 轮定的「100 KB <30 ms」。只有「整篇没有空行、被解析成一个巨型段落」的文档（从 PDF/网页整段粘贴、旧样本本身）仍每键卡 160 ms。第 21 轮的 P2 结论要按样本改写。
- 成本：**S**（改验收样本与 README 记录，不动代码）；真要修「单段落 100 KB 输入」是 **L**（要绕开浏览器对单个大文本节点的重排，牵涉编辑器内核，不建议本轮做）。

## P3（P2）关闭 1 MB 文档后堆回落到 +2.08 MB，不再逐轮增长；但不回到空文档基线

- 证据（dist，`mem-dist.json`，CDP `HeapProfiler.collectGarbage` 后 `Performance.getMetrics`；每轮用 localStorage 重新载入 1 MB）：

| 步骤 | JSHeapUsedSize | 相对 baseline |
| --- | --- | --- |
| baseline（示例文档，215 字符） | 5,415,068 B | — |
| open-1（载入 274 ms） | 9,376,228 B | +3.96 MB |
| closed-1（新建空文档） | 8,187,184 B | **+2.77 MB** |
| open-2（264 ms） | 9,388,808 B | +3.97 MB |
| closed-2 | 7,495,944 B | **+2.08 MB** |
| open-3（326 ms） | 9,388,552 B | +3.97 MB |
| closed-3 | 7,492,048 B | **+2.08 MB** |

- 1 MB 单段落载入 264–326 ms（第 21 轮 dist 372–373 ms）；滚动 50 次滚轮共 25,000 px：60 fps、frame p95 16.8 ms、>50 ms 帧 0、wheel p95 19.1 ms；保存（stub picker）24 ms、写入 1,048,576 B。滚动与保存都不是热点。
- 对比第 21 轮（dev+OPFS）：当时保留 +2.6/+2.88/+3.12 MB 且每轮 +0.24 MB；本轮保留稳定在 +2.08 MB、close-2→close-3 无增长，DOM 节点数 148（低于基线的 167），说明 DOM 已释放、留下的是字符串/快照类引用。方法不同（dist + localStorage），**不能算已修**；只能确认「关闭后仍多占约 2 MB，但本轮 3 次开关没有继续涨」。
- 成本：**S**（抓 2 次开/关的 heap snapshot 找保留者；验收 10 次开/关 <1 MB）。

## 未验证 / 边界

- 100 KB 分段样本的 p95 有两轮（12.4 / 15.0 ms，各 15–20 键），但都只在 dist；1 MB 分段样本载入有两轮（54,227 / 53,119 ms），载入后只敲了 2 键，未做 p95。
- 1 MB 分段载入 54.2 s 未拆分到 parse、`nodeFromJSON` 或首次挂 DOM 各占多少（需要打点；本轮只有总时长）。
- 保存用 stub `showSaveFilePicker`（内存写），不含真实磁盘/网络盘延迟。
- 第 21 轮「无保存基线 30.7 ms」的对照没有复现：代码里 `loadIntoEditor` 给空文档也写 `baselineRef`（`App.tsx:1625`），挂载后基线不会为 null，「无基线」不能跳过 dirty 比较；本轮的对照改成「缓存 getMarkdown」（见 P2），差值 2.1 ms。
- 未做 heap snapshot，因此 P3 的保留者仍未定位。

## 本轮最值得做的 3 件事

1. **先改性能验收样本，再谈修代码**：100 KB / 1 MB 一律用空行分段（本轮 100 KB p95 12.4 ms、1 MB 载入 54.2 s），另立「单段落超大文本」用例（本轮 160 ms / 第二键 >25 s）。把第 21 轮 P1/P2 的「每键全文序列化」目标撤掉——本轮实测序列化只占约 2–3 ms/键。**S**，直接影响后面所有性能结论。
2. **1 MB 真实长文载入 54 s 立项（P0）**：先打点定位 parse / schema / 首次 DOM 三段各占多少，再决定虚拟化或分块挂载；同时给 >100 KB 文档加可见载入进度与取消。**M–L**。
3. **关闭文档后的 +2.08 MB 保留**：抓 heap snapshot 对比 baseline/open/closed，找到整篇字符串或基线快照的引用；验收 10 次开/关后增长 <1 MB。**S**。
