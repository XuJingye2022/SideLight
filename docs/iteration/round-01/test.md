# 第 01 轮 · 独立验收（tester）

日期：2026-11-15。基线 `342481b`，v0.16.3。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173`，CDP `http://127.0.0.1:9222`。

方法：先只读计划、STATE 与两份 findings（B1、S2/S3），自己写脚本、自己跑门禁，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，`tsc --noEmit` + vite 通过，221 ms | `.tmp/acc-build.log` |
| `npm test` | **15 个文件、165 条断言、165 pass、0 fail**，exit 0 | `.tmp/acc-test.log` |
| `npm run roundtrip` | exit 0；当前应用 **3 / 7 完全保真**；02 表格 `-3 +5`、04 引用式链接 `-4 +1`、01 少一空行、06 多一空行 | `.tmp/acc-roundtrip.log`、`docs/roundtrip-report.md` |

`npm run build` 产物与体积：

- `dist` 合计 **1,392,880 B**（基线 2,212,137 B）。
- `dist/assets/index-BT3J9VLZ.js` **1,087.72 kB / gzip 340.48 kB**；CSS **48.40 kB / gzip 12.48 kB**。
- chunk 警告仍在：`(!) Some chunks are larger than 500 kB after minification`。属 T2 未承诺处理的既有问题，不构成本轮回归。

## T1 货币写法不吞字：**PASS**

`npm run shot`（dev 5173、CDP 9222）：

```text
katex nodes: 1
katex after currency: 1
katex delta: 0
source has inline math: true
source has currency: true
console errors: none
```

独立脚本 `.tmp/t1-verify.mjs`（13 项全 PASS）：

```text
PASS 货币 katex 增量 0 (katex 0 -> 0)
PASS 货币正文原样保留
PASS 货币源码原样保留
PASS 货币无吞字（正文无 "5 到 5"）
PASS 货币未变公式源码（无 $5 到$10）
PASS 公式 katex 增量 1 (katex 0 -> 1)
PASS 公式源码原样保留 $x^2$
PASS 公式右侧文字未被吞
PASS 正文含公式渲染文本 x
PASS 刷新后货币仍是文字
PASS 刷新后源码仍原样
PASS 刷新后仅 1 个公式节点 (katex 1)
PASS 无控制台错误
```

- 源码尾部实测：`… 价格 $5 到 $10 之间。 公式 $x^2$ 结束。`，两个 `$` 都留在文字里；`$x^2$` 渲染成 KaTeX。
- 载入路径同样保留：等草稿落盘后刷新，货币仍是文字、公式仍只有 1 个。

新增单测真实覆盖（不看报告、自己做敏感性验证）：把 `src/lib/math.ts` 的 `isMathBody` 临时改成永远返回 `true`（只在 `.tmp/math-mut/` 的副本里改，不动仓库），`math.test.ts` 由 13/13 通过变成 **8 pass / 5 fail**，说明 3 条新断言与 2 条 `protectMathPairs` 断言确实对这条谓词敏感：

```text
ℹ tests 13
ℹ pass 8
ℹ fail 5
```

`npm test` 计数 165 与计划一致（基线 162 + 3）。

## T2 构建只发 woff2：**PASS**

`dist/assets` 实测：

- 字体文件：**woff2=19、woff=0、ttf=0**；字体合计 **256,168 B**（基线 1,072,948 B / 59 文件）。
- CSS（`dist/assets/index-*.css`）：`format("truetype")` **0**、`format("woff")` **0**、`format("woff2")` **20**；文件引用 19 个，另 1 个是 `KaTeX_Size3` 的 data URI。
- `dist` 合计 **1,392,880 B**，低于计划上限 1,400,000 B；比计划预期 1,392,823 B 多 **57 B**，`impl-a.md` 的 D2 已如实记录。

生产构建验证（`npx vite preview --port 4173 --strictPort`，后台；测试后已停止，端口 4173 监听数 0）：

