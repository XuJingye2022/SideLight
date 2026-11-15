# 第 11 轮 · 发布视角发现（体积与构建）

日期 2026-11-16。基线 commit `4878030`（0.23.0），工作树 `7aeeb92` 只加文档。只读侦察：没有改 `src/`、`vite.config.ts`、`scripts/`。可复跑的实验都在 `.tmp/r11-ship/`。

## 结论（先给判定）

1. **首屏 gzip 实测 364,960 B → 281,471 B，省 83,489 B（22.9%）。** 口径见「首屏测量脚本」：`index.html` 引用的 JS/CSS 逐文件 gzip（level 9）求和，不看 Vite 日志。
2. **目标 271,360 B 用 alias 惰性化达不到：差 10,111 B（3.7%）。** 不是估算，是 `.tmp` 里按真实 alias + 动态 CSS 构建出来的产物。
3. 把导出 / 预览 / 公式就地编辑这三组按需代码全部换成空 stub（比真实拆分更狠的上限），首屏也只再降到 279,087 B，仍差 7,727 B。**265 KiB 需要第二个 100 KB 级的杠杆，不是本轮 alias 的事。**
4. alias 技术可行：spike 构建通过（123 模块），主 chunk 里 `ParseError` 出现 0 次，惰性 chunk 里 4 次。但 shim 必须实现 **`katex.render(latex, element)`（tiptap 用的是 DOM 渲染，不是 `renderToString`）**，这是最容易被漏掉的一条。
5. 建议：本轮验收线改成 **281,471 B（≈275 KiB）**，或把「≤265 KiB」拆成两轮（本轮 alias + 预取，下轮拆依赖）。ADR-0012 按实测写，不要写「接近达标」。

## 测量口径与基线

`node .tmp/r11-ship/measure.mjs dist`（gzip level 9，Node `zlib`）：

```text
assets/index-CiRTwjkA.js   raw=1,137,183  gzip=351,205
assets/index-BK1mdk8z.css  raw=   56,524  gzip= 13,755
首屏 raw=1,193,707  gzip=364,960（JS 351,205 + CSS 13,755）
KaTeX 字体 15 个 raw=213,664 B（不在首屏请求里）
目标 271,360 B：超出 93,600 B
```

- STATE 写 JS gzip 351,668：与脚本 level 9 的 351,205 差 463 B（0.13%），在 gzip 实现差异内；brief 的「约 365 KB」= 351.67 + 13.75，和脚本 364,960 对得上。**验收用脚本数，不用 Vite 日志数**：Vite 8（rolldown）同一文件报 `gzip: 355.82 kB`，比脚本高 1.3%，见「未验证」。
- 基线 dist 1,408,866 B / 18 文件；用未改配置重建到 `.tmp/r11-ship/base` 得 1,137,292 B JS（与 dist 差 109 B，哈希不同，噪声级），CSS 完全一致。

## S1（发布·体积）alias 惰性化实测 281,471 B，离 265 KiB 差 10,111 B；目标不可达

**证据。**

- spike 产物：`.tmp/r11-ship/lazy`（配置 `.tmp/r11-ship/vite.spike.config.mjs`，alias + 动态 CSS，其余等同 `vite.config.ts`）。
- 首屏实测：JS `index-uU8ZVwFL.js` raw 879,680 / gzip **275,189**；CSS `index-D_zDAJYe.css` raw 29,898 / gzip **6,282**；合计 **281,471 B**，较基线省 83,489 B。
- 移出首屏的那部分：`katex-BN_UgUnm.js` raw 259,046 / gzip 76,632；`katex-lxMheimU.css` raw 26,627 / gzip 7,365。首屏 JS 实际减少 76,016、CSS 减少 7,473；差额来自 shim 与拆包开销。**KaTeX 占基线首屏 83,489 B，即 22.9%，不是 100 KB 级。**
- 目标缺口：281,471 − 271,360 = **10,111 B**。占目标线 3.7%，占新体积 3.6%。即使只拿 JS 一项（275,189）去比 271,360，也超出 3,829 B，所以「CSS 不算」的解释也救不了目标。
- 二次拆分上限实验（`.tmp/r11-ship/vite.ondemand.config.mjs`，把 `lib/export.ts`、`PreviewPane`、`MathInlineEditor`、`MathDraftPreview` 全换成 stub）：首屏 **279,087 B**（JS 272,805 + CSS 6,282），只再省 2,384 B，仍差 7,727 B。**结论：靠「继续拆 UI」补不上 10 KB。**
- 组成参考（split 构建，Vite 日志 gzip）：tiptap+prosemirror 139.84 kB、react 65.86、app 45.24、other-vendor 16.15、marked 12.10、runtime 0.36。要再省 10 KB gzip，只能动前两项级别的依赖，不能靠拆模块。

