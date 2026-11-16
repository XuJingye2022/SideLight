# Mermaid 惰性加载：首屏 0 B，真实最小增量 **1,474,881 B** 落在新线 **1,800,000 / 2,000,000** 内

Typora 内置 Mermaid：`resources/Docs/Draw Diagrams With Markdown.md:42-64`，截图 `shots/typora/02-window-maximized.png`。Sidelight 现在把 ```` ```mermaid ```` 当普通代码块渲染（`language-mermaid`，`svg` 0 个、全程 0 个含 `mermaid` 的请求），用户要图只能自己截图。技术写作里流程图/时序图是刚需，所以这份 ADR 把「要不要上、怎么上」的体积事实量清楚，本轮**只量、第 36 轮实现**。

## 背景

- 首屏 gzip 预算内部 **310,000 B** / 硬线 **320,000 B**（2026-11-17 产品负责人放宽）；第 31 轮实测 284,761 B 是旧线下的历史数字。
- 安装包内部预算 **1,800,000 B**、硬线 **2,000,000 B**（2026-11-17 放宽）；当前发布资产 824,209 B（本机重建 824,595 B）。
- 引入 mermaid 属「加一个用户看得见的能力 + 改变安装包体积验收项」，按 `AGENTS.md:1` 必须回到产品负责人，不能由代理自行决定。

## 决定

**2026-11-17 接受，第 36 轮实现。** 产品负责人选了方案 1（放宽线，`docs/iteration/STATE.md:159`）；按新线档 1b **1,474,881 B 在内部预算内（余 325,119 B）**、档 2 **2,355,122 B 才破硬线**，因此接受、先按 Vite 真实 chunk 图实现、装完后重打包实测替换预估（+5% 复核）。新增运行时依赖 `mermaid` 属 `AGENTS.md` §4「不新增运行时依赖，除非省下的代码比依赖大」的**例外**：依据产品负责人 2026-11-17 批准（`docs/iteration/STATE.md:159`），体积取舍与实测已在本 ADR 记录。理由不是首屏（惰性加载后首屏 0 B），而是安装包：真实最小增量（主入口 + 它的静态依赖）把安装包从 824,595 B 推到 **1,474,881 B**。

当时给出的三个选项（历史记录，方案 1 已被选中）：

1. 放宽安装包硬线到 X B（X 与依据写进 `docs/iteration/STATE.md`）；
2. 只上「按图类型懒加载」的子集方案（先另做一次可行性实测：只留 flowchart + sequence，砍掉其余 diagram 的入口）；
3. 维持不做，`docs/typora-gap.md` 继续把 Mermaid 记为缺。

落地方案照 ADR-0012 的 KaTeX 惰性做法：`src/lib/mermaidLazy.ts`（别名/shim）+ `src/lib/mermaidRender.ts`（只做 `initialize({startOnLoad:false, securityLevel:'strict'})` + `render`），首屏 0 B，只在文档含 ```` ```mermaid ```` 时 `await import()`；导出 HTML 复用 KaTeX 导出等待的写法（`src/App.tsx:3831` 的 `await ensureKatex()`）。渲染失败（未知语法）**降级为代码块 + 一句提示**，不抛错、不吞内容；Markdown 导出保留 fence 源码。

**第 36 轮待办**：落地那轮在 `README.md` 的依赖与体积处补一行理由与实测字节（`AGENTS.md` §4 的例外要求）。

## 实测（`.tmp/measure-mermaid.mjs`，gzip level 9，与 `scripts/measure-first-screen.mjs:42` 同参数）

命令：`npm pack mermaid@11.12.0 --pack-destination .tmp --cache .tmp/npm-cache` → 解包到 `.tmp/mermaid-pkg/` → `node .tmp/measure-mermaid.mjs`。包 14,365,637 B。

| 项 | 文件数 | raw | gzip |
| :--- | ---: | ---: | ---: |
| 主入口 `dist/mermaid.core.mjs`（`exports['.'].import`） | 1 | 43,725 | 10,733 |
| 主入口的静态依赖 `dist/chunks/mermaid.core/*.mjs` | 48 | 1,932,828 | 402,939 |
| 全部按需 chunk `dist/chunks/mermaid.esm.min/*.mjs` | 73 | 2,675,506 | 798,544 |
| 排除项 `*.mjs.map`（调试产物，不计） | 121 | 14,035,915 | — |

静态依赖那行是本轮实测新发现：`mermaid.core.mjs` 里有 48 条 `import "./chunks/mermaid.core/…"`。只看主入口文件会把真实增量低估 44 倍，所以下表给三档。

安装包预估公式：`824,595 B + 新增 raw × 0.329`。基数 824,595 B 与 0.329 同源，都出自 `round-32/findings-ship.md:17`（本机重建件 824,595 B / 载荷 2,510,153 B ≈ 32.9%）；GitHub Release 发布件 setup 824,209 B 只作对照。纯 JS 实压比 0.312（`372,705 / 1,192,820`，同文件）作对照行。

