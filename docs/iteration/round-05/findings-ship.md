# 第 05 轮 · 体积、构建与优化 · 发现

只侦察，不改产品文件。基线 commit `11c3348`，版本 `0.17.0`，工作树干净。

本报告的所有字节数都是本机实测。构建数字来自 `.tmp/r5-ship/` 下的临时配置，配置复用真实 `vite.config.ts` 的插件与入口，只把 `katex` 换成替身；**没有跑 `npm run build`，没有改 `src/`**。复盘命令都在各条末尾。

## 本轮实测基线

| 项 | 值 | 取数方式 |
| :--- | ---: | :--- |
| `dist` 合计 | 1,406,633 B | `Get-ChildItem dist -Recurse -File` |
| 主 JS chunk | 1,098,175 B / **gzip 340,158 B** | `node .tmp/r5-ship/measure.mjs`（zlib level 6） |
| 主 CSS | 51,702 B / gzip 13,075 B | 同上 |
| KaTeX 字体 | 256,168 B / 19 个 woff2（第 20 个 face 是内联 data URI） | 同上 |
| 跟踪文件 | 335 个 / 14,201,556 B | `git ls-files` + `Get-Item` |
| `shots/` | **164 个 / 12,822,942 B（90.29%）** | 同上 |
| 公式真实加载的 face | 10 / 20（样本见 S4） | `.tmp/r5-ship/font-probe.mjs`（CDP 9224） |

`STATE.md:52` 与简报里的「`shots` 132 个 / 10.5 MB」已过期：第 4 轮新增 32 张图，现在是 **164 个 / 12.22 MB**。

---

## S1 首屏组成：KaTeX 占主 chunk 的 23.6%（raw）/ 22.6%（gzip）；只改三个组件不会让它离开主 chunk

**证据一：共有 5 个静态入口，第 5 个藏在 Tiptap 里。**

| # | 静态 import | 位置 | 谁拉进来 | 何时真正执行 |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `katex/dist/katex.min.css` | `src/main.tsx:6` | 入口 | 首屏（CSS） |
| 2 | `katex`（默认导出） | `src/components/PreviewPane.tsx:2` | `src/App.tsx:24`（静态） | 预览视图（`App.tsx:2217-2218`） |
| 3 | `katex` | `src/components/MathInlineEditor.tsx:3` | `src/App.tsx:21` | `mathEdit` 非空（`App.tsx:2401-2402`） |
| 4 | `katex` | `src/components/MathDraftPreview.tsx:2` | `src/App.tsx:20` | `mathDraft` 非空（`App.tsx:2397-2398`） |
| 5 | **`import katex from "katex"`** | **`node_modules/@tiptap/extension-mathematics/dist/index.js:2`** | **`src/App.tsx:11` `import { Mathematics }`** | 文档里出现 `inlineMath`/`blockMath` 节点时（`index.js:139`、`:311`） |

第 5 条是关键。`Mathematics` 在 `App.tsx:388` 静态注册，schema 必须在编辑器创建时就位，所以它的模块一定进主 chunk；它的顶层 `import katex` 也就一起进去。**第 3 轮 S5 写的「改 `PreviewPane` / `MathInlineEditor` / `MathDraftPreview` 三处 `await import('katex')`」按原样做，主 chunk 一个字节都不会少。** 本轮方案（下节）必须同时处理第 5 条。

**证据二：拆掉 katex 后的主 chunk 是实测值，不是折算。**

| 构建 | 主 JS raw | 主 JS gzip6 | katex chunk |
| :--- | ---: | ---: | ---: |
| 现状（`dist`） | 1,098,175 | 340,158 | 无 |
| 把 `katex` 与 katex CSS 都换成空实现（`.tmp/r5-ship/app-split/vite.config.mjs`） | 838,317 | 262,672 | 无 |
| 真实 `src` + 惰性 shim（`.tmp/r5-ship/app-split/vite.lazy.config.mjs`） | **840,612** | **263,656** | **259,046 / gzip 77,008** |

第三行就是拆分后的真实形态：katex 被 Rollup 挪进独立 chunk（`katex-BN_UgUnm.js`），主 chunk 只剩 840,612 B。shim 与 Vite 的 preload helper 合计约 2.3 KB raw、约 1 KB gzip。

**证据三：份额。** 259,046 / 1,098,175 = **23.6% raw**；77,008 / 340,158 = **22.6% gzip**。`node_modules/katex/dist/katex.min.js` 是 272,756 / 76,581 gzip，与本机打包结果（259,046 / 77,008）差 5%，因为 ESM 入口可 tree-shake 掉 CLI 与未用分支。**报体积时用 77,008，不要用 76,443（第 3 轮的估算偏低）。**