**影响。** 如果计划把「≤265 KiB」写成验收项，本轮必然 FAIL。真正可交付的是「首屏少 83.5 KB（23%）」，这本身是 0.23.0 以来最大的一次首屏收益。

**建议。** 二选一，planner 决定：

- A（推荐）：验收线改成 281,471 B（≈275 KiB，留 1–2 KB 余量），265 KiB 作为下一轮目标；本轮交付 alias + 预取 + CSS 拆分。
- B：本轮只做 alias spike 不落产品，目标改成「≤285 KiB」，265 KiB 等换解析器/砍依赖那一轮。

**难度：** S（只需改计划里的数字与 ADR）。

## S2（构建）alias 只匹配 bare `katex`；真实模块用 `katex/dist/katex.mjs` 动态 import；TS 要补 ambient 声明

**证据。**

- `vite.config.ts` 现在没有 `resolve.alias`。方案：

  ```ts
  import { fileURLToPath } from 'node:url'
  // ...
  resolve: {
    alias: [{ find: /^katex$/, replacement: fileURLToPath(new URL('./src/lib/katexLazy.ts', import.meta.url)) }],
  },
  ```

  正则只命中裸 `katex`；`katex/dist/...` 不命中，这正是绕过 alias 的口子。
- spike 的 shim 用 `import('katex/dist/katex.mjs')`，Vite 构建成功并单独产出 259,046 B chunk；`node_modules/katex/package.json` 的 `exports["./*"] = "./*"` 允许该子路径。Node 直接跑也通（`.tmp/r11-ship/node-import-probe.mjs`）：`renderToString` 为 function，`ParseError` 为 function。
- TS 默认报错，实测：

  ```text
  probe.ts(4,31): error TS7016: Could not find a declaration file for module 'katex/dist/katex.mjs'.
  ```

  补 `src/katex-dist.d.ts`（或 `src/types/` 下同名文件，tsconfig `include: ["src"]` 已覆盖）：

  ```ts
  declare module 'katex/dist/katex.mjs' {
    export * from 'katex'
    export { default } from 'katex'
  }
  ```

  shim 里类型写成 `import type katex from 'katex'; type KatexModule = typeof katex`。`npx tsc -p .tmp/r11-ship/ts-probe --noEmit` 通过（exit 0）。
- tiptap 扩展 `node_modules/@tiptap/extension-mathematics/dist/index.js:139`（block）与 `:311`（inline）调的是 `katex.render(node.attrs.latex, element, katexOptions)`，**不是 `renderToString`**。shim 必须提供同签名的 `render`，否则 `src/App.tsx:638` 注册扩展后公式节点直接空白/报错。
- `katexOptions` 是 `undefined`，shim 直接透传即可。

**影响。** 这不是「把 import 换成动态」一行能完成的：`src/lib/export.ts:1`、`src/components/PreviewPane.tsx:2,18`、`src/components/MathInlineEditor.tsx:3,35`、`src/components/MathDraftPreview.tsx:2,18` 四处同步 API 都要处理；tiptap 扩展的 `render` 还要「先占位、模块到达后对同一 DOM 节点重放」。spike 的 `.tmp/r11-ship/katexLazy.ts` 给出了可用的最小实现（队列 + `Map<HTMLElement, {latex, options}>` + `isConnected` 过滤）。

**建议。** 按 spike 的 shim 落地，另加两条：

- 重放失败时手动补 `inline-math-error` / `block-math-error` 类（扩展的 `try/catch` 只在同步调用时生效，shim 占位不抛错，错误样式会丢）。
- 动态 import 失败时保留占位并暴露 `data-katex-error`，不要重试死循环。

**难度：** M。

## S3（构建）CSS 拆分：删 `main.tsx:6`；woff2 插件从「1 个 CSS」改成「2 个、按 @font-face 定位」

**证据。**

