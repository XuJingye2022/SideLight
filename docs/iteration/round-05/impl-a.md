# 第 05 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T1 → T2 → T3（串行）。基线 `11c3348`。未 commit；未跑 `npm run build`（`npx tsc --noEmit` + `npx vite build --outDir .tmp/build-a`）；未装依赖。
边界：只改 `src/**`、`index.html`，新建 `scripts/keyboard-acceptance.mjs`、`scripts/theme-acceptance.mjs`、`scripts/export-math-acceptance.mjs`；未碰 `vite.config.ts`、`scripts/shot.mjs`、`scripts/vite-woff2-only.mjs`、`package.json`、README、CHANGELOG、AGENTS。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 键盘与焦点 | **PASS** | `keyboard-acceptance` 28/28：skip link 一次 Tab 进正文、`Ctrl+Alt+S` 另存 + `Ctrl+S` 复用句柄、`Ctrl+Shift+S` 不划线/不保存/无新提示、`Ctrl+Alt+N/O/Shift+O/E`、菜单方向键与焦点归还、`?` 一览与正文问号、纯键盘 E2E 导出 HTML |
| T2 主题三档 | **PASS** | `theme-acceptance` 16/16：三档即时预览与持久化、深色 `color-scheme=dark`、跟随系统+系统深色也 dark、reload 前 4 帧亮度 27/24/24/27（无白帧）、取消还原、内联脚本在模块脚本前 |
| T3 导出公式 | **PASS** | `export-math-acceptance` 10/10：HTML 含 `<math>` 与 `E=mc^2`、无空 `data-latex`、TXT 含 `$E=mc^2$` 与 `$$\frac{a}{b}$$`、文件名跟文档名；`export.test.ts` +6 条真实 fixture 单测 |

## T1 键盘与焦点（`src/App.tsx`、`FileMenu.tsx`、`useDialogFocus.ts`、`ShortcutsDialog.tsx`、`styles.css`、`scripts/keyboard-acceptance.mjs`）

### 改动

- **删除线解绑**：`StarterKit.configure({ strike: false })` + 自定义 `StrikeShortcut = Strike.extend({ addKeyboardShortcuts: { 'Mod-Shift-x': … } })`，只注册 `Ctrl+Shift+X`。
- **键位**（只绑这些）：保存 `Ctrl+S`（`!shift && !alt`）、另存为 `Ctrl+Alt+S`、新建 `Ctrl+Alt+N`、打开文件 `Ctrl+Alt+O`、打开文件夹 `Ctrl+Alt+Shift+O`、导出菜单 `Ctrl+Alt+E`；`Ctrl+N/O/Shift+S/Shift+E` 不绑。对话框开着时匹配到产品组合只 `preventDefault()`，不执行动作。
- `FileMenu`：打开焦点进第一项；`ArrowUp/Down/Home/End` 循环；`Tab`/`Shift+Tab`/`Esc` 关闭并把焦点还给触发器；外点关闭；每项右侧 `<kbd>` + `aria-keyshortcuts`；新建动作后焦点回正文，其余回触发器。
- 导出菜单同一套键盘模型（`aria-haspopup`/`aria-expanded`，打开后 `rAF` 聚焦第一项，方向键/Home/End/Tab/Esc，动作后焦点回「导出 ▾」）。
- `useDialogFocus` 兜底：opener 被卸载（或就是 body）时聚焦 `[data-focus-fallback]`（放在「文件」触发器上），绝不落到 body。
- skip link + 地标：`.app` 第一个可聚焦元素 `<a class="skip-link" href="#editor">`，正文列改成 `<main id="editor" tabIndex={-1}>`。
- 快捷键一览 `ShortcutsDialog.tsx`（复用 `.dialog` + `useDialogFocus`）：顶栏「?」按钮、设置里的「快捷键」入口、非输入区按 `?` 打开；正文 `contenteditable` 里按 `?` 不弹。清单只列真实键位，并注明浏览器保留组合与 AltGr 风险。

### 证据（`node scripts/keyboard-acceptance.mjs`，独立 context + 清 localStorage）

```
第一下 Tab 是 skip link / skip link 后焦点在 #editor 内
Ctrl+Alt+S 调 picker (0 -> 1) / 无 <s> / 文档名变化 / dirty=false
Ctrl+S 写回当前文件、不再弹 picker (1 -> 1)
Ctrl+Shift+S 不划删除线 / 不调 picker / 不出现新的已保存或已取消提示
Ctrl+Alt+N 空 未命名.md / dirty=false / 焦点在正文；脏文档弹未保存确认
Ctrl+Alt+O 调用打开文件 picker；Ctrl+Alt+Shift+O 调用打开文件夹 picker
Ctrl+Alt+E 打开菜单且焦点第一项；ArrowDown+Enter 触发下载
文件菜单：焦点进首项 / 方向键移动 / Esc 回「文件」/ 动作后回触发器
opener 已卸载时 Esc 后焦点不落 body
? 打开一览 / Esc 关闭 / 正文输入 ? 不弹
纯键盘 E2E：Ctrl+Alt+N → 输入 → Ctrl+S → Ctrl+Alt+E → Enter → 下载的 HTML 含「键盘链路-KB」
28/28 PASS
```