**证据四：拆分后的首屏。** 主 JS gzip 340,158 → **263,656（−22.5%）**。如果 CSS 也拆（S3），首屏合计 353,233 → **269,128（−23.8%）**。

⚠ **目标口径要对齐。** 简报写「≤265 KB」。按 zlib level 6 实测是 263,656 B，达标，余量 1.3 KB；但 Vite 构建日志里同一个 chunk 打的是 `gzip: 266.33 kB`（Vite 8 的压缩口径比 zlib-6 大约 1%）。**若验收人读构建日志，这条会差 1.3 KB 判不过。** 建议门禁固定用脚本量（`zlib.gzipSync(buf, {level:6})`），或把目标写成 ≤267,000 B。不要留一个两种量法结论相反的验收项。

**验证命令**

```powershell
node node_modules\vite\bin\vite.js build --config .tmp\r5-ship\app-split\vite.lazy.config.mjs
node -e "const fs=require('fs'),z=require('zlib');const b=fs.readFileSync('.tmp/r5-ship/app-split/out-lazy/assets/'+fs.readdirSync('.tmp/r5-ship/app-split/out-lazy/assets').find(n=>/^index-.*\.js$/.test(n)));console.log(b.length,z.gzipSync(b,{level:6}).length)"
```

---

## S2 拆分方案：`resolve.alias` 指到惰性 shim + 动态 `import()`；**`vite-woff2-only.mjs` 必须先改，否则构建直接失败**

**为什么必须走 shim，而不是在四个调用点各写一个 `await import`。** 第 5 个入口在 `node_modules` 里，不能改；它在 node view 里同步调用 `katex.render()`（`index.js:139`、`:311`）。唯一能同时覆盖五处的做法，是让 `katex` 这个**裸模块名**在构建时解析到一个本地惰性模块，再由它动态加载真 katex。

**改法（五个文件，均可逆）**

1. 新增 `src/lib/katexLazy.ts`（约 45 行）：

```ts
import type katexType from 'katex'

type Katex = typeof katexType
let katex: Katex | null = null
let loading: Promise<Katex | null> | null = null
const pending = new Map<HTMLElement, { latex: string; options?: unknown }>()
const listeners = new Set<() => void>()

export const isKatexReady = () => katex !== null
export const onKatexReady = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn))

export function loadKatex(): Promise<Katex | null> {
  if (katex) return Promise.resolve(katex)
  if (!loading) {
    loading = Promise.all([import('katex/dist/katex.mjs'), import('katex/dist/katex.min.css')])
      .then(([module]) => {
        katex = module.default
        for (const [element, call] of pending) katex.render(call.latex, element, call.options as never)
        pending.clear()
        for (const fn of listeners) fn()
        return katex
      })
      .catch(() => {
        // 失败不清空占位：下次再试，不让一次偶发失败变成永久坏状态
        loading = null
        return null
      })
  }
  return loading
}

function render(element: HTMLElement, latex: string, options?: unknown) {
  if (katex) return katex.render(latex, element, options as never)
  element.textContent = latex
  element.dataset.mathPending = '1'
  pending.set(element, { latex, options })
  void loadKatex()
}

function renderToString(latex: string, options?: unknown) {
  if (katex) return katex.renderToString(latex, options as never)
  void loadKatex()
  return latex
}

export default { render, renderToString }
```

2. `vite.config.ts` 加别名（`katex/dist/katex.mjs` 不匹配 `^katex$`，不会自我递归；katex 的 `exports["./*"]` 允许这个子路径）：

```ts
import { fileURLToPath } from 'node:url'
resolve: {
  alias: [{ find: /^katex$/, replacement: fileURLToPath(new URL('./src/lib/katexLazy.ts', import.meta.url)) }],
},
```

3. `src/main.tsx:6` **删掉** `import 'katex/dist/katex.min.css'`。这一行不删，动态 import 的 CSS 会被 Vite 合并回主 CSS。本机已实测这条副作用：构建日志出现 `[INEFFECTIVE_DYNAMIC_IMPORT] node_modules/katex/dist/katex.min.css is dynamically imported ... but also statically imported by src/main.tsx`。

4. `src/components/PreviewPane.tsx` 需要「加载完成后重画」：它的 `useMemo` 只依赖 `bodyHtml/frontmatter/footnotes`（第 32-35 行），katex 到货时不会自动重跑，预览会一直显示原始 LaTeX，直到用户改文档。