- `src/main.tsx:6` 静态 `import 'katex/dist/katex.min.css'`。删除后由 shim 在加载 KaTeX 时 `import('katex/dist/katex.min.css')`（spike 用相对路径绕过模拟 alias；真实方案删掉 main.tsx 那行后可直接用包内子路径）。
- 不改插件会硬失败，实测：

  ```text
  error during build:
  Error: [woff2-only] CSS 资产数为 2，期望 1
  ```

  配置：`.tmp/r11-ship/vite.orig-plugin.config.mjs`（alias + 空 CSS 替身，原插件）。脚本位置 `scripts/vite-woff2-only.mjs:115-119`。
- 改法（spike 的 `.tmp/r11-ship/woff2-spike.mjs` 已验证构建通过）：

  ```js
  const cssNames = Object.keys(bundle).filter((name) => name.endsWith('.css'))
  if (cssNames.length !== 2) {
    throw new Error(`[woff2-only] CSS 资产数为 ${cssNames.length}，期望 2`)
  }
  const cssName = cssNames.find((name) => {
    const candidate = bundle[name]
    const text = typeof candidate.source === 'string' ? candidate.source : new TextDecoder().decode(candidate.source)
    return text.includes('@font-face')
  })
  if (!cssName) throw new Error('[woff2-only] 找不到含 @font-face 的 CSS')
  ```

  其余 `checkFaces`、`DROPPED_FACES`、字体资产删除、URL 核对逻辑不动。spike 产物：`@font-face` 16 个、woff2 15 个 / 213,664 B，与当前 dist 一致，插件自检全过。
- 首屏 CSS gzip 13,755 → 6,282；KaTeX CSS 7,365 移入惰性资产。`index.html` 只引用主 CSS，没有 `modulepreload` 指向 KaTeX。

**字体会不会仍按需？** 会。`@font-face` 只在 KaTeX CSS 被注入后才存在；字体文件只在有公式文本使用对应 family 时才请求（现有 acceptance 3b 就是这个机制，`scripts/acceptance.mjs:85-99`）。惰性化**不改变** dist 里 15 个 woff2 的存在与体积，安装包不会因此变小。

**风险。** 如果 shim 在 CSS 生效前就重放公式，会先出现无样式 KaTeX HTML（行高、括号、上下标错位）。要求 `Promise.all([import(css), import(mjs)])` 之后再重放，或先给占位节点加 `visibility:hidden`，加载完成后去掉。

**难度：** S。

## S4（验证）首屏脚本口径、`math.test.ts` / `export.ts` / `acceptance.mjs` 的连带改动

**证据。**

- `src/lib/math.test.ts:4` 只 import `./math.ts`（纯函数），不碰 KaTeX；`node --experimental-strip-types` 也不读 Vite alias，**这个文件不受 alias 影响，不要改**。
- `src/lib/export.test.ts:90-108` 有四条断言 `<math` 的用例，走 `buildHtmlDocument` → `export.ts:135 katex.renderToString`。shim 未加载时 `renderToString` 返回 `''`，这四条会退化成 `math-fallback` 并失败。两种改法：
  1. 测试顶部 `before(async () => { await loadKatex() })`（`node:test` 的 `before`），`buildHtmlDocument` 保持同步——**改动最小，推荐**；
  2. 把 `buildHtmlDocument` 改 async，五处调用与 App 的 `exportAs` 全改。
- `src/App.tsx:2851` 的 `exportAs` 是同步回调，HTM 导出分支在 `buildHtmlDocument` 前要 `await loadKatex()`；`exportAs` 改成 async 不破坏调用方（导出按钮 handler 不 await 返回值）。否则用户在 KaTeX 未加载时导出，HTML 里公式会变成 `$latex$` fallback（有损但不崩）。
- `scripts/acceptance.mjs:53-56` 的货币用例前后都数 `.katex`，惰性后 `katexBefore/katexAfter` 都可能是 0，断言仍成立但失去意义；`:78-83` 点「公式」后只等 500 ms 就断言 `.katex` 数量 > 0，动态 chunk + CSS 的本地加载通常 < 500 ms，但这是竞态，CI 慢时会偶发；`:85-99` 的 `document.fonts` 同样要等 CSS 注入。建议改成 `waitForFunction(() => document.querySelector('.editor .katex'))` 与「等 CSS link/style 出现后再 `document.fonts.ready`」。
- `README.md:66` 的软线「JS 主 chunk ≤ 1,153,000 B（gzip 约 355 KB）」与 `README.md:68` 的「为什么不拆 KaTeX」必须改；`:73` 的「后面可按需加载」改成已完成。`vite.config.ts:26-32` 的注释也过时（「KaTeX 不能拆」「不设 manualChunks」）。

