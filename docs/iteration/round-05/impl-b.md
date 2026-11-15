# 第 05 轮 · 实施报告 B（builder2）

执行人：builder2。T4（构建与文档）→ T5（字体裁剪），均完成；未 commit、未跑 `npm run build`、未碰 `src/**`、`host/**`、`packaging/**`。浏览器检查走 CDP 9224 的独立 `browser.newContext()`。

---

## T4 构建口径 + shot 参数 + 版本与文档 —— 完成（1 条验收受计划数字影响，见下）

### 改动

- `vite.config.ts`：加 `build.chunkSizeWarningLimit: 900`，注释写明「不拆 KaTeX：`@tiptap/extension-mathematics` 顶层静态 `import katex`，扩展首帧要注册；拆需惰性 shim + 删 CSS 静态 import + 改 woff2 插件 + 三处渲染异步化（独立 spike）」、**不设** `manualChunks`（桌面本地回环读盘零收益）、`cssCodeSplit`/`sourcemap` 保持默认。
- `scripts/shot.mjs`：加 `--out`（`node scripts/shot.mjs [url] [--out 路径]`），默认 `.tmp/shots/shot.png`，`mkdirSync(dirname(out), { recursive: true })`；用法写进文件头。默认截图不再覆盖 `shots/round-01/` 的历史证据。
- `package.json`：`"version": "0.18.0"`（`package-lock.json` 未动，等根代理 `npm install --package-lock-only`；lock 里仍是 0.17.0，不影响本轮）。
- `README.md`：「依赖与体积」加「为什么不拆 KaTeX」一段；体积段字体改 **213,664 B / 15 文件（另 1 个内联）**、产物合计 `[TBD]`；命令清单 `npm run shot` 注明默认写 `.tmp/shots/shot.png`；宿主层安装包/zip 字节与 SHA 改 `[TBD]`。
- `AGENTS.md`：§3 截图改成 `node scripts/shot.mjs --out shots/round-NN/x.png`；测试数改 `[TBD]`；§6 版本 0.17.0 → **0.18.0**、测试数 `[TBD]`。
- `docs/CHANGELOG.md`：加 `## 0.18.0 — 2026-11-15`（主题三档、键盘可达、HTML 导出 MathML 保留 TeX 源码/纯文本保留源码、构建口径、字体裁剪、体积与测试 `[TBD]`）。

### 门禁

```text
node -e "require('./package.json').version"        -> 0.18.0
node scripts/shot.mjs                              -> shot: .tmp/shots/shot.png（95,638 B）；git status 无 M shots/
node scripts/shot.mjs --out shots/round-05/t4-shot.png -> 生成（95,638 B）
Select-String vite.config.ts 'chunkSizeWarningLimit: 900' -> 1
Select-String README.md '为什么不拆 KaTeX'          -> 1
Select-String docs/CHANGELOG.md '## 0.18.0 — 2026-11-15' -> 1
npm test                                           -> exit 0
npx vite build --outDir .tmp/build-b               -> exit 0
```

**偏差（需要根代理定）**：计划写「主 chunk 840.6 KB，900 留 7% 余量」，但本机实测主 chunk **1,100–1,104 kB**（两次构建 1,100.31 / 1,103.58 kB，gzip 344–345 kB；`dist` 里现有 JS 1,098,175 B）。840.6 KB 应是旧口径/误记。按指示先设 900，实测仍打印 `Some chunks are larger than 900 kB after minification`；根代理决定改为 **1200**（留约 100 kB 余量），复跑 `npx vite build --outDir .tmp/build-b` 后 **0 warning**（主 chunk 1,103.58 kB）。

**tsc 偏差（不是本任务）**：`npx tsc --noEmit` 报 `src/App.tsx(2549,8): Property 'onShowShortcuts' is missing`。`src/**` 正在被 A 组改，不在我的文件边界内；`npm test`、`vite build` 都不受影响（build 不做类型检查）。

---