```tsx
const [ready, setReady] = useState(isKatexReady())
useEffect(() => {
  if (ready) return
  void loadKatex()
  return onKatexReady(() => setReady(true))
}, [ready])
const html = useMemo(() => /* 原逻辑 */, [bodyHtml, frontmatter, footnotes, ready])
```

`MathInlineEditor` 与 `MathDraftPreview` 每次按键都由 props 触发重渲染，不用改；加载完成前显示原文，可接受。

5. `scripts/vite-woff2-only.mjs`：**当前版本只要 CSS 资产不等于 1 个就 `throw`（第 85-92 行）**。CSS 一拆，产物里有 2 个 CSS，构建失败。本机复现（`.tmp/r5-ship/probe-split/`）：

```text
[plugin sidelight:woff2-only]
Error: [woff2-only] CSS 资产数为 2，期望 1
```

最小改法：把「恰好 1 个 CSS」换成「逐个 CSS 检查，没有 `@font-face` 的跳过」：

```js
const cssNames = Object.keys(bundle).filter((name) => name.endsWith('.css'))
if (cssNames.length === 0) throw new Error('[woff2-only] 没有 CSS 资产')
for (const cssName of cssNames) {
  const asset = bundle[cssName]
  if (asset.type !== 'asset') throw new Error(`[woff2-only] ${cssName} 不是 asset`)
  let css = typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
  if (!/@font-face/.test(css)) { asset.source = css; continue }   // 应用样式，与字体无关
  let faceIndex = 0
  css = css.replace(FONT_FACE, (_w, body) => `@font-face{${rewriteFace(body, faceIndex++)}}`)
  checkFaces(css)                                                   // 只对含字体的一份查 20 个 face
  asset.source = css
}
// 删 ttf/woff 与校验 woff2 引用的两段保持原样，放在循环外
```

**预取策略（文档加载后扫 `$`）。** 打开文件、载入示例、从源码写回这三条路径的末尾各加一句即可，不要扫全文两次：

```ts
if (/\$[^$\n]+\$/.test(markdown)) requestIdleCallback(() => void loadKatex())
```

- 命中才加载：没有公式的文档首屏不多读 259 KB。
- 用 `requestIdleCallback` 而不是立刻 `import()`，把首屏解析让给编辑器。
- 预览视图切换（`App.tsx:2217`）也应 `void loadKatex()`，用户可能在点开预览前没触发输入。

**失败回退。**

- 加载失败：`loading = null`，原始 LaTeX 留在节点里，加 `data-math-pending` 供样式降级（灰底等宽），不弹 toast——公式是内容的一部分，不该打断写作。
- CSS 失败但 JS 成功：KaTeX 用回退字体渲染，字形不完美但公式结构正确，不报错。
- 重试：下一次 `render`/`renderToString` 自然再试一次，不需要重载页面。

**测试影响。**

| 项 | 影响 | 处置 |
| :--- | :--- | :--- |
| `src/lib/math.test.ts` | **无影响**：它只 import `./math.ts`（第 4 行），`math.ts` 不 import katex | 保持 `math.ts` 纯字符串、零 katex，`node --experimental-strip-types` 才能继续直接跑 |
| `scripts/acceptance.mjs:70` | `插入公式 → waitForTimeout(500) → 数 .editor .katex`，懒加载后可能数到 0 | 改成 `await page.waitForSelector('.editor .katex')` |
| `scripts/acceptance.mjs:82` | 断言 `faces === 20` | 动字体（S4）才需要改 |
| `scripts/shot.mjs:28,37` | 同样在插入后立刻数 `.katex` | 同上，等选择器 |
| `scripts/qa18.mjs:26`、`qa16.mjs:100-117` | 同类计数 | 同上 |
| dev server | 别名在 dev 也生效，第一次渲染公式多一次模块变换 | 可接受；若白屏按 AGENTS 第 3 节重启 dev |

**验证命令**

```powershell
# 1) 真实 src 的拆分构建（不写 dist）
node node_modules\vite\bin\vite.js build --outDir .tmp\build-ship
# 2) 产物应有 2 个 JS + 2 个 CSS，20 个 @font-face 仍在 katex 那份 CSS 里
Get-ChildItem .tmp\build-ship\assets -File | Where-Object {$_.Name -match '\.(js|css)$'} | Select-Object Name,Length
(Get-Content (Get-ChildItem .tmp\build-ship\assets\*.css | Sort-Object Length -Descending | Select-Object -First 1).FullName -Raw).Split('@font-face').Count - 1
# 3) 无公式文档不加载 katex：DevTools → Network 过滤 katex，打开一个不含 $ 的 md
```

---