**建议。** 验收命令固定为：

```bash
npm run build
npm test
node .tmp/r11-ship/verify-first-screen.mjs .tmp/r11-ship/lazy --max 281471   # 落地后换成 dist
npm run acceptance
```

**难度：** S。

## S5（发布）成功是 0.24.0；失败回退与 ADR-0012；安装包预算

**证据。**

- `package.json:3` 当前 0.23.0。语义化：这是用户可见的启动性能改善（首屏少 83.5 KB），记 **0.24.0**（功能 +0.1.0）；没有破坏性变更。
- 安装包体积**不会**因惰性化下降：dist 原始 1,408,866 → spike 1,410,410 B（+1,544 B，文件数 18 → 20），因为 KaTeX chunk 259,046 + CSS 26,627 + 15 字体 213,664 仍全部在包里。当前安装包 810,456 B，硬线 850,000（余量 39,544）；按 dist 增量估安装包 +0.3–1.2 KB（未出包，未验证）。**别在 CHANGELOG 写「安装包更小」。**
- 便携 zip 同理：889,108 B 预计 ±1.5 KB。
- 失败条件：本轮验收线若是 271,360，则 FAIL。回退范围：`vite.config.ts`、`src/main.tsx`、新增 `src/lib/katexLazy.ts`、`src/katex-dist.d.ts`、`scripts/vite-woff2-only.mjs`、`README.md`、`CHANGELOG.md`、四个同步调用点（`export.ts`、`PreviewPane.tsx`、`MathInlineEditor.tsx`、`MathDraftPreview.tsx`）。回退后保持 0.23.0，不发版。
- ADR-0012 写法（失败/未达标时）：

  ```markdown
  # ADR-0012 KaTeX 惰性化未达 265 KiB，回退 alias

  ## 状态
  拒绝（reverted），2026-11-16

  ## 背景
  第 11 轮目标：首屏 JS+CSS gzip ≤ 271,360 B。第 10 轮基线 364,960 B（脚本 gzip level 9）。

  ## 实测
  - alias + 动态 import + CSS 拆分：首屏 281,471 B，省 83,489 B（22.9%）。
  - 目标差 10,111 B。把导出/预览/公式编辑全部移出首屏（stub 上限）也只到 279,087 B。
  - KaTeX 实际占首屏 83.5 KB，不是估算的约 100 KB；265 KiB 需要第二个杠杆。

  ## 决定
  回退本轮 alias 改动，0.23.0 不变。265 KiB 目标重新拆解：下一轮先砍首屏依赖（候选见第 11 轮 findings-ship 优化机会），再评估 KaTeX。

  ## 后果
  首屏仍为 364,960 B；KaTeX 字体 213,664 B 仍在安装包；`README.md:68` 的「不拆 KaTeX」继续有效。
  ```

  如果产品负责人接受 281,471 B，则 ADR 改为「接受 + 目标修订」并把 265 KiB 移到下一轮。
- 体积预算建议（写进计划门禁）：
  - 首屏 gzip 软线 **282,500 B**（本轮实测 281,471 + 1 KB 余量）；硬线 285,000 B。
  - dist 总量 ≤ 1,415,000 B（当前 1,408,866，+1,544）。
  - 安装包 < 850,000 B 不变；本轮不跑打包，数字标「未验证」。

**难度：** S。

---

## alias 方案

### 落点

```ts
// vite.config.ts
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [{ find: /^katex$/, replacement: fileURLToPath(new URL('./src/lib/katexLazy.ts', import.meta.url)) }],
  },
  // 其余不变；建议同时把 build 注释里「KaTeX 不能拆」改掉
})
```

- `find` 用正则而不是字符串，避免将来 `katex/...` 被误伤；`^katex$` 只命中裸包名。
- `vite.config.ts` 改完 dev server 会自动重启；若页面报「模块没有导出」，按 AGENTS 的提醒手动重启，不要先改代码。

### shim 契约（`src/lib/katexLazy.ts`）

spike 的最小实现见 `.tmp/r11-ship/katexLazy.ts`，要点：