## T5 字体裁剪：删 4 个装饰 face —— 完成

### 改动

- `scripts/vite-woff2-only.mjs`
  - `EXPECTED_FACES` 20 → **16**；新增 `DROPPED_FACES`：`KaTeX_Caligraphic 700 normal`、`KaTeX_Fraktur 700 normal`、`KaTeX_SansSerif 700 normal`、`KaTeX_SansSerif 400 italic`。
  - 顺序改成：解析 face → **先**命中 `DROPPED_FACES` 的块整块删掉并记下其 woff2 URL → 其余照旧收窄成 woff2-only → **再** `checkFaces`（16 且不得含被删 face）→ 删 ttf/woff 与被删 face 的 woff2 → 断言被删 face 名不在 CSS、其 woff2 不在 bundle、CSS 不引用。
  - 被裁 face 数不等于 4 直接 throw；`KaTeX_Size3` 的内联 data URI 不动。
- `scripts/acceptance.mjs`：`fonts.faces === 20` → `=== 16`。
- `scripts/font-probe.mjs`（新）：CDP 9224 + 独立 `browser.newContext()`；用工具栏「插入 → 公式」逐条插入 10 个 Regular 族样本（`\mathcal`/`\mathfrak`/`\mathsf`/`\mathbf`/`\mathit`/`\sum`/`\int`/`pmatrix`/`\sqrt`/`\hat`），收集 woff2 请求与 `document.fonts`，分两段打印；任一被删 face 被请求即 exit 1。
- `README.md` 字体段见 T4。

### 门禁

```text
npx vite build --outDir .tmp/build-b
  -> woff2=15  woff=0  ttf=0  字体合计 213,664 B；@font-face=16；被删 face 名 0 命中
node scripts/font-probe.mjs
  PASS 被删 face 未请求（4 个装饰粗/斜体） — 请求 9 个 woff2
  PASS Regular 族仍加载（KaTeX_Main 400 normal 等） — loaded=20 katex=10/10
  woff2 requested: KaTeX_Caligraphic-Regular / KaTeX_Fraktur-Regular / KaTeX_Main-Bold /
                   KaTeX_Main-Italic / KaTeX_Main-Regular / KaTeX_Math-Italic /
                   KaTeX_SansSerif-Regular / KaTeX_Size1-Regular / KaTeX_Size3-Regular
  summary: 2/2 PASS  exit 0
npm test -> exit 0
```

- 被删的 4 个 face（Fraktur-Bold / Caligraphic-Bold / SansSerif-Bold / SansSerif-Italic）没有任何请求；Regular 全部保留且加载。
- 体积：字体 256,168 B / 19 文件 → **213,664 B / 15 文件**（省 42,504 B；另 1 个 face 内联）。`.tmp/build-b` 全量约 1.364–1.370 MB（测量时 A 组 `src` 仍在改，JS 随构建浮动；旧 `dist` 1,406,633 B，字体一项固定少 42,504 B）。只影响 dist 与安装包，不影响首屏（字体本就按需下载）。

---

## 遗留（根代理回填/决定）

1. **`[TBD]` 待回填**：README 打包产物体积、宿主层安装包/zip 字节与 SHA256；AGENTS §3/§6 的测试文件数与条数；CHANGELOG 0.18.0 的「体积与测试」一行。回填值取最终 `npm run build` 与重打的 zip/安装包实测。
2. `chunkSizeWarningLimit` 已按根代理决定改为 **1200**，构建 0 warning。
3. **tsc**：A 组 `src/App.tsx` 正在改，`onShowShortcuts` 缺 prop 导致 `npx tsc --noEmit` 非 0；不属本任务，需 A 组收口后重跑。
4. `package-lock.json` 仍是 0.17.0，等根代理 `npm install --package-lock-only`。
5. 未 commit；`Sidelight` 进程 0（本轮只在 CDP 9224 里开临时 context/page，`shot.mjs` 与 `font-probe.mjs` 结束都已关闭）。