## S3 构建配置：`chunkSizeWarningLimit: 900`；不要 `manualChunks`；sourcemap 已关；CSS 必须拆

**`chunkSizeWarningLimit` 该设 900。** 拆完 katex 后主 chunk 实测 **840,612 B**（840.6 kB）。Vite 默认 500 kB 会继续报警，而 840 kB 里已经没有可以再挪走的东西了（React 19 + Tiptap/ProseMirror 是首屏必需）。设 900 的理由：

- 比实测值高 59 kB（7%），正常增长不误报；
- 只有再引入一个至少 60 kB raw 的重依赖才会撞线，告警的原始作用（发现意外大 chunk）保留；
- 数字来自本机实测，可以写进注释，明年的人不用再猜。

```ts
build: {
  // 拆掉 KaTeX 后主 chunk 实测 840,612 B（round-05）。900 kB 留 7% 余量：
  // 再撞线只可能是新增大依赖，那正是这条告警该管的事。
  chunkSizeWarningLimit: 900,
},
```

**`manualChunks` 不值得。** 三条理由：

1. 这是桌面应用，`dist` 从本地磁盘读，拆 vendor 不省一个字节的传输，只多几个请求；
2. 首屏需要的包（React/Tiptap/ProseMirror）一个都少不了，拆出去仍要同步加载，`manualChunks` 只能把警告线糊过去——简报明确写了「不靠拆包掩盖」；
3. 多 chunk 会让 `vite-woff2-only.mjs` 的 CSS 假设与 `index.html` 的注入顺序更复杂，收益为零。

**sourcemap 已关，不要再动。** `vite.config.ts` 没有 `build.sourcemap`（Vite 生产默认 `false`），`dist` 里 `.map` 文件数为 0。这一条列进「已验证无需动作」。

**CSS 能拆，而且该拆。** 拆完 katex CSS 是独立 chunk：

| 项 | 现状 | 拆后 | 依据 |
| :--- | ---: | ---: | :--- |
| 主 CSS raw / gzip6 | 51,702 / 13,075 | 24,434 / 5,472 | 应用样式单独构建实测（`.tmp/r5-ship/app-split/vite.config.mjs`） |
| katex CSS raw / gzip6 | —（在主 CSS 里） | **27,268 / 7,603** | 51,702 − 24,434；13,075 − 5,472 |
| CSS 资产数 | 1 | 2 | `cssCodeSplit` 默认 `true`，不要显式关掉 |

前提是 S2 的第 3、5 步（删 `main.tsx:6`、改 woff2 插件）。做完后首屏 CSS gzip 从 13,075 降到 5,472（−58%），这是本轮除 KaTeX JS 之外第二大的首屏收益。

**已验证无收益、不要再试的一项。** `build.target: 'esnext'`（桌面 WebView2 是 Chromium 157，理论上可以抬高）实测主 chunk 仍是 840,612 B / 263,656 B gzip，一个字节都不差——Vite 8 的默认 target 对这份代码没有降级。别为它改配置。

**验证命令**

```powershell
# sourcemap 仍为 0
(Get-ChildItem dist -Recurse -File -Filter *.map | Measure-Object).Count
# 构建日志里不再有 >500 kB 警告，且主 chunk 在 900 kB 以内
node node_modules\vite\bin\vite.js build --outDir .tmp\build-ship 2>&1 | Select-String 'index-.*\.js|warning'
```

---

## S4 字体：4 个装饰族的粗/斜 face 共 **42,504 B** 可以砍；Regular 不要砍

**证据：哪些 face 真的会被下载（CDP 9224 实测，10 个公式样本）。** 脚本 `.tmp/r5-ship/font-probe.mjs` 在真实应用里逐条输入公式，记录 `document.fonts` 与 woff2 请求：

| 公式 | 新加载的 face | 文件 |
| :--- | :--- | :--- |
| `\mathfrak{A}` | KaTeX_Fraktur/400 | 11,316 |
| `\mathscr{F}` | KaTeX_Script/400 | 9,644 |
| `\texttt{abc}` | KaTeX_Typewriter/400 | 13,568 |
| `\mathsf{P}` | KaTeX_SansSerif/400 | 10,344 |
| `\mathcal{F}` | KaTeX_Caligraphic/400 | 6,908 |
| `\mathbb{R}` | **KaTeX_AMS/400（不是 Main！）** | 28,076 |
| `\sum x_i^2 + \frac{1}{2}` | KaTeX_Size1、KaTeX_Math/400 italic | 5,468 + 16,440 |
| `pmatrix` | KaTeX_Size3（内联 data URI） | 4,928 |
| `\checkmark`、`\left\langle` | 无新增（Size2/Size4 未触发） | — |

