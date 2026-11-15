# 第 01 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T1 → T2 → T5。基线 `342481b`，计划 `docs/iteration/round-01/plan.md`（rev2）。
未 commit；未跑 `npm run build`（类型检查用 `npx tsc --noEmit`，产物用 `npx vite build --outDir .tmp/build-a`）。
B 组文件（`host/`、`LICENSE`、`CONTRIBUTING.md`、`.gitattributes`、`.nvmrc`、`.github/`、`package.json`、README 的 T4 条目）一律未碰。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 货币写法不再吞成公式 | **PASS** | `npm test` 165 条 0 失败；dev acceptance 10/10 含 `PASS 货币不吞字`；`katex delta: 0` |
| T2 构建只发 woff2 | **PASS** | 字体 1,072,948 B / 59 文件 → **256,168 B / 19 文件**；产物 2,212,137 B → **1,392,880 B**；生产 acceptance 11/11 含 `PASS 字体已加载` |
| T5 文档数字收尾 | **PASS** | 步骤 1–4 完成；步骤 5（宿主句）在 T3 五项全 PASS 后补入 README「依赖与体积」（第 60 行）；内容断言全过，行数预算 18/20 |

---

## T1 货币写法打字不再被吞成公式（含回归测试）

### 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/math.ts` | 抽出并导出 `isMathBody(body)`（`!/^\s/.test(body) && !/\s$/.test(body)`）；`protectMathPairs` 改调用它，判断逻辑只剩一处 |
| `src/lib/mathInput.ts` | `import { isMathBody } from './math.ts'`；行内规则 handler 开头加 `const body = match[1]` + `if (!body.trim() || !isMathBody(body)) return`；块级 `$$…$$` 与「空行打 `$$` 回车」路径未动 |
| `src/lib/math.test.ts` | 加 3 条：`isMathBody('5 到 ') === false`、`isMathBody('E=mc^2') === true`、`isMathBody(' x ') === false` |
| `scripts/acceptance.mjs` | 「草稿恢复」后加一条：先 `click('.editor')`（刷新后焦点在 body）→ `Control+End` → 输入 ` 价格 $5 到 $10 之间。`；记 `before`/`after` 的 `.editor .katex` 数（不写死绝对值），切源码断言 `.source-editor` 含 `$5 到 $10`，切回；一条 check 打印 `PASS 货币不吞字` |
| `scripts/shot.mjs` | 插入公式后记 `before`；打完货币打印 `katex delta: ${after - before}`；截图改为 `shots/round-01/t1-currency.png` |

关键 diff（`src/lib/mathInput.ts`）：

```diff
+import { isMathBody } from './math.ts'
+
         find: /\$([^$\n]+)\$$/,
         handler: ({ state, range, match }) => {
           if (this.storage.draft) return
-          const latex = match[1].trim()
+          const body = match[1]
+          // 与载入路径共用「内侧不能是空白」：`$5 到 $` 是货币，不是公式
+          if (!body.trim() || !isMathBody(body)) return
+          const latex = body.trim()
```

原有 10 条 math 断言行为不变（`protectMathPairs` 输出逐条未改），新增 3 条后该文件 13 条全过。

### 门禁输出

```
npx tsc --noEmit                                  → exit 0
npm test                                          → 15 个文件、165 条断言、0 失败（基线 162 + 3）
node scripts/acceptance.mjs http://localhost:5173 → 10/10 PASS（T1 时点，此时 T2 的字体检查尚未加入）
  PASS 草稿恢复
  PASS 货币不吞字 (katex 0 -> 0)
  PASS 查找命中 (1 / 4)
  PASS 公式渲染
  PASS 表格工具条
  PASS 导出 HTML (未命名.html)
  PASS frontmatter 保真
  PASS 脚注保真
  PASS 行内 HTML 保真
  PASS 无控制台错误
node scripts/shot.mjs
  katex nodes: 1
  katex after currency: 1
  katex delta: 0
  source has inline math: true
  source has currency: true
  console errors: none
```

截图：`shots/round-01/t1-currency.png`（公式正常渲染，末尾正文为 `价格 $5 到 $10 之间。`，两个 `$` 都留在文字里）。