截图：`shots/round-05/t1-skip.png`、`t1-filemenu.png`、`t1-shortcuts.png`。

## T2 主题：三档、持久化、首屏不闪（`index.html`、`settings.ts`、`SettingsDialog.tsx`、`App.tsx`、`styles.css`、`scripts/theme-acceptance.mjs`）

### 改动

- `Settings` 加 `theme: 'light' | 'dark' | 'system'`（默认 `system`，旧数据缺字段按 system）。
- `index.html`：`<meta name="color-scheme" content="light dark">`；`<head>` 内联 `<style>`（浅/深底色）与同步内联脚本读 `sidelight.settings.v1` 的 `theme` 写 `document.documentElement.dataset.theme`，都在模块脚本之前。
- `styles.css`：`:root { color-scheme: light }`；`html[data-theme='dark'] { color-scheme: dark; 深色变量 }`；`@media (prefers-color-scheme: dark) { html:not([data-theme='light']):not([data-theme='dark']) { color-scheme: dark; 深色变量 } }`。
- `SettingsDialog` 首行 `role="radiogroup"` 三档（浅色/深色/跟随系统），点选即时改 `data-theme` 预览；`App` 的 effect 在 `settings.theme` 变化或设置关闭时把 `data-theme` 同步成已保存值（取消自动还原）。
- `App` 另加设置里的「快捷键」入口（打开一览并关闭设置）。

### 证据（`node scripts/theme-acceptance.mjs`）

```
默认主题跟随系统 / :root 声明 color-scheme
设置首行三档主题 浅色|深色|跟随系统
深色即时预览（data-theme=dark）/ color-scheme=dark / 底色 rgb(21,23,26) / reload 后保留
深色对比度 ink-faint/paper 6.8、mark/mark-wash 6.67
深色 reload 前 4 帧没有白帧（亮度 [27,24,24,27]）
浅色即时预览 color-scheme=light / reload 后保留
跟随系统 + 系统深色 → color-scheme=dark、变量 #15171a
取消设置还原到已保存主题
index.html 内联主题脚本在模块脚本之前
16/16 PASS
```

截图：`shots/round-05/t2-light-1440.png`、`t2-dark-1440.png`、`t2-dark-settings.png`、`t2-system-dark.png`。

## T3 导出公式：HTML 用 MathML、TXT 保留 LaTeX（`math.ts`、`export.ts`、`export.test.ts`、`App.tsx`、`scripts/export-math-acceptance.mjs`）

- `math.ts`：`replaceMathHtml(html, render)` 用属性顺序无关的 `MATH_NODE`（先按 `data-type="inline|block-math"` 定位整块，再从属性串取 `data-latex`，实体先解码；取不到就原样保留）；`mathToPlainText(html)` 还原成 `$latex$` / `$$latex$$`。**不 import katex**。
- `export.ts`：静态 `import katex`；`renderMathml` 用 `output:'mathml', throwOnError:false`；非法输入（KaTeX 返回 `katex-error` 而不是 MathML）回退成 `<code class="math-fallback">$latex$</code>`；`buildHtmlDocument` 拼接前调用 `replaceMathHtml`；新增 `buildPlainText(html)`（公式还原 + 剥标签 + 解码实体）。
- `App.tsx` TXT 分支改传 `editor.getHTML()` 给 `buildPlainText`，不再用 `editor.getText()`。
- `export.test.ts` 加 6 条：真实 `editor.getHTML()` 行内/块级 fixture（含 `data-type` 在前的真实顺序）、反序 `data-latex` 在前、非法 latex 回退、TXT 保留 `$E=mc^2$` 与 `$$\frac{a}{b}$$`、剥标签。

### 证据（`node scripts/export-math-acceptance.mjs`）

```
文档里有行内与块级公式节点 (2)
HTML 导出含 MathML <math> / 含 E=mc^2 / 没有空的 data-latex span / 保留 data-latex
TXT 导出行内 $E=mc^2$ / 块级 $$\frac{a}{b}$$
HTML 文件名跟文档名 / TXT 文件名跟文档名
导出的 HTML 直接用浏览器打开能看到公式文字
10/10 PASS
```

截图：`shots/round-05/t3-export-mathml.png`（用导出的 HTML 本身在浏览器里截图）。