样本结束时 20 个 face 里 **加载 10 个，10 个未加载**：Main-Bold、Main-BoldItalic、Main-Italic、Math-BoldItalic、Fraktur-Bold、SansSerif-Bold、SansSerif-Italic、Caligraphic-Bold、Size2、Size4。

**结论一：`\mathbb` 走 AMS，不走 Main。** 文档里只要有一个 `\mathbb{R}`，AMS-Regular（28,076 B，单族最大）就会被下载。中文技术写作里 `\mathbb` 常见，**AMS 不能砍**。

**结论二：`\mathcal` 与 `\mathsf` 的 Regular 也别砍。** 它们分别真的加载 Caligraphic-Regular（6,908）与 SansSerif-Regular（10,344）。

**可砍清单（三档，按风险递增）**

| 档 | face | 字节 | 风险判断 |
| :--- | :--- | ---: | :--- |
| **A（建议做）** | Fraktur-Bold 11,348 + Caligraphic-Bold 6,912 + SansSerif-Bold 12,216 + SansSerif-Italic 12,028 | **42,504** | 只有 `\mathbf{\mathfrak{…}}`、`\boldsymbol{\mathsf{…}}` 一类嵌套才会用到，中文写作里等于零 |
| B（可选） | A + Fraktur-Regular 11,316 + Script-Regular 9,644 | **63,464** | `\mathfrak`、`\mathscr` 整个家族没了，公式会掉到系统字体，字形变正体，结构对、样子错 |
| C（不建议） | B + Typewriter-Regular 13,568 + SansSerif-Regular 10,344 | **87,376** | CS 作者会用 `\texttt`；`\mathsf` 在概率/统计里常见。删了是"省 24 KB 换一个错字形" |

**A 档实测占比：** 42,504 / 256,168 = 16.6%；`dist` 从 1,406,633 降到约 1,364,129（−3.0%），便携 zip / 安装包按 woff2 已压缩、LZMA 几乎原样传递估算 **−42 KB 左右**（安装包 829,472 → 约 787 KB）。

**注意收益性质：字体是按需下载的**（上表就是证据：只有用到的 face 才发请求）。所以砍字体**不改善首屏**，只减小安装包与 `dist`。想清楚这一点再决定值不值。

**删掉的风险（两条）**

1. **静默换字形。** 删除 face 后 KaTeX 仍输出 `font-family:KaTeX_Fraktur`，浏览器回退到系统字体，公式不报错、只是长得不对。用户不会收到任何提示。A 档选的都是"嵌套才用到"的，风险最低；B 档开始就会命中真实文档。
2. **两处耦合必须同步改，否则构建或验收直接红：**
   - `scripts/vite-woff2-only.mjs:12` `EXPECTED_FACES = 20` → A 档改 16；
   - `scripts/acceptance.mjs:82` `fonts.faces === 20` → 同步改 16；
   - 插件还需在 `checkFaces` 之后按 face 名删 `@font-face` 块与对应 woff2 资产（现在只删 ttf/woff，第 104-106 行）。

**验证方法（本次已跑通，可直接复用）**

```powershell
# 删之前先留基线
node .tmp\r5-ship\font-probe.mjs > .tmp\r5-ship\fonts-before.json
# 改完再跑一次，对比每步的 fresh 请求：
#   A 档应看不到 KaTeX_Fraktur-Bold / KaTeX_SansSerif-Bold / KaTeX_SansSerif-Italic / KaTeX_Caligraphic-Bold
#   用 A 档删掉的公式渲染后截图，肉眼确认与删前一致（本来就不该加载）
# 字体资产与 face 计数
(Get-ChildItem dist\assets\*.woff2 | Measure-Object Length -Sum)
(Get-Content (Get-ChildItem dist\assets\*.css).FullName -Raw).Split('@font-face').Count - 1
```

---

## S5 仓库重量与 `shot.mjs`：`shots` 已是 164 个 / 12.2 MB；43 个文件 3,135,810 B 可移出；`shot.mjs` 会覆盖第 1 轮证据

**证据一：两个数字都过期了。** `STATE.md:73` 写「132 个跟踪文件」，简报写「10.5 MB」。实测：

| 项 | 值 |
| :--- | ---: |
| 跟踪文件总数 | 335 个 / 14,201,556 B |
| `shots/` | **164 个 / 12,822,942 B（90.29%）** |
| 其中 `round-01` | 26 个 / 1,747,092 B |
| `round-02` | 47 个 / 3,956,372 B |
| `round-03` | 24 个 / 2,089,378 B |
| `round-04` | 32 个 / 2,331,335 B |
| `shots/` 根目录 | 35 个 |