- `node scripts/acceptance.mjs http://localhost:4173` → **11/11 PASS**，含 `PASS 字体已加载 (faces=20 loaded=2)`。
- 独立 CDP 脚本 `.tmp/t2-fonts.mjs`：

```text
PASS document.fonts.check KaTeX_Main
PASS KaTeX FontFace 数 = 20 (faces=20)
PASS KaTeX 已加载 face >= 1 (loaded=2 statuses=unloaded,loaded)
PASS 字体请求无 404/失败
PASS 只请求 woff2（无 ttf/woff） (200 KaTeX_Math-Italic-*.woff2, 200 KaTeX_Main-Regular-*.woff2)
PASS 无控制台错误
```

- 冷启动不拉字体，插入公式后才发 2 个 woff2 请求；无 404，控制台错误 0。

## T4 开源就绪文件 + 元数据 + README：**PASS**

文件存在且内容合理：

- `LICENSE`：MIT，`Copyright (c) 2026 Sidelight contributors`（无个人姓名）。
- `CONTRIBUTING.md`：Node 24、门禁三条、实施者不跑 `npm run build`、测试数以 `npm test` 为准、提交格式 `round-NN: <一句话>`、加依赖要写理由、ADR/GLOSSARY 位置、MIT 贡献授权。
- `.gitattributes`：`* text=auto eol=lf`、`*.md text eol=lf`、`fixtures/** -text`、`*.png binary`、`*.ico binary`。
- `.nvmrc`：`24`。
- `.github/workflows/ci.yml`：`on: [push, pull_request]`、`ubuntu-latest`、checkout@v4 + setup-node@v4（`node-version-file: .nvmrc`）、`npm ci`、`npm run build`、`npm test`。`package-lock.json` 存在，`npm ci` 有锁文件可用。
- `package.json`：`"license": "MIT"`、`"engines": {"node": ">=24"}`，`"private"` 已删；依赖段零改动；`repository` 未填（`git remote -v` 为空，计划允许留空并记录）。

README 断言（全部实测）：

```text
0 命中：批注不持久化 / 6 个真实 / 0 / 6 / 不会被误判成公式 / 九项 / qa2 / 546 KB / 共 19 个
命中：有磁盘句柄时，未验证（34 行）、7 个真实（88、102 行）、3 / 7（102 行）、
      11 项（71 行）、165（67 行）、256,168（51 行）、1,392,880（51 行）
```

数字与实测一致：`npm test` 165 条、acceptance 11 项、字体 256,168 B、产物 1,392,880 B。`AGENTS.md` 写「共 165 个」；`docs/adr/0001` 写「7 个真实样本」「3 / 7」，两条 `0 / 6` 保留并标为历史。T5 的内容断言因此一并通过。

**非阻塞文档问题**：`README.md:104` 仍写「三类内容是真的被改坏：YAML frontmatter…行内 HTML…脚注定义…」，但本轮 roundtrip 显示 `03-footnotes`、`05-html-block` 已完全保真，当前只坏表格、引用式链接、空行。该句在基线 `342481b` 已存在，不是本轮引入；T4 改了同段前面的 `0 / 6 → 3 / 7`，使矛盾更明显。建议第 2 轮改掉，不据此判本轮 FAIL。

## T3 WebView2 宿主 spike：**PASS（5/5，无 UNVERIFIED）**