## 门禁汇总

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 个文件、177 条断言、0 失败（export 新增 6 条）
npx vite build --outDir .tmp/build-a  → exit 0，产物合计 1,373,690 B
node scripts/keyboard-acceptance.mjs  → 28/28 PASS
node scripts/theme-acceptance.mjs     → 16/16 PASS
node scripts/export-math-acceptance.mjs → 10/10 PASS
```

第 4 轮回归（T1 改了菜单角色/焦点与 `<main>` 地标）：
`save-acceptance.mjs` 25/25、`filemenu-acceptance.mjs` 31/31、`export-acceptance.mjs` 7/7 全过。`readonly-acceptance.mjs` 未复跑（要另起宿主实例；本轮没改动只读/保存路径，只影响全局键盘，风险低，记遗留）。

## 与计划的偏离

- **D1（`Ctrl+Shift+S` 的「无提示」断言）**：保存成功的 `persist` 提示会一直留着，所以验收用「提示文本与按前一致」证明**没有新提示**，而不是要求页面完全没有「已保存」。产品确实不接管该组合；浏览器自身是否弹「另存网页」仍是 **UNVERIFIED**（CDP 不触发浏览器级快捷键）。
- **D2（主题深色变量写了两份）**：计划希望「颜色表只写一份」，但 CSS 自定义属性无法在 `[data-theme='dark']` 与 `@media` 两个选择器间共享，除非把所有变量改成 `light-dark()`（会牵动全部颜色与旧浏览器）。实际是 `html[data-theme='dark']` 与 `@media … html:not(…)` 两块，取值逐条一致，已由脚本对比 light/dark 两套截图与 color-scheme 断言兜住。
- **D3（白帧验证不算 UNVERIFIED）**：CDP `Page.startScreencast` 拿到了 4 帧，亮度 27/24/24/27，因此白帧项是实测 PASS，不是 UNVERIFIED。
- **D4（MathML 回退判定）**：`throwOnError:false` 下 KaTeX 对非法输入不抛异常，而是返回 `<span class="katex-error">`；实现改为检测结果里没有 `<math` 或含 `katex-error` 就走回退。
- **D5（导出菜单不加 `role="menuitem"`）**：导出项保持按钮的隐式 role，键盘导航用 `.export-menu button`，这样第 4 轮 `export-acceptance.mjs` 的 `getByRole('button', {name:'HTML'})` 仍然可用；`FileMenu` 的项仍是 `role="menuitem"`（第 4 轮脚本按 menuitem 找它）。这也是回归全过的原因。
- **D6（纯键盘 E2E 直接 Enter）**：`Ctrl+Alt+E` 后焦点就在第一项 HTML，验收第 9 条直接用 Enter 导出 HTML；第 5 条的 `ArrowDown+Enter` 仍然验证方向键与下载。
- **D7（`?` 按钮命名）**：顶栏「?」按钮的 `aria-label` 是「快捷键」，与设置里的「快捷键」按钮同名；验收脚本把后者限定在 `[role="dialog"]` 内查找。
- **D8（测试 fixture 的完整度）**：`export.test.ts` 的两段 fixture 来自第 05 轮 dev 页面 `document.querySelector('.editor').innerHTML`（与 `editor.getHTML()` 同构），外层节点、属性与**属性顺序**原样照抄；为可读性把 KaTeX 内层 MathML 只留一层 `<span class="katex">`，替换逻辑只看外层 `data-type`/`data-latex`，不受内层裁剪影响。

## 文件清单

- 修改：`src/App.tsx`、`src/components/FileMenu.tsx`、`src/components/useDialogFocus.ts`、`src/components/SettingsDialog.tsx`、`src/lib/settings.ts`、`src/lib/math.ts`、`src/lib/export.ts`、`src/lib/export.test.ts`、`src/styles.css`、`index.html`
- 新建：`src/components/ShortcutsDialog.tsx`、`scripts/keyboard-acceptance.mjs`、`scripts/theme-acceptance.mjs`、`scripts/export-math-acceptance.mjs`、`docs/iteration/round-05/impl-a.md`
- 截图：`shots/round-05/t1-skip.png`、`t1-filemenu.png`、`t1-shortcuts.png`、`t2-light-1440.png`、`t2-dark-1440.png`、`t2-dark-settings.png`、`t2-system-dark.png`、`t3-export-mathml.png`
- 未 commit；未跑 `npm run build`；未改 `vite.config.ts`/`scripts/shot.mjs`/`package.json`/README/CHANGELOG/AGENTS

## 遗留

1. 浏览器级快捷键（`Ctrl+Shift+S` 的「另存网页」、`Ctrl+Alt+*` 是否被系统/浏览器吞掉）只能安装版真人验证，本轮 **UNVERIFIED**。
2. `readonly-acceptance.mjs` 本轮没复跑（需另起 `.tmp/host-t4` 实例）；只读保存路径本轮没改，但全局键盘/焦点改过，建议 tester 在宿主空闲时补跑一次。
3. `?` 一览的内容与实际键位需要在后续改键时同步维护（清单位于 `ShortcutsDialog.tsx`）。
4. 本轮 `npm test` 从 171 → 177 条（新增 export 公式 6 条），未改测试文件数（16）。