**证据二：第 4 轮的 37 个零引用清单仍然有效，另有 6 个新增零引用。** 用「文件名在全部跟踪的 `.md/.mjs/.ps1/.ts/.tsx/.nsi/.txt/.yml/.json/.html/.css` 里出现与否」扫描（`.tmp/r5-ship/refs2.mjs`）：

| 集合 | 个数 | 字节 | 说明 |
| :--- | ---: | ---: | :--- |
| `docs/iteration/round-04/shots-untrack.txt` 的清单 | 37 | 2,752,935 | 37 个仍被跟踪；除 `findings-ship.md` 与清单本身外零引用 |
| 本轮新增「任何跟踪文本里一次都没出现」 | 6 | 382,875 | 全是 `shots/round-04/`：`ux-r4-15-after-toast` 99,898、`ux-r4-09-focus-ring` 89,521、`ux-r4-06-demo-save-error` 68,786、`r4-ime2` 46,587、`r4-workspace` 42,985、`ux-r4-14-folder-save` 35,098 |
| **可移出合计** | **43** | **3,135,810** | 占跟踪字节 22.08%，占 `shots` 24.45% |

（注意：37 个文件现在能在 `docs/iteration/round-04/` 里被搜到，因为清单与发现把它们列出来了。这是"记账"不是"引用"，移出不会让任何文档断链，但会让那两处列表指向不存在的文件。）

**证据三：`shot.mjs` 仍写死第 1 轮路径。** `scripts/shot.mjs:41` 是常量字符串，`npm run shot` 每跑一次就覆盖 `shots/round-01/t1-currency.png`。这个文件被 **6 份文档引用**：`AGENTS.md:42`、`docs/iteration/round-01/{plan,plan-review,impl-a,test}.md`、`round-02/test.md:239`、`round-03/test.md:167`、`round-04/findings-ship.md:118`。它已经被覆盖过至少两次（`round-01/test.md:147` 记 89,009 B，`round-03/test.md:167` 记 94,892 B，现在 95,601 B）。

**`shot.mjs` 最小改法（`--out` 参数，9 行）**

```js
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const out = outIndex >= 0 ? args[outIndex + 1] : 'shots/round-01/t1-currency.png'
const url = args.find((arg, i) => !arg.startsWith('--') && i !== outIndex + 1) ?? 'http://localhost:5173'

// 第 41 行
mkdirSync(dirname(out), { recursive: true })
await page.screenshot({ path: out })
```

用法：`node scripts/shot.mjs --out shots/round-05/t1-currency.png`（或 `npm run shot -- --out shots/round-05/t1-currency.png`）。保留默认值是为了不打断现有文档；把默认值改成「必填」会更好，但会动到 `AGENTS.md:42` 与 README 的说明，交给 planner 决定。

**执行移出的步骤（不破链接）**

```powershell
# 1) 把 43 个文件搬到 gitignore 的 .tmp/ 里留档（.gitignore:8 已忽略 .tmp/）
$list = @(Get-Content docs\iteration\round-04\shots-untrack.txt)
$list += 'shots/round-04/ux-r4-15-after-toast.png','shots/round-04/ux-r4-09-focus-ring.png',
          'shots/round-04/ux-r4-06-demo-save-error.png','shots/round-04/r4-ime2.png',
          'shots/round-04/r4-workspace.png','shots/round-04/ux-r4-14-folder-save.png'
New-Item -ItemType Directory .tmp\shots-archive -Force | Out-Null
foreach ($p in $list) {
  $dest = Join-Path .tmp\shots-archive (Split-Path $p -Leaf)
  Move-Item -LiteralPath $p -Destination $dest -Force
}
# 2) 从索引移除（历史仍保留，可用 git show <commit>:<path> 取回）
git rm --cached --quiet -- $list
# 3) 验证
git ls-files shots | Measure-Object -Line            # 应 164-43=121
git status --porcelain | Measure-Object -Line        # 应 43 行（全是 D；.tmp/ 被 .gitignore:8 忽略，不会出现 ??）
node .tmp\r5-ship\refs2.mjs                          # 「never mentioned」应为 0
```

**风险**