### 与计划的偏离

- **D1（环境噪音，已排除）**：T1 的 shot 前两次运行打出 1 条控制台错误
  `Cannot read properties of undefined (reading 'map') at chrome-extension://nmhdhpibnnopknkmonacoephklnflpho/offscreen/offscreenTranslate.js:96`。
  用 `.tmp/t1-noise2.mjs` 复现：只做「打开页面 → `localStorage.clear()` → 刷新」，还没输入任何货币文字就出现同一错误；来源是 `chrome-extension://`（CDP 里 headless Edge profile 自带的翻译扩展），不是 `localhost:5173` 的应用代码。后续重跑（含最终门禁）该错误消失，`console errors: none`。
- 计划验收写「10 条全 PASS」，实际 T1 时点确为 10 条；T2 追加字体断言后同脚本是 11 条（见 T2）。
- `$5-$10`（无空格）仍会被当公式、`$ x $` 变为文字：两者都是计划已声明的行为变化，未额外处理。

---

## T2 构建只发 woff2 字体

### 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `scripts/vite-woff2-only.mjs`（新建） | 导出 `woff2Only()`；`generateBundle` 里把每个 `@font-face` 的 `src` 收窄到 `format("woff2")` 一项（`KaTeX_Size3` 的 data URI 原样保留），删除全部 `.ttf`/`.woff` 资产；5 条硬自检不满足就 `throw` 让构建失败 |
| `vite.config.ts` | `import { woff2Only } from './scripts/vite-woff2-only.mjs'`；`plugins: [react(), woff2Only()]`；未改 `src/`、未改 `package.json` |
| `scripts/acceptance.mjs` | 「公式渲染」后加字体断言：`await document.fonts.ready` 后 `document.fonts.check('16px KaTeX_Main')`、`/KaTeX/` face 数 = 20、至少 1 个 `loaded`；打印 `PASS 字体已加载` |

插件自检（缺一即构建红）：恰好 1 个 `.css` 资产；`@font-face` 数 = 20；每个 face 的 `src` 恰好 1 项且含 `format("woff2")`；CSS 里 `format("truetype")` 与 `format("woff")` 计数为 0；CSS 里每个 `/assets/*.woff2` 都在 bundle 中存在。
实现要点：`src` 值里含 data URI（`data:font/woff2;base64,…` 带逗号与分号），所以按括号深度切分，不用朴素 `split(',')`。

### 门禁输出

```
npx tsc --noEmit                              → exit 0
npm test                                      → 15 个文件、165 条断言、0 失败
npx vite build --outDir .tmp/build-a          → exit 0，✓ built in 209ms

# 产物统计（.tmp/build-a/assets）
woff2=19 woff=0 ttf=0 font=256168
truetype=0 woff=0 woff2=20
faces=20 datauri=1
# 产物合计
1392880                                        # 基线 2,212,137；计划上限 ≤1,400,000

# 生产验收（vite preview --outDir .tmp/build-a --port 4173，acceptance 打 http://localhost:4173）
PASS 草稿恢复
PASS 货币不吞字 (katex 0 -> 0)
PASS 查找命中 (1 / 4)
PASS 公式渲染
PASS 字体已加载 (faces=20 loaded=2)
PASS 表格工具条
PASS 导出 HTML (未命名.html)
PASS frontmatter 保真
PASS 脚注保真
PASS 行内 HTML 保真
PASS 无控制台错误
```

补充证据（确认浏览器真的只拉 woff2，而不只是 CSS 里文字变了）：

```
# .tmp/t2-fontreq.mjs：新 browser context + response 监听，4173 上插入公式
font requests: 2
by extension: {".woff2": 2}
non-woff2: []

# 旧 URL 在产物里已不存在（200 是 SPA fallback 的 index.html，不是字体）
KaTeX_Main-Regular-B22Nviop.woff2 -> 200 font/woff2 len=26272
KaTeX_Main-Regular-Dr94JaBh.woff  -> 200 text/html len=588
KaTeX_Main-Regular-ypZvNtVU.ttf   -> 200 text/html len=588
```

