# 第 91 轮独立验收（tester）

- 轮前 startSha `e9383d6`；dev `http://localhost:5175` HTTP 200（未重启）。CDP 9222–9226 无监听；ego 浏览器实际 CDP **57270**（`ego-doctor` 的 `browser.json` 端口；任务书的 54280 无监听）。
- 未读 `impl.md`；只按本轮任务、`git diff`、BACKLOG 复验。结论：**PASS**。

## 门禁

- `npm run verify` **PASS**：首屏 gzip **309,804 B**（内部 310,000 余 196 B；硬线 320,000 余 10,196 B），入口 `assets/index-8tmpTDnZ.js` 300,009 B。日志 `.tmp/r91-tester-verify.log`。
- `npm test` **55 文件 727 条 0 fail**（基线 55/727）。日志 `.tmp/r91-test.log`。
- `npm run roundtrip`：rich 7/9、source 9/9、firstSaveBlocked 1/9；`docs/roundtrip-report.md` 无 diff（`07-math.md` 完全保真）。

## B1 行间公式块内编辑（用户 #2）

夹具 `lead` + `$$\nE=mc^2\n$$` + `tail`，OPFS 真实落盘。

1. **块内输入 + 实时预览 + 无浮层**：点块 → `.sl-math-block-input` 1 个且为 activeElement、value=`E=mc^2`、`.math-inline` 0；改 `E=mc^3` 后提交前预览 `.katex` 的 `annotation[encoding="application/x-tex"]`=`E=mc^3`。
2. **Ctrl+S 落盘**：磁盘文本 === 原文只把 `E=mc^2` 换成 `E=mc^3`（仍是 `$$\nE=mc^3\n$$`，其余字节不变）；`sl-parse-done` 4→4；保存后回成品（textarea 0）。
3. **Esc 还原**：输入 `ZZ` 后 Esc → latex 仍 `E=mc^3`、textarea 0、无浮层、`sl-parse-done` 4→4。
4. **↑/↓ 进块**：从 `lead` 末按 ↓ → textarea 聚焦；块首行 ↑ → 关闭且选区 `caret.text=lead`、`inMath=false`；块末行 ↓ → 选区落到 `tail` 段。
5. **`$$`+Enter→Esc 空块 0**：blocks 1→2（新块 latex 为空格）、textarea 聚焦、无浮层；Esc 后 blocks 回 1、textarea 0。
6. 全程 `.math-inline` 0；`src/components/MathInlineEditor.tsx` 已删除（diff）。

证据：`.tmp/e2e-r91-tester.mjs`，`.tmp/r91-tester-e2e.log`（**27/27**，前台连跑两次均 27/27）。

## B2 代码块语言标签与切换（用户 #3）

夹具 3 个围栏：```js / ```mermaid / ```（无语言）。

1. **chip 3 个**：文本 `js` / `mermaid` / `纯文本`，对应 `<select>` 值 `js`/`mermaid`/``。
2. **位置**：3 块逐个 `pre.contains(chip)=true`；chip 右边距 pre 右 9 px（867 ≤ 876）；chip.bottom 与首行文字 top 逐块相等（205.14/205.14、302.44/302.44、618.91/618.91），满足 ≤ 首行 top+1。
3. **先改上方文字再 js→ts**：`above`→`aboveX` 后 `selectOption('ts')` → chip `ts`、另两个不变、`sl-parse-done` 5→5；Ctrl+S 落盘 === 原文仅两处（above→aboveX、```js→```ts），另两个围栏逐字节不变。
4. **无语言→python**：选 python 后 chip 变 `python`，保存首行变 ```python（其余不变）。
5. **```js 往返逐字节不变**：独立文档加一段文字后保存，```js 围栏与语言逐字节与原文一致；roundtrip 门 07-math 等 7/9 不退化。
6. **代码块仍可编辑**：点首行、End、输 `Z` → `const a = 1Z`，Ctrl+Z 复原（NodeView 未挡正文）。

## 回归

- 行内公式（第 90 轮 A1）在共享控制器下仍可用：点开 `.sl-math-inline-input` 聚焦、`^2`+Enter 回渲染、`.math-inline` 0、`sl-parse-done` 不变（E2E 3 条）。
- 既有脚本 `scripts/keyboard-acceptance.mjs`（`SIDELIGHT_CDP=http://127.0.0.1:57270`、URL 5175）：**52/52、exit 0**（`shots/round-05/` 已 `git checkout --` 还原）。
- `roundtrip` 报告无 diff。

## 观察 / UNVERIFIED

- 首屏余量只剩 **196 B**（上轮 530 B）；下一轮加静态代码前先算体积。
- `package.json` 新列直接依赖 `@tiptap/extension-code-block@3.34.0`；它原就在 `node_modules`（StarterKit 传递依赖），`package-lock.json` 未改根依赖表。用 package.json+lock 副本 `npm ci --dry-run`（可写 cache）exit 0、无 sync 报错 → 不破 CI；锁文件根表未列该包属可选清理，不计回归。
- 真机只到 Edge（ego）页面；未验 WebView2 宿主、真实中文 IME、原生打印。
- 后台重跑一次出现焦点掉 `BODY` 的假失败（标签不在前台）；前台两次均 27/27，焦点掉 `BODY` 不计产品回归。
