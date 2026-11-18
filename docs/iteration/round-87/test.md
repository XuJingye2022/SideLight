# 第 87 轮独立验收（tester）：B-103 图片缩放

- 轮前 `startSha` `3920617`；只读 `round-87/plan.md`、`git diff`、`BACKLOG.md`（未读 `impl.md`、未用 executor 脚本）。
- CDP 9222–9226 无监听（沿用第 79 轮口径），真机走 ego 浏览器 CDP 54280 + dev `:5175`。
- 判定 **PASS**（A1 / A2 / A3 全部按验收标准独立复验）。

## 门禁

| 项 | 结果 |
| :--- | :--- |
| `npm test` | **52 文件 683 条 0 fail**（轮前 51/659）→ 达标 ≥52/≥673，`.tmp/r87-tester-npmtest.log` |
| `npm run verify` | PASS，首屏 gzip **307,292 B** ≤310,000（硬线余 12,708），`.tmp/r87-tester-verify.log` |
| `npm run roundtrip` | rich **7/9** + source **9/9**，firstSaveBlocked 1/9，与第 86 轮同基线（`05-html-block`、`08-inline-html` 均 `-0 +0`），`.tmp/r87-tester-roundtrip.log` |

## A1 宽度写回 + 解析放行

- `node --experimental-strip-types src/lib/imageWidth.test.ts` → **24/24 pass** exit 0（要求 ≥14）。用例逐条覆盖：合规/不合规值、`'320'` 可写、五负向（顺序 / `/>` / 单引号 / 无 width / 多属性）、`clamp('320')`+上下界+非整数、`imageWidthFromDrag('320',80)=400` 与 `('1990',80)=2000`、`manager.serialize` 两形、`escapeHtmlForParse` 正 5 负 3 组。
- 自写独立探针 `.tmp/r87-tester-probe.ts` → **7/7**（不复用交付单测：clamp / 拖拽换算 / 写回 / 严格解析 / 整行判定 / 转义放行 / `manager.serialize`，`.tmp/r87-tester-probe.ts` 输出见日志同命令）。关键值：`parseImageHtml` 五负向全 null、`isImageHtmlLine('  <img…>')`/`'> > <img…>'` true、`escapeHtmlForParse` 五前缀原样而 `前文<img>`/`` `x` <img> ``/老文档四形全 `&lt;img`。
- 静态：`git grep -c renderMarkdown -- src/lib/assetImage.ts` → **2**（1 处方法 + 1 行注释；≥1 落地，与验收写的「0→1」相差 1 行注释，不判失败）；`git grep -c isImageHtmlLine -- src/lib` → **2**（`inlineHtmlTags.ts` 的 import + 使用；新文件未跟踪，`git grep` 默认不计未跟踪文件）。

## A2 拖拽改宽（真机）

自写 `.tmp/r87-tester-e2e.mjs`（假 FSA 工作区、svg 数据图 360×140）：**21/21 PASS**、0 pageerror、0 脚本错误，`.tmp/r87-tester-e2e.json`、`.tmp/r87-tester-e2e.log`。

1. 点图：`.sl-image.is-selected` 1、可见 handle 恰 **1**；拖 +80px → `img[width]`=`"442"`（∈[40,2000]），`Ctrl+S` 该行 `<img src="assets/a.png" alt="a" width="442">` 匹配 `^<img src="assets/a\.png" alt="[^"]*" width="\d+">$`，另一张仍 `![b](assets/b.png)`。
2. 重开（切走再切回、从盘重解析）：`img[width]`=442、渲染宽 442（差 **0px**）；再 `Ctrl+S` 逐字节同。
3. 双击手柄：`img[width]` 消失，保存回 `![a](assets/a.png)`，**逐字节等于改前原文**（`# 图\n\n![a](assets/a.png)\n\n![b](assets/b.png)\n`）。
4. 嵌套（H1）：列表内 `  <img src="assets/a.png" alt="a" width="320">`、引用内 `> <img src="assets/b.png" alt="b" width="200">` 两行均规范形；重开仍 2 个图片节点且宽 320/200，再存字节稳定。
5. 几何（H5）：`.sl-image` 高 142/142、126/126（= img 高，差 0）。
6. 老文档（H2）：无 width / 单引号 / `/>` / 顺序不同四行打开全字面、`.sl-image` 0，`Ctrl+S` 逐字节不变。
- 附带回归（`inlineHtmlTags`/`html` 改动面）：`<kbd>Ctrl</kbd>` 仍 1 个真标签、行内夹 `<img>` 仍字面、该文保存逐字节不变。

## A3 文档计数

- `node .tmp/r58-docs-check.mjs` → `headHave 40 = haveCount 40`、`headMiss 5 = missCount 5`、子节 2/1/2 declared=actual、`missRowSum 5`，exit 0。
- grep 对照（改前有 → 改后）：`当前已有 39 项，缺 6 项`（README）**0 命中/exit 1**、新句 `当前已有 40 项，缺 5 项` **1 命中/exit 0**；`39 项有、6 项缺`（AGENTS）**0/exit 1**、`40 项有、5 项缺` **1/exit 0**；`| B-103 | open`（BACKLOG）**0/exit 1**；`建议的下一批` 段内「图片缩放」**0**（脚本按段落截取计数）。

## 偏差 / 备注

- `renderMarkdown` 静态计数 2 而非验收字面的 1：多出的一行是 `assetImage.ts:25` 的注释，功能方法在 `:30`，不判失败。
- 计划 §2 残余未扩测（顶层 4 空格缩进的规范形行会被当图片、1–3 空格顶层缩进保存会去缩进）：`impl.md` 已记为已知限制，不属于本轮验收条目。
- UNVERIFIED：无（A2 六条含真机；A1/A3 有机读证据）。原生打印/宿主 WebView2 与本任务无关，未跑。