```ts
import type katex from 'katex'
type KatexModule = typeof katex
type KatexOptions = Parameters<KatexModule['render']>[2]

const pending = new Map<HTMLElement, { latex: string; options?: KatexOptions }>()
const listeners = new Set<() => void>()
let real: KatexModule | null = null
let loading: Promise<KatexModule> | null = null

export function loadKatex(): Promise<KatexModule> {
  if (real) return Promise.resolve(real)
  if (loading) return loading
  loading = Promise.all([import('katex/dist/katex.min.css'), import('katex/dist/katex.mjs')])
    .then(([, module]) => {
      real = module.default // 类型由 src/katex-dist.d.ts 声明
      for (const [element, job] of pending) {
        if (!element.isConnected) continue
        try { real.render(job.latex, element, job.options) }
        catch { element.textContent = job.latex }
      }
      pending.clear()
      for (const listener of listeners) listener()
      return real
    })
    .catch((error) => { loading = null; throw error })
  return loading
}

export function onKatexReady(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isKatexReady(): boolean { return real !== null }

function render(latex: string, element: HTMLElement, options?: KatexOptions): void {
  if (real) { real.render(latex, element, options); return }
  pending.set(element, { latex, options })
  element.textContent = latex   // 占位，不闪裸 LaTeX（也可用固定高度空 span）
  void loadKatex()
}

function renderToString(latex: string, options?: KatexOptions): string {
  if (real) return real.renderToString(latex, options)
  void loadKatex()
  return ''
}

export default { render, renderToString }
```

- 动态 import 写 `katex/dist/katex.mjs`，**不要**写 `katex`（会被 alias 再抓回 shim）。`katex/dist/katex.mjs` 依赖 `exports["./*"]`，katex 0.18.10 有；升级 katex 大版本时要复查。
- 相对路径 `../../node_modules/katex/dist/katex.mjs` 也能跑（spike 的 CSS 就是这么绕的），但把 node_modules 布局写死，不如包内子路径。
- TS 必须有 `src/katex-dist.d.ts` 的 ambient 声明，否则 `npm run build` 的 `tsc --noEmit` 报 TS7016（已实测）。
- 四类调用方：
  - tiptap `render`：队列 + DOM 重放，见上。
  - `PreviewPane` / `MathInlineEditor` / `MathDraftPreview`：`onKatexReady` 订阅后 `setState` 重画；不要用轮询。
  - `export.ts`：`exportAs` 里 `await loadKatex()` 后再 `buildHtmlDocument`；测试用 `before` 预载。
  - `MathInlineEditor` 的即时预览：占位期返回空，加载后重画；不要在未加载时把 `$latex$` 塞进 `dangerouslySetInnerHTML`（会闪裸公式）。
- 失败回退：`import()` reject 时 `loading = null`，保留占位；UI 给一次可见错误（导出走 `$latex$` fallback）。不要无限重试。

### 预取

- 时机：Tiptap 文档就绪后扫 `editor.state.doc` 里有没有 `inlineMath` / `blockMath` 节点，有才 `loadKatex()`；不要扫源码里的 `$`（`$5 到 $10` 会误触发，`.tmp` 的 `math.test.ts` 用例就是这批）。
- 目的：让「打开含公式的文档」在首帧后很快拿到 KaTeX，避免用户滚动到公式才拉 259 KB。没有公式的文档（大多数）完全不下载 KaTeX。

### 更稳的方案？

| 方案 | 结论 |
| :--- | :--- |
| `manualChunks` 把 katex 拆成 vendor chunk + 预取 | **不行**。静态 import 的 chunk 仍会在主 chunk 执行前被 ESM 拉取，首屏字节不减；`vite.config.ts:31` 的「不设 manualChunks」仍然成立。 |
| 手动在 `index.html` 加 `<link rel=modulepreload>` | 只是把请求提前，字节不会少，反而更早占带宽。 |
| vendor 两个数学 NodeView 进 `src/`，去掉 `@tiptap/extension-mathematics` | 更稳的长期方案：没有 alias 魔法，渲染完全可控；但要复制它的 markdown tokenizer（`$$` 块规则）与 node 定义，约 100–150 行，且升级 tiptap 时要对表。体积上限收益约 3–4 KB gzip（扩展 raw 15,631 B），不解决 10 KB 缺口。 |
| 保留静态 import，只在 KaTeX 初始化前显示骨架 | 不减体积，不满足本轮目标。 |

**推荐的稳法**：alias + shim + 启动后「有数学节点才预取」+ 构建断言（主 chunk 不得含 `ParseError`）。比纯 alias 多一层保护，不加依赖，改动面可控。

---

## 首屏测量脚本

文件：`.tmp/r11-ship/verify-first-screen.mjs`（可直接复制成 `scripts/check-first-screen.mjs`）。