| 档 | 计入的 raw | gzip | 安装包预估 |
| :--- | ---: | ---: | ---: |
| 档 1 只算主入口文件 | 43,725 | 10,733 | 838,981 B（≤850,000，但超内部预算 18,981 B） |
| 档 1b 主入口 + 静态依赖（真实最小增量） | 1,976,553 | 413,672 | **1,474,881 B**（按旧线破硬线 850,000 共 624,881 B；按 2026-11-17 新线见决定节） |
| 档 2 再加全部按需 chunk | 4,652,059 | 1,212,216 | **2,355,122 B**（按旧线破硬线 850,000 共 1,505,122 B；按 2026-11-17 新线见决定节） |

口径说明：

- chunk 文件数按 `*.mjs` 计 = **73**（不是 146）；`readdir().filter(n => n.endsWith('.mjs'))` 已排除 `*.mjs.map`（73 个 map 共 10,441,081 B）。按 `*` 通配逐文件 gzip 会把 raw 从 2.68 MB 虚增到 13.1 MB、文件数变 146，raw/gzip/文件数三条全失真。
- 主入口量的是 `dist/mermaid.core.mjs`，**不是** UMD 全量包 `dist/mermaid.min.js`；后者与 bundlephobia 的 ESM 入口不是同一种东西。
- bundlephobia 的「主 chunk 539,838 B raw / 150,471 B gzip、43 个 asset / ≈770,559 B gzip」与本地 npm 包口径不同：bundlephobia 把入口和静态依赖打成一个包、asset 数按 bundler 切分；本地是 node 直接解包，主入口与 48 个静态依赖、73 个按需 chunk 分开。**文件数只作参考**。
- 未进表的 4 个外部依赖：`mermaid.core.mjs` 顶层 `import "ts-dedent" / "d3" / "stylis" / "dompurify"`。它们从 `node_modules` 解析，不在上面三个目录里，本轮未量（安装后由 Vite 打进 mermaid 的 chunk 组，实际增量只会比档 1b 更大）。finder 记的 20 个传递依赖里 cytoscape 435 KB、chevrotain 316 KB 也是同类未量项。

三条必须写清：

1. 首屏 0 B，但**打开含图文档**要多下 ≥402,939 B gzip（档 1b 实测 gzip；真正渲染一种图时再加对应按需 chunk）。
2. 安装包两档预估见上表：按旧线（850,000）都破线；按 2026-11-17 新线，档 1b 在内部预算内、档 2 破硬线。
3. 渲染失败（未知语法）降级为代码块 + 一句提示，不抛错、不吞内容。

## 否决的方案

- **静态引入 mermaid**：首屏 +402,939 B 起，直接破 310,000 B 内部预算（+402,939 B gzip，约 1.3 倍）。
- **只按上表档 1 口径写结论**：会得出「只超内部预算 18,981 B、没破硬线」的假象；真实增量是主入口 + 48 个静态依赖，低估 44 倍。
- **用 UMD 全量包 `dist/mermaid.min.js` 当主 chunk**：与 Vite 的 `import()` 解析路径不是同一个东西，比出来的数没有意义。
- **把 `*.mjs.map` 一起算进三档**：raw 虚增到 13.1 MB、文件数 146，三条口径全错。
- **本轮硬上 + 同时放宽安装包线**：属「对外承诺」范围，必须产品负责人定，计划里也写明超出第 32 轮范围。
- **只按图类型懒加载但入口仍旧静态引**：`mermaid.core.mjs` 与它的 48 条静态 import 仍在入口 chunk 组里，d3/dompurify 也仍会进包，收益只是把 diagram chunk 推迟。

## 未验

- mermaid **真装进 `dist`** 后重打一次 Windows 安装包的实际字节（本轮只在包外用 npm 包量，未改 `package.json`、未跑 `npm install`）。再评估时必须实测并用新包字节替换上表预估。
- 4 个外部依赖（`ts-dedent` / `d3` / `stylis` / `dompurify`）与 20 个传递依赖打进 Vite chunk 组的真实字节。
- 渲染性能（编辑器滚动重排）、43–73 个请求的加载瀑布、WebView2 宿主里的真实表现。
- 未知语法渲染失败时的降级文案与「不吞内容」的实际行为（本轮没实现，无法验）。

## 状态

2026-11-17 接受（第 36 轮实施）。再评估触发条件：① 字体子集化（`round-32/findings-ship.md:59-66`，粗估省 80–120 KB）落地后重算；② 首屏或安装包预算被产品负责人调整；③ 拿到「只留 flowchart + sequence」子集方案的实测数字。届时用真安装包字节替换本 ADR 的预估表。