1. **断链：零。** 43 个都不在任何用户可见文档（README / CHANGELOG / ADR / GLOSSARY）里。唯一"变空"的是第 4 轮报告里的清单本身。
2. **历史体积不减。** `git rm --cached` 只清工作树索引，`.git` 里那 3 MB 仍在（当前 `git count-objects -vH`：496 个对象 / 12.58 MiB，全为松散对象，无 packfile）。真正瘦身要 `filter-repo`，本轮不做。
3. **移出后 `git add -A` 不会再加回来**（文件已不在工作树，且 `.tmp/` 被忽略）。若只做 `git rm --cached` 而不搬文件，文件会以未跟踪状态留在 `shots/`，下次 `git add -A` 又回来——**必须搬走或删掉**。
4. **不要顺手改 `.gitignore` 成 `shots/**`。** 那会把第 5 轮及以后的新截图也忽略掉，验收证据就进不了库。第 4 轮报告里的 `shots/**` + 3 条例外是「第二步（88 个）」的方案，本轮别做。

**验证命令**

```powershell
git ls-files shots | Measure-Object -Line
(Get-ChildItem shots -Recurse -File | Measure-Object Length -Sum).Sum
git count-objects -vH
```

---

## KaTeX 拆分方案（汇总，给 planner 直接抄）

**改动清单**

| # | 文件 | 改动 | 必须 |
| :---: | :--- | :--- | :---: |
| 1 | `src/lib/katexLazy.ts` | 新增：惰性加载 + 占位回填 + `onKatexReady` | ✅ |
| 2 | `vite.config.ts` | `resolve.alias` 把 `^katex$` 指向 1 | ✅ |
| 3 | `src/main.tsx:6` | 删掉静态 CSS import | ✅ |
| 4 | `scripts/vite-woff2-only.mjs` | 允许 2 个 CSS，只对含 `@font-face` 的那份查 20 个 face | ✅ |
| 5 | `src/components/PreviewPane.tsx` | `ready` 状态 + 加载后重画 | ✅ |
| 6 | `src/App.tsx` | 文档载入后按 `/\$[^$\n]+\$/` 预取；预览切换时预取 | 建议 |
| 7 | `scripts/acceptance.mjs`、`shot.mjs`、`qa18.mjs` | 等 `.editor .katex` 选择器，不用固定 500 ms | ✅（否则 flaky） |
| 8 | `vite.config.ts` | `chunkSizeWarningLimit: 900` | ✅ |

**不采用的两条路，理由要写进计划**

- **在四个调用点各写 `await import('katex')`**（第 3 轮的方案）：`@tiptap/extension-mathematics` 的静态 import 还在主 chunk 里，体积一个字节不降。
- **fork 一份自己的 math 节点**（约 120 行：schema、`parseHTML/renderHTML`、`markdownTokenizer`、输入规则、node view）：能彻底摆脱这个依赖，但 `$…$` 的 Markdown 往返、`data-type` 兼容、点击进编辑、`repairMath` 都在依赖现有行为，风险与工作量都不成比例。等上游把 katex 改成可选依赖再说。

**数字目标（实测口径，zlib level 6）**

| 项 | 现在 | 拆后 | 验收 |
| :--- | ---: | ---: | :--- |
| 主 JS raw | 1,098,175 | **约 841,000**（含 shim 与 preload helper） | `≤ 850,000` |
| 主 JS gzip | 340,158 | **263,656** | `≤ 265,000`（Vite 日志口径 266.33 kB，见 S1 的口径提醒） |
| 主 CSS gzip | 13,075 | **5,472** | `≤ 6,000` |
| 首屏合计 gzip | 353,233 | **269,128** | `≤ 272,000` |
| `dist` 合计 | 1,406,633 | 约 1,405,800（katex 换了个 chunk，总量几乎不变） | 不设 |

**分步验收（每步都能单独回滚）**

```powershell
# 步骤 1：只加 shim + alias，不改其他（此时 CSS 还没拆，Vite 会报 INEFFECTIVE_DYNAMIC_IMPORT，属预期）
node node_modules\vite\bin\vite.js build --outDir .tmp\build-step1
# 步骤 2：删 main.tsx:6 + 改 woff2 插件，CSS 变 2 份
node node_modules\vite\bin\vite.js build --outDir .tmp\build-step2
# 步骤 3：接入组件与预取，跑门禁
npx tsc --noEmit
npm test
node scripts/acceptance.mjs      # 需先起 dev + 无头浏览器
```

---

## 构建配置建议（汇总）

```ts
export default defineConfig({
  server: { /* 保持原样 */ },
  plugins: [react(), woff2Only()],
  resolve: {
    alias: [{ find: /^katex$/, replacement: fileURLToPath(new URL('./src/lib/katexLazy.ts', import.meta.url)) }],
  },
  build: {
    // 拆掉 KaTeX 后主 chunk 实测 840,612 B（round-05）。900 kB 留 7% 余量：
    // 再撞线只可能是新增大依赖，那正是这条告警该管的事。
    chunkSizeWarningLimit: 900,
    // 不要设 manualChunks：桌面应用从本地磁盘读，拆 vendor 零收益，只会掩盖告警。
    // 不要设 cssCodeSplit: false：KaTeX 的 CSS 必须能独立成 chunk。
    // sourcemap 保持默认 false（dist 里 .map 数为 0），不要再提。
  },
})
```