- 构建：`powershell -ExecutionPolicy Bypass -File host/build.ps1` **exit 0**；`host/bin/Sidelight.exe` 与 `host/bin/www/index.html` 存在；`www/assets` 为 css=1、js=1、woff2=19（已用 T2 新产物重建）。`build.ps1` 打印 `bin 合计 13,001,220 B`，含 `webview2-data` 用户数据；排除该目录后为 2,355,827 B。
- 窗口标题：单独起一个实例，PowerShell `(Get-Process Sidelight).MainWindowTitle` = **`Sidelight`**，`MainWindowHandle` 非 0。
- 渲染：`document.title=Sidelight`，`.ProseMirror` 存在，控制台 0 错误。
- 单实例：第二个进程 **exit 0**，CDP 页面数 1，`Get-Process Sidelight` 计数 1。
- argv：正文含 `T3-MARKER`、引号、反斜杠、换行与「第二行」；`sl:argv-runs=1`、`sl:argv-done=1`、`navigation.type=reload`、`framenavigated=2`，未无限重载。
- FSA 真实读写：系统文件夹对话框出现（`#32770`，`msedgewebview2`）→ 选中 `.tmp\host-fs` → 文件树读到 `sample.md` → 改字 → `Ctrl+S` → 确认「仍然保存」→ 磁盘 SHA256 **`4b6520c9…` → `66dd0674…`**，读回含 `EDITED-BY-HOST`。独立复核：`.tmp/host-fs/sample.md` 当前哈希 `66dd0674…`，内容 `# 样本 / SAVE-MARKER-ORIGINAL / EDITED-BY-HOST`。

`node scripts/host-smoke.mjs --fsa` 输出 **7/7 PASS**；独立脚本 `.tmp/t3-verify.mjs` 输出 **8/8 PASS**（窗口、渲染、argv、导航次数、单实例、进程数）。测试结束后 `Sidelight` 进程数 **0**，CDP 9333 监听数 **0**。

FSA 用例依赖交互桌面与 `host/send-keys.ps1`（Win32 找对话框 + SendKeys），本机通过；无桌面会话或锁屏时不能直接复用到 CI，这点与 ADR/README 的「host 不进 npm 门禁」一致。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| dev acceptance 全套 | **11/11 PASS**（含货币、字体、导出 HTML、无控制台错误） | `.tmp/acc-acceptance-dev.log` |
| `npm run shot` | PASS：`katex delta: 0`、`source has currency: true`、`console errors: none` | `.tmp/acc-shot.log` |
| `scripts/qa7.mjs` | **7/7 PASS**（文件树、草稿、批注、保存、恢复、无控制台错误） | `.tmp/acc-qa7.log` |
| `scripts/qa17.mjs` | **7/7 PASS**（源码/预览/编辑切换保留改动、专注与打字机禁用、无控制台错误） | `.tmp/acc-qa17.log` |
| `scripts/qa18.mjs` | **全 PASS**（公式就地编辑、实时预览、块级公式、无控制台错误） | `.tmp/acc-qa18.log` |
| 导出 HTML | PASS：acceptance 的 `导出 HTML (未命名.html)`；qa9 第 1 步导出内容含元数据与脚注（2792 字符） | 同上 |
| 新增控制台错误 | 未发现；所有跑通脚本均报 0 | 各日志 |

额外抽查的旧 qa 脚本有失败，但与本轮改动无关，属**既有脚本腐化**：

- `scripts/qa9.mjs:55` 等 `.rail-notice`：基线 `src/App.tsx` 已把提示渲染成 `.toast`，基线 `qa9.mjs` 就已等 `.rail-notice`，所以基线即坏。
- `scripts/qa16.mjs` 等 `.popover .math-preview .katex`：`.math-preview` 只存在于 `src/styles.css`，`src/App.tsx` 从不渲染它；本轮未改 `App.tsx`。独立复测「工具栏插入公式 + 预览」：`editor katex=1`、`preview katex=1`，无控制台错误，功能本身可用。
- `qa10` 超时等 `.note-actions .accept`、`qa13` 第 3 条对查询词的期望不符，同属旧脚本与当前模拟流/选择器不一致；均不在本轮门禁，也不由本轮文件改动引起。

## 截图抽查