截图：`shots/round-01/t2-prod-formula.png`（生产构建里 `E = mc²` 正常排版，字体已实际加载）。

### 与计划的偏离

- **D2（+57 B）**：产物合计 1,392,880 B，计划预期 1,392,823 B，差 57 B；门槛是 ≤1,400,000，通过。差异来自 CSS 实际长度与 critic 复现值不同（CSS 48.40 kB）。
- **D3（截图脚本）**：计划只写「截图 `shots/round-01/t2-prod-formula.png`」，没说由谁产出。`shot.mjs` 的截图路径已归 T1（`t1-currency.png`），故用临时脚本 `.tmp/t2-shot.mjs` 在 4173 上截生产图；`.tmp/` 已 gitignore，不入库。
- 插件对 dev server 无影响（`apply: 'build'`）；dev 下字体仍由 Vite 从 `node_modules` 提供，`PASS 字体已加载` 在 dev（11/11）与生产（11/11）都过。

---

## T5 文档数字收尾

T4 已完成（README 已有 `有磁盘句柄时，未验证`、`7 个真实`、`3 / 7`，且 `批注不持久化` 已删），T5 放行。步骤 1–4 在 T3 出结论前完成；步骤 5 等 T3 结果，T3 五项全 PASS 后补入（见本节末「步骤 5」）。

### 改动文件与关键 diff

| 文件 | 行 | 改动 |
| :--- | :--- | :--- |
| `README.md` | 30 | 「货币写法（`$5 到 $10`）不会被误判成公式」→「内侧不能是空白的成对 `$` 才当公式，`$5 到 $10` 在打字与载入两条路径上都保留为文字（无空格写法 `$5-$10` 仍会被当公式）」 |
| `README.md` | 51 | 「约 2.1 MB…字体 546 KB（39 个文件）」→「约 1.33 MiB（1,392,880 B）…字体 256,168 B（19 个文件，只发 woff2）」 |
| `README.md` | 67 | `npm test # …共 19 个` → `# 15 个文件、165 条断言` |
| `README.md` | 71 | `九项验收` → `11 项验收`，并补「货币、字体」两项 |
| `README.md` | 72 | 删不存在的 `（另有 qa2/qa3/qa4）`，改写实际存在的 `qa7、qa9–qa18` |
| `README.md` | 60 | 步骤 5：新增宿主一段「用系统自带 `csc.exe` 编 C# 宿主，经 WebView2 SDK 加载同一份 `dist`，只在宿主层，不进运行时依赖。窗口、单实例、argv 打开文件、真实文件夹读写都已跑通；安装包尚未制作，见 ADR-0004」 |
| `AGENTS.md` | 38 | `共 162 个` → `共 165 个` |
| `docs/adr/0001-…md` | 11 | 第三条约束 `6 个真实样本` → `7 个真实样本` |
| `docs/adr/0001-…md` | 17 | `用 6 个真实样本测了一次，结果…` → `用 7 个真实样本测了一次，当前结果 3 / 7 完全保真…（下面两条是当时 6 个样本的历史记录）`；两阶段历史数字 `0 / 6` 原样保留并标历史 |

### 门禁输出

```
# README 必须为 0 命中（全部通过）
Select-String README.md -SimpleMatch '不会被误判成公式','九项','qa2','546 KB','共 19 个'   → 无输出
# README 必须命中（全部通过）
'11 项'      → README.md:71
'165'        → README.md:67
'256,168'    → README.md:51
'共 165 个'  → AGENTS.md:38
'7 个真实样本' → docs/adr/0001…:11 与 :17
'3 / 7'      → docs/adr/0001…:17
# 步骤 5 宿主行（全部通过）
'WebView2 SDK'、'不进运行时依赖'、'安装包尚未制作'、'argv 打开文件'、'真实文件夹读写' → README.md:60

npm test                                      → 15 个文件、165 条断言、0 失败（与 README 一致）

# 行数预算（开工前快照 .tmp/t5-before.txt）
after:  AGENTS.md +1 -1 / README.md +10 -9 / docs/adr/0001… +2 -2
before: README.md +3 -4
T5 delta = 18                                 # 要求 ≤20；其中步骤 5 占 +2（空行与段落）
```

