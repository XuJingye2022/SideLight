# Mermaid 惰性加载：首屏 0 B，第 36 轮实测安装包 **1,299,777 B**（预估 1,474,881 B），首屏 +2,200 B

Typora 内置 Mermaid：`resources/Docs/Draw Diagrams With Markdown.md:42-64`，截图 `shots/typora/02-window-maximized.png`。Sidelight 现在把 ```` ```mermaid ```` 当普通代码块渲染（`language-mermaid`，`svg` 0 个、全程 0 个含 `mermaid` 的请求），用户要图只能自己截图。技术写作里流程图/时序图是刚需，所以这份 ADR 把「要不要上、怎么上」的体积事实量清楚，本轮**只量、第 36 轮实现**。**第 36 轮已落地，实测字节见文末「第 36 轮实测」节。**

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

**已接受并落地（第 36 轮，2026-11-17；实现文件 `src/lib/mermaidLazy.ts` / `mermaidLoader.ts` / `mermaidPreview.ts` + `src/mermaid-dist.d.ts`，实测见下节）。** 再评估触发条件：① 字体子集化（`round-32/findings-ship.md:59-66`，粗估省 80–120 KB）落地后重算；② 首屏或安装包预算被产品负责人调整；③ 拿到「只留 flowchart + sequence」子集方案的实测数字。

## 第 36 轮实测（用真字节替换上面的预估）

按本轮计划的门 A（单值判据 `assoc-dryrun ≤ 1,997,853 B` = 硬线 2,000,000 − dry-run 口径差 2,147）：

| 项 | 实测 | 说明 |
| :--- | ---: | :--- |
| `mermaid` 版本 | 11.12.0（`package.json` 精确锁定，不加 `^`） | 与上面量测同版本 |
| 安装后包体积 | `node_modules/mermaid` raw 66,020,674 B（含 121 个 `*.mjs.map`） | 只是磁盘占用，不进安装包 |
| `dist` 总量 | 31 文件 / 1,471,108 B → **97 文件 / 3,833,607 B**（+2,362,499 B raw） | `dist` 内 `*.js` 从 13 → **79**（`Get-ChildItem dist -Recurse -Filter *.js` 实测） |
| 其中 mermaid 入口 chunk | `mermaidLoader-CKf580Bv.js` 77,792 B raw / 27.51 kB gzip | 只被动态 `import()`，首屏不含 |
| 图类型 chunk（rollup 按动态 `import()` 全部收进 `dist`） | 66 个（79 − 基线 13），最大 `cytoscape.esm` 441.71 kB、`chunk-FPAJGGOC` 361.22 kB | 与档 2 的预估方向一致：rollup 确实把按需 chunk 全打进 `dist` |
| **安装包 dry-run** | **1,299,777 B**（`packaging/installer.ps1 -AssocDryRun`，同 dist 连跑两次逐字节相同） | 门 A 通过：≤ 1,997,853 B（余 698,076 B） |
| 正式包预估 | **1,297,630 B** = 1,299,777 − 2,147 | 未正式打包（UNVERIFIED，发版那轮实测） |
| 内部线 1,800,000 差值 | `target=1800000 gap=-500,223` | **在内部预算内**，不是原预估的「贴近硬线」 |
| 首屏 gzip | 286,056 → **288,256 B**（+2,200 B） | `files=3`，首屏集合多出 `rolldown-runtime` 450 B gzip，不含 mermaid |
| `dist/index.html` 里的 `mermaid` | **0 命中**；`dist` 内 `*.map` **0 个** | 惰性 chunk 不进引用清单 |
| 首渲染时真实下载 | `mermaidLoader` + 对应图类型 chunk（E2E `## lazy-evidence`） | 流程图首屏额外下载 ≈ 27.5 kB gzip + 图类型 chunk |

为什么比预估好 175,104 B：预估公式是「raw × 0.329」，而 mermaid 的 66 个图类型 chunk 之间有大量重复的字符串/代码片段，LZMA 跨文件压缩率高，实际压缩比远好于 0.329。原预估方向没错（档 2 会破 2,000,000 是错的，实测连内部线都没破），但绝对值偏大。

**明写偏离原方案**（不改就等于宣称已完成）：

1. 原方案 `:21` 写「导出 HTML 复用 `ensureKatex()` 的写法」——**本轮未做**：HTML 导出与预览面板都不含图，只显示 fence 原文。原因：widget 是 ProseMirror 装饰，`getHTML()` 序列化文档树看不到它；要含图得在导出时按 fence 再渲染一次，属单独一轮（见 `plan.md` §8）。
2. 原方案的文件名是 `src/lib/mermaidRender.ts`——落地改成 `mermaidLoader.ts`（只做动态 import，与 `katexLoader.ts` 同型）+ `mermaidPreview.ts`（ProseMirror 插件）；渲染逻辑在 `mermaidLazy.ts`。
3. 原方案说「渲染失败降级为代码块 + 一句提示」——落地为：代码块原样保留（从不被改写），下面挂 `.mermaid-preview.is-error` 一句「图表没渲染出来，代码块内容仍是原文，可以继续编辑。」（E2E 已验证 `pre code` 文本逐字不变）。
4. 渲染完成的刷新**没有 dispatch 事务**：改为就地更新已挂上的 widget DOM。理由：装饰按 `key` 复用 DOM，dispatch 重建并不会换掉节点；就地更新少一次事务，也不进撤销栈、不触发批注映射。

已知限制（写进 README/CHANGELOG）

- HTML 导出、预览面板不含图（同上第 1 条）。
- 切换主题不重绘（`initialize()` 只跑一次，读 `html[data-theme]`）。
- 同一文档里两段相同代码各渲染一次（不做跨块共享，避免共用 DOM 节点错位）。
- dev server 下首次请求 mermaid 会触发 Vite 依赖重优化 + 整页 reload（dev-only，正式构建没有 optimizeDeps）。