| 文件 | 大小/尺寸 | 观察 |
| :--- | :--- | :--- |
| `shots/round-01/t1-currency.png` | 89,009 B / 1440×900 | 非空白；`E=mc²` 正常排版，末尾正文为 `价格 $5 到 $10 之间。` |
| `shots/round-01/t2-prod-formula.png` | 86,562 B / 1440×900 | 非空白；生产构建里 `E=mc²` 正常排版 |
| `shots/round-01/t3-window.png` | 45,091 B / 1264×781 | 非空白；宿主窗口，标题栏 `Sidelight`，正文是 argv 文件内容 |
| `shots/round-01/t3-fsa.png` | 30,777 B / 1264×781 | 非空白；文件树 `host-fs/sample.md`，正文 `SAVE-MARKER-ORIGINAL` 与 `EDITED-BY-HOST` |

## 范围与卫生

- `git status`：18 个已跟踪文件改动（`.gitignore`、`AGENTS.md`、`README.md`、`docs/adr/0001`、`package.json`、`scripts/acceptance.mjs`、`scripts/shot.mjs`、`src/lib/math{,.test,Input}.ts`、`vite.config.ts` 与 7 张旧截图）；11 项未跟踪：`.gitattributes`、`.github/`、`.nvmrc`、`CONTRIBUTING.md`、`LICENSE`、`host/`、`scripts/host-smoke.mjs`、`scripts/vite-woff2-only.mjs`、`docs/adr/0004`、`docs/iteration/`、`shots/round-01/`。
- `git diff --stat`：18 文件，95 insertions / 22 deletions；`src/` 只动 `math.ts`、`mathInput.ts`、`math.test.ts`，`App.tsx` / `styles.css` 零改动。
- 产物未入版本控制：`git ls-files dist node_modules host/bin` 为空；`git check-ignore` 命中 `dist`、`node_modules`、`host/bin/`（含 `webview2-data`、`host.log`）、`.tmp/`。
- `package.json` 依赖段零改动；无新增运行时依赖。
- 密钥/调试残留：diff、新增源码与脚本（排除 `host/bin`、`.tmp`）搜索 `sk-`、`api_key`、`password`、`secret`、`Bearer` 无命中；`src` diff 无 `console.log`、`debugger`。
- 测试副作用：acceptance/shot/qa 会重写 `shots/` 下旧截图（本轮跑完有 7 张已跟踪截图被改写，如 `acceptance.png`、`math.png`、`sidelight-cache.png`）。这是脚本既有行为，不是产品代码改动；提交时由根代理决定一并提交或还原。

## 与实施报告对照

- `impl-a.md` 的 T1/T2/T5 结论与我的实测一致；T2 的 +57 B（1,392,880 vs 1,392,823）已在其 D2 主动记录，不是隐瞒。
- `impl-b.md` 的 T3 五项结论与我的实测一致；FSA 哈希值不同（其 `77ed4771→7321358d`，我的 `4b6520c9→66dd0674`），因每次运行的 `.tmp/host-fs/sample.md` 初始内容不同，属正常。
- 两处报告口径偏差（不阻塞）：`impl-b.md` 的 `bin 合计 3,165,041 B` 与当前干净重建不一致（排除 `webview2-data` 后为 2,355,827 B），应是 T2 最终产物之前的读数；其称 `t3-fsa.png` 是「保存确认框」，当前截图实际是保存后的编辑器画面（我的 `--fsa` 运行覆盖了截图）。
- 未发现验收项造假：T1/T2/T3/T4 的每个 PASS 都有可复跑命令或独立脚本支撑。

## 最终判定

**PASS**

- 五项门禁全部通过：build、test（165）、roundtrip（3/7，与基线一致）、dev acceptance 11/11、shot。
- T1、T2、T4、T3、T5 均达到计划验收；T3 五条全 PASS，FSA 有真实磁盘哈希变化，无 UNVERIFIED。
- 无本轮引入的回归；无新增运行时依赖、无密钥、无调试残留、产物未入版本控制。
- 非阻塞问题（建议下一轮）：README 第 104 行「三类内容被改坏」与当前 3/7 矛盾（基线遗留）；ADR-0004 的 `bin` 体积读数过期；`qa9`/`qa10`/`qa13`/`qa16` 属既有腐化脚本；测试会改写已跟踪截图。