---

## 优化机会（3 条）

1. **三处 `katex.renderToString` 的 try/catch 重复。** `PreviewPane.tsx:16-23`、`MathInlineEditor.tsx:32-39`、`MathDraftPreview.tsx:16-22` 是同一段「失败返回空」的逻辑。拆包后每处还要各自处理「未加载」，三份会变成三套不一致的降级行为。**建议**：把渲染收进 `katexLazy.ts` 的 `renderToString`，组件只负责把结果放进 DOM。省约 20 行，也给失败回退一个唯一入口。

2. **HTML 导出丢公式（本轮顺带发现，不是体积问题）。** `App.tsx:1586-1592` 用 `editor.getHTML()` 做导出正文，而数学节点的 `renderHTML` 只输出 `data-latex` 属性、没有子节点（`@tiptap/extension-mathematics/dist/index.js:78-80`、`:259-261`），`export.ts` 里也没有补渲染。**按静态推断，导出的 HTML 里公式是空 `<span>`/`<div>`。** 未在浏览器里打开导出文件验证，验证方法：导出含 `$E=mc^2$` 的文档，`Select-String '<span data-type="inline-math"' 导出.html`，看标签内是否为空。修法是用同一套渲染（预览已有 `renderMath`），拆包后走惰性路径。

3. **17 个脚本写死截图路径。** `scripts/` 里 `acceptance.mjs`、`qa7/9–18`、`shot.mjs`、`host-smoke.mjs` 把输出写死到 `shots/` 固定名（`shot.mjs:41` 最典型）。第 4 轮已记「脚本重写已跟踪截图」造成 `git status` 噪声（`round-02/test.md:239`、`round-03/test.md:167`）。**建议**：本轮只给 `shot.mjs` 加 `--out`；下一轮抽一个 `scripts/shot-path.mjs` 的 `shot(page, name)`，默认落在 `shots/round-<当前轮>/`，把"新图覆盖旧证据"从习惯问题变成代码问题。

---

## 未验证项

- **真实 `src` 的拆分构建没有跑过**（只读侦察）。S1/S3 的 840,612 / 263,656 / 24,434 / 5,472 都来自 `.tmp/r5-ship/` 下「复用真实配置 + 别名替换 katex」的构建，不是改完仓库后的 `npm run build`。差异应在 ±2 KB 内。验证：按「KaTeX 拆分方案」的三步构建。
- **Vite 8 构建日志的 gzip 口径**比 zlib level 6 大 1%（`266.33 kB` vs `263,656 B`），原因没查。这不影响结论，但影响验收按哪个数判——建议门禁用脚本量。
- **导出 HTML 丢公式**是静态推断，没有真的打开导出文件看（见优化机会 2 的验证命令）。
- **A 档字体删除后的视觉回退**没有实测：按定义这些 face 本来不会被请求，但没有在"用户真的写了 `\mathbf{\mathfrak{…}}`"的文档上确认过。
- **`shots` 移出后能减多少对象体积**没有实测：`.git` 当前 496 个松散对象 / 12.58 MiB（`git count-objects -vH`），`git rm --cached` 不解包历史，`filter-repo` 不在本轮范围。

## 附：本轮证据文件（都在 `.tmp/r5-ship/`，可直接复用或删除）

| 路径 | 内容 |
| :--- | :--- |
| `measure.mjs` | `dist` / katex 包 / 字体的 raw 与 gzip6/gzip9 |
| `refs2.mjs` | 截图引用扫描（零引用、37 清单核对、跟踪字节占比） |
| `font-probe.mjs` | CDP 真机跑 10 个公式，记录 `document.fonts` 与 woff2 请求 |
| `probe-katex-js/` | 只打 katex 的产物：258,774 / 76,922 gzip |
| `probe-split/` | 动态 import katex JS + CSS 的产物；同时复现 woff2 插件的「CSS 资产数为 2」失败 |
| `app-split/vite.config.mjs` | 真实 `src` + katex 空实现：838,317 / 262,672 |
| `app-split/vite.lazy.config.mjs` | 真实 `src` + 惰性 shim：840,612 / 263,656，katex chunk 259,046 / 77,008 |
| `app-split/vite.esnext.config.mjs` | 证明 `target: 'esnext'` 零收益 |