```bash
# 量任意构建产物；--max 触发失败，--baseline 打印差值
node .tmp/r11-ship/verify-first-screen.mjs .tmp/r11-ship/lazy --max 271360 --baseline 364960
```

实测输出（lazy spike）：

```text
构建目录 ...\.tmp\r11-ship\lazy
  首屏 assets/index-uU8ZVwFL.js  raw=879680  gzip=275189
  首屏 assets/index-D_zDAJYe.css  raw=29898  gzip=6282
首屏 JS gzip=275189  CSS gzip=6282  合计=281471
对比基线 364960：省 83489 B
惰性 chunk katex-BN_UgUnm.js raw=259046 gzip=76632
惰性 CSS   katex-lxMheimU.css raw=26627 gzip=7365
woff2 15 个 raw=213664
FAIL
  - 首屏 gzip 281471 B 超出上限 271360 B（差 10111）
```

断言（任意一条不满足 exit 1）：

1. `index.html` 里引用的 `assets/*.js|css` 都不含 `katex`（chunk、CSS、modulepreload 都查）。
2. 入口 JS 文本里没有 `ParseError`（KaTeX 引擎标记；app 自己的 `katex-error` 字符串不算）。
3. `assets/` 里恰好 1 个 `katex*.js`、1 个 `katex*.css`、15 个 woff2，并打印惰性资产体积。
4. 首屏 JS+CSS 的 gzip（level 9）合计 ≤ `--max`。

要点：

- 只认 `index.html` 实际引用的文件，**不数字体**（字体不是首屏字节；数了会重复计算安装包体积）。
- Vite 默认不产 manifest；如果要 manifest 口径，在 `build.manifest: true` 后读 `.vite/manifest.json` 的 `isEntry` + `imports`，逻辑同上。当前脚本不依赖 manifest，构建后即可跑。
- 不要用 Vite 日志的 `gzip:` 数：同一文件实测比 Node level 9 高 1.3%（rolldown/vite 8 的实现差异），会让「达标/不达标」的结论偏移约 3.5 KB。
- 这个脚本只证明「构建产物里 KaTeX 不在首屏」，不证明运行时没请求。运行时断言可再加：起静态服务 + CDP 取 `performance.getEntriesByType('resource')`，过滤 `katex`；本轮没跑（dev server 还是旧代码）。

---

## 优化机会（最多 3 条）

1. **KaTeX 字体 213,664 B 是安装包的第二大头，而惰性化不动它。** 15 个 woff2 的 lzma 比≈1.00，加 1 B 就是安装包 1 B；当前硬线余量 39,544 B。若要继续瘦安装包，下一步是字体子集/再删 face，不是拆 JS。证据：`vite-woff2-only.mjs` 的 A 档已删 4 个 face、字体 256,168 → 213,664 B；spike 产物字体数与 dist 相同。
2. **265 KiB 只能靠砍依赖，不能靠继续拆 UI。** stub 实验证明把导出/预览/公式编辑全移出首屏只省 2,384 B；组成里 tiptap 139.84 kB、react 65.86 kB、app 45.24 kB、marked 12.10 kB、other-vendor 16.15 kB（Vite gzip）。候选：vendor/替换 `@tiptap/extension-mathematics`（raw 15,631 B）、评估 `marked`（raw 40,110 B）是否可换更小的解析器。两项都要单独立项 + 往返测试。
3. **加载体验与度量：** 预取只在文档真有数学节点时触发（扫 doc，不扫 `$`）；占位用固定高度避免布局跳动；在含公式文档上量一次 FCP/LCP（宿主基线 FCP 304 ms）确认 259 KB 惰性 chunk 没有把首屏拖慢。验收脚本的 500 ms 等待要换成条件等待，否则 CI 会偶发。

## 未验证

- 安装包/便携 zip 增量：没有跑 `packaging/*.ps1`（finder 边界），只按 dist +1,544 B 估算。
- 运行时网络请求：没有用 CDP 9224 量构建产物（需要静态服务；dev server 5173 仍是 0.23.0 代码）。脚本断言的是构建产物，不是真实请求。
- 视觉闪动/布局偏移：惰性实现未落地，无法截图；风险与建议写在 S3。
- Vite 日志 gzip 与 Node level 9 的 1.3% 差异来源未深究；验收固定用脚本口径。
- `npm run build`、`npm test`、`npm run acceptance` 均未跑（按任务边界，本轮只侦察）。