### 步骤 5（宿主事实，T3 PASS 后补）

触发：lead 通知 T3 五项全 PASS（`MainWindowTitle=Sidelight`、第二进程 exit 0 且进程数 1、argv 标记行进正文且只重载一次、打开 `.tmp\host-fs` 改字 `Ctrl+S` 后磁盘哈希变化并读回 `EDITED-BY-HOST`），`docs/adr/0004-webview2-host-before-admin.md` 已存在。按计划的 PASS 分支在 README「依赖与体积」段末补一段（第 60 行）：

> 宿主层另有 `host/`：用系统自带 `csc.exe` 编 C# 宿主，经 WebView2 SDK 加载同一份 `dist`，只在宿主层，不进运行时依赖。窗口、单实例、argv 打开文件、真实文件夹读写都已跑通；安装包尚未制作，见 [ADR-0004](docs/adr/0004-webview2-host-before-admin.md)。

要点对照：WebView2 SDK ✓；只在宿主层、不进运行时依赖 ✓；窗口 / 单实例 / argv / 真实读写 ✓；安装包尚未制作 ✓。未改 T4 的条目（`有磁盘句柄时，未验证`、`7 个真实`、`3 / 7` 原样），也未改「现在不能做什么」里的「没有安装包」（仍是事实）。

### 与计划的偏离

- **D4（历史数字的标法）**：计划要求「两阶段历史数字保留并标为历史」。为守住 ≤20 行预算，没有逐条改两条 bullet，而是在第 17 行加括注「下面两条是当时 6 个样本的历史记录」统一标记；`0 / 6` 原数字未动。若审查要求 bullet 各自带「历史」字样，会超预算（+4 行 → 20 行正好，含宿主句则超），需根代理定。
- **D5（步骤 5 的执行时点）**：T5 首次交付时 T3 还在进行中（`host/bin` 已有，`docs/adr/0004` 与 `impl-b.md` 未出），三个分支都不匹配「进行中」；为不替 T3 下结论，步骤 5 先留空、报告标 PARTIAL。lead 确认 T3 五项全 PASS 后按 PASS 分支补入，本节与结论表已回填，T5 由 PARTIAL 改为 PASS。

---

## 文件清单与边界

本轮 A 组实际改动（`git status` 可核）：

- 修改：`src/lib/math.ts`、`src/lib/mathInput.ts`、`src/lib/math.test.ts`、`scripts/acceptance.mjs`、`scripts/shot.mjs`、`vite.config.ts`、`README.md`、`AGENTS.md`、`docs/adr/0001-document-tree-is-the-truth.md`
- 新建：`scripts/vite-woff2-only.mjs`、`docs/iteration/round-01/impl-a.md`
- 截图：`shots/round-01/t1-currency.png`、`shots/round-01/t2-prod-formula.png`
- 临时脚本（`.tmp/`，gitignore，不入库）：`t1-noise.mjs`、`t1-noise2.mjs`、`t2-shot.mjs`、`t2-fontreq.mjs`、`t5-before.txt`
- 未碰：`host/`、`LICENSE`、`CONTRIBUTING.md`、`.gitattributes`、`.nvmrc`、`.github/`、`package.json`（后七项的改动来自 B 组 T4/T3）
- 未 commit；未跑 `npm run build`；未新增运行时依赖；未删除计划外文件

## 遗留

1. 安装包尚未制作（T3 只到宿主 spike，无图标、无 `.md` 关联、无卸载、无签名、无自动更新），README 已按事实写明；正式发布路径待 T3 之后的轮次。
2. `npm run roundtrip` 归 T4 跑过一次（`docs/roundtrip-report.md` 已更新为 3 / 7），本轮 A 组未再跑，避免与 B 组抢生成物。
3. 根代理收尾的 `npm run build` 会重建 `dist`；T2 的插件届时生效，`dist` 也应只剩 woff2（本轮只在 `.tmp/build-a` 验证）。
