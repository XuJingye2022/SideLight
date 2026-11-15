# 第 16 轮 · 发布与规范侦察（findings-ship）

- 仓库：`D:\Documents\SidelightProgram`，v0.29.0，branch `main`，HEAD `4d53ea1`。
- 侦察时间：2026-11-16 07:16–07:50（Asia/Shanghai）。只读侦察：未改 `src/`、`host/`、`host-mac/`、`.github/`、`packaging/`、`scripts/`；未跑 `npm run build`、未装依赖。
- 本轮新增写入：本文件、`shots/round-16/ship-*.png`、`.tmp/r16-ship/*`（axe 4.10.2 审计脚本、探针与 JSON）。
- 证据口径：axe 只从 `.tmp` 注入，不进 `node_modules`、不进首屏。

## 摘要

1. **WCAG 2.1 AA 硬缺口 3 条**：输入框边界对比度 1.44:1（1.4.11）、正文编辑区无无障碍名称（4.1.2）、全仓无 `prefers-reduced-motion`（2.2.2/2.3.3 风险）。对比度本身达标（最紧 4.58:1），21 个 Tab 站点里 20 个焦点环可见。
2. **首屏预算够用**：真实增量为 CSS 250–400 B gzip（实测模拟 109 / 190 B 两档），应从 283,826 升到 284,100–284,250，余 750 B 以上；砍法已量化（8 条死规则 = −186 B gzip）。
3. **0.30.0 文档改动 4 个文件、约 14 处**：`package.json`、`package-lock.json`、`docs/CHANGELOG.md`、`README.md`，另加 `AGENTS.md`/`STATE.md` 台账。README 目前 0 张图，**不需要**为截图加引用。
4. **0.29.0 发布事实全部对齐**：Release 4 个资产字节与 STATE 一致、CI 最新必过、macOS 仍 ad-hoc 未公证；本机 `release/` 只有 0.27/0.28 与一份 0.26.0 的旧校验和，不能在本机复验 0.29.0。
5. **版本建议**：按简报发 **0.30.0**，但必须先补 3 条缺口；若最终只修缺陷、无用户可见变化，按 `AGENTS.md` §5 更应按 **0.29.1** 发。**不要攒到 1.0**（1.0 的前置是第 17–19 轮的性能拆分与隐私确认）。

## S1 · WCAG 2.1 AA 关键项结论

完整 10 项见文末「WCAG 清单」。三条要修的：

| 编号 | 条目 | 现状 | 证据 | 修法 | 难度 |
| --- | --- | --- | --- | --- | --- |
| A1 | 1.4.11 非文本对比度 | **FAIL**：`.field input`、`.dialog-input`、`.dialog-textarea` 只有 1px `--line-strong` 边框，浅色 1.44:1、深色 1.69:1，输入框没有别的可见边界 | `src/styles.css:1039`、`:1866`；比值 `.tmp/r16-ship/border.mjs` | 加 `--line-input`（浅色约 `#85898c`≈3.1:1，深色 `#6b7178`=3.64:1），2 处 `border-color` 换掉 | S |
| A2 | 4.1.2 名称/角色/值 | **FAIL**：axe `aria-input-field-name`（serious）落在 `.tiptap`；正文编辑区 `role="textbox"` 但没有 `aria-label`/`aria-labelledby`/`title` | `.tmp/r16-ship/probe.json`（light 与 dark 各 1 条，target `.tiptap`） | `<EditorContent aria-label="正文">` 或编辑器 `editorProps.attributes['aria-label']`，约 20 B | S |
| A3 | 2.2.2/2.3.3 减少动态 | **FAIL**：`src/` 全仓 `prefers-reduced-motion` 0 命中；22 个元素带 `transition`，3 处 `@keyframes pop`；模拟 `reduce` 后按钮仍是 `0.12s` | `grep prefers-reduced-motion src` = 0；`src/styles.css:108,709,822,968,976,1826,2076`；`.tmp/r16-ship/probe3.json` | 一个 `@media (prefers-reduced-motion: reduce)` 块（实测 +109 B gzip） | S |

较弱但不算失败的 2 条：

- **正文编辑区焦点环被抹掉**：`.tiptap` 计算值 `outline: none`，只剩光标（`caret-color: #2b6d64`，2.4.7 可判过，但读屏/低视力用户看不到「焦点在哪」）。21 个可见键盘站点中唯一没有描边的就是它（`.tmp/r16-ship/probe3.json`）。建议保留现状但记一条「已知弱项」，不要为它新增大块 CSS。
- **禁用态文字**：`button:disabled { opacity: 0.4 }`（`styles.css:117`）使 `--ink-soft` 复合后约 2.2:1；WCAG 1.4.3 明确豁免非活动控件，**不必修**，但不要把信息只放在禁用按钮里。

对照度本身给结论：**达标**。axe 4.10.2 的 `color-contrast` 在 light/dark/settings 三态 0 violation、0 incomplete；自写 DOM 审计（逐文本节点取有效背景与透明度链）0 失败。最紧的两对是浅色 `--ink-faint` on `--panel` 4.58:1、`--mark` on `--mark-wash` 4.63:1（`.tmp/r16-ship/contrast.mjs`）。

## S2 · 首屏预算（283,826 / 上限 285,000 / 余 1,174）

实测（`node scripts/measure-first-screen.mjs --dir dist --max 285000`，无构建）：

```text
  885,676  277,265  /assets/index-Dl45UGDg.js
   31,006    6,561  /assets/index-Cp-l7r2i.css
total raw=916682 gzip=283826 files=2 max=285000
PASS
```

- CSS 只占首屏 6,561 B（2.3%），JS 277,265 B。KaTeX chunk（`katexLoader-*.js` 258,788 raw）不在首屏集合，别把任何 import 加回同步路径。
- 本轮预计增量（把候选 CSS 拼到现有 dist CSS 上实测 gzip 差，`.tmp/r16-ship/bytes.mjs`）：
  - 只加 reduced-motion 块 + 3 条 focus 规则：+320 raw → **+109 B gzip**。
  - 再加 token 层（间距/圆角/焦点环变量）与按钮过渡：+521 raw → **+190 B gzip**。
  - 再加 A1 边框（2 条声明）：约 +25 B gzip；A2 的 `aria-label` 进 JS，约 +7 B。
  - **结论：整轮落在 +250～+400 B gzip，预计 284,076～284,226，距 285,000 还有 774～924 B。**
- 必须守住 ≤285,000 的砍法（按顺序，先砍不伤功能的）：
  1. **删确认死掉的 8 条规则**：`diff-view`、`diff-line`、`diff-sign`、`diff-added`、`diff-removed`、`math-preview`、`thread-user`、`thread-assistant`。全仓 `.tsx/.ts` 0 生产点（其余 12 条「疑似死」是模板串动态类：`note-${kind}`、`annot-${kind}`、`auto-save-${tone}`、`find-hit is-current`、`is-dimmed`、`tableWrapper`，不能删）。实测：**979 raw / −186 B gzip**。
  2. `color-mix()` 5 处（`styles.css:172,189,1044,1880`）换预计算 hex：约 −150 raw / −50 B gzip。
  3. 合并重复的深色 token 块：`html[data-theme='dark']`（`:28-47`）与 `@media (prefers-color-scheme: dark)`（`:50-70`）是同一份 20 条声明抄了两遍，约 700 raw / 估 250 B gzip。**注意**：不能简单合并（手动深色与跟随系统是两个入口），要么用 `light-dark()`（依赖 Chromium 123+，WebView2 可用但需实机验），要么接受重复。此项只在不砍视觉时才用。
  4. 仍超线才动视觉：`.brand-mark` 的 `radial-gradient` + `box-shadow` 光晕（`:184-190`，装饰性，砍掉不丢信息），需要产品负责人点头。
  5. 不许动：`@media print`、1119px 断点、`katexLazy` 路径、测量脚本本身。也不要为省字节删 `--text-xs` 之类的可读性变量。
- 门禁：`npm run build` 之后跑一次测量；这条命令与 `npm test` 一样必须绿，不能只看 Vite 日志。

## S3 · 0.30.0 的 CHANGELOG / README 改哪些句子

### 必改（否则数字与事实不一致）

| 文件:行 | 现文 | 改成 |
| --- | --- | --- |
| `package.json:3` | `"version": "0.29.0"` | `"version": "0.30.0"` |
| `package-lock.json:3`、`:9` | `0.29.0` | `0.30.0`（两处都要，别只改第一处） |
| `docs/CHANGELOG.md:5` 前 | 顶部直接是 `## 0.29.0` | 插入 `## 0.30.0 — 2026-11-16` 一节；**破折号必须是 `—` 加空格**，`release.yml:58` 用 `^## ${PKG_VERSION} — ` 做 preflight，写错 tag 会被拦 |
| `README.md:91` | 「首屏 gzip 从 364,960 B 降到 **283,826 B（−22.2%）**」 | 新实测值；百分比重算 |
| `README.md:91`、`:102` | `SHA256SUMS-0.29.0.txt`（2 处） | `SHA256SUMS-0.30.0.txt` |
| `README.md:93` | 「实测 283,826 B（0.28.1）」 | 新值 +（0.30.0） |
| `README.md:63` | `release/Sidelight-0.29.0-win-x64-setup.exe` | `0.30.0` |
| `README.md:109` | 「16 个文件、205 条断言」 | 以 `npm test` 实际输出为准（本轮若加 a11y 测试就同步） |
| `AGENTS.md` §6（约 :73） | 「当前 0.29.0…首屏 gzip 283,826 B ≤285,000，余 1,174 B」+ 测试数 | 0.30.0、新首屏数、新余量、测试数 |
| `docs/iteration/STATE.md:52` | v0.29.0 / 283,826 / 余 1,174 / 16 文件 205 条 | 同上一行，另补「WCAG AA：3 修 2 弱」一句 |
| `STATE.md:53`、`:86-97` | 0.29.0 资产与发布状态 | 新 Release 链接、4 个资产字节、`SHA256SUMS-0.30.0.txt` |
| `STATE.md:59-75` | 轮次表最后一行是 15 | 追加第 16 行（主题、结果、commit） |
| `STATE.md:108` 后 | 决策记录最后一条是第 13 轮 | 追加第 16 轮决策（对比度/焦点/reduced motion 的口径） |

### CHANGELOG 该写什么（一句标题 + 4–6 条）

标题建议：`界面一致性与可访问性：对比度、焦点、减少动态`。条目只写「用户能感知的」与「可复算的」：

1. 可访问性：`prefers-reduced-motion` 生效；正文编辑区有可读名称；输入框边界对比度 ≥3:1。
2. 焦点：键盘 Tab 21 个站点，20 个有 2px 焦点环；skip link 仍是第一站。
3. 视觉：字号/间距/圆角收敛到 token（若确实做了；否则删掉这条，别写没做的事）。
4. 体积：首屏 gzip 新值（≤285,000，余 N B）；安装包/zip 新字节与 `SHA256SUMS-0.30.0.txt`。
5. 未验：读屏实录（NVDA/VoiceOver）、高对比度模式、macOS 真机仍与 0.29.0 相同。

### 截图要不要进 README

**不要。** `README.md` 现在 `![` 命中 0（`Select-String README.md '!\[' -SimpleMatch` 计数 0），全篇没有图片；15 轮都没给 README 加过图。截图只作为 `docs/iteration/round-16/` 报告证据，落 `shots/round-16/`，在 findings/impl 里引用。若产品负责人想加首图，那是新决定：每张 1440×900 PNG 约 90 KB，会进仓库历史。

## S4 · 发布前检查（0.29.0 实况）

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 最新 Release | `v0.29.0`，未 draft、未 prerelease，发布 2026-11-15T23:00:56Z | GitHub API `/releases/latest` |
| 4 个资产 | setup 817,994 B、portable 901,920 B、macOS universal 889,644 B、`SHA256SUMS-0.29.0.txt` 308 B | 同上；与 `STATE.md:53` 逐字节一致 |
| 校验和 | Release 页 `SHA256SUMS-0.29.0.txt` 是唯一权威；**本机 `release/` 没有 0.29.0 产物**，`release/SHA256SUMS.txt` 仍是 0.26.0 的旧哈希 | `Get-ChildItem release`；`release/SHA256SUMS.txt` |
| Universal | fat 两片 x86_64 `0x1000007` / arm64 `0x100000c`，minOS 13.0；self-test 6 项 | `docs/CHANGELOG.md:9-10`、`STATE.md:53`；Windows 本机不能复验（UNVERIFIED） |
| 签名/公证 | **ad-hoc，未签名、未公证**；Release 首行明说，workflow 输出 `signing=adhoc`；6 个 Apple secrets 未配 | Release body 首行；`STATE.md:93`；`release.yml:160-165` |
| CI | 最新 `main` 的 CI `success`（2026-11-15T23:15:33Z）；三组 job 已转必过 | GitHub API runs |
| 发布流水线 | `Release v0.29.0` `success`（22:59），此前 22:52 那次 `failure` 后重跑成功 | GitHub API runs |
| 仓库推送 | SSH over 443，deploy key `sidelight-agent` 在仓库里（不用时去 Settings 删） | `STATE.md:96` |

- **本机 `release/` 的旧 `SHA256SUMS.txt`（0.26.0）建议删掉或改名**，否则下一位发布者会拿它对照 0.30.0 产物，误判「校验和不符」。`release/` 不进版本控制，这一步不影响仓库。
- 0.30.0 发布门槛（缺一不发）：`npm run build` 绿；`npm test` 绿（16/205 起）；改了序列化才跑 `npm run roundtrip`；`node scripts/measure-first-screen.mjs --max 285000` 绿；`package.json` = CHANGELOG 标题 = tag；Release 后 3 个资产 + `SHA256SUMS-0.30.0.txt` 齐全且 `sha256sum -c` 过；`gate`/`windows-host`/`macos-host` 全绿。

## S5 · 优化机会（最多 3 条）

1. **CSS 死规则清理，按证据删**：8 条确认死（979 raw / −186 B gzip），另有 12 条是模板串动态类不能删。每轮清一次，既省首屏又防止「看着像死代码」误判。难度 S，收益可复算。
2. **深色 token 双份**：`styles.css:28-47` 与 `:50-70` 是同一份 20 条声明。用 `light-dark()` 或构建期生成可以只留一份（估 −250 B gzip），代价是要在真 WebView2 里验 `color-scheme` 与首帧（第 5 轮修过白闪，别把它弄回来）。难度 M。
3. **台账过期会误导发布**：`STATE.md` 写 `App.tsx` 约 3,100 行，实际 4,340 行 / 166,464 B；`STATE.md:24` 写 `npm test`「当前 15 个文件」，实际 16。发布前顺手改成真实值，避免下一轮按错的体量做计划。难度 S（纯文档）。

## WCAG 清单（2.1 AA，2026-11-16 实测）

| # | 条目 | 判定 | 证据 | 缺口 / 下一步 |
| --- | --- | --- | --- | --- |
| 1 | 1.4.3 对比度（正文与控件） | **PASS** | axe 的 `color-contrast` 在 light/dark/settings 三态 0 violation、0 incomplete；自写审计 0 失败；最紧 4.58:1（浅 `--ink-faint`/`--panel`）、4.63:1（`--mark`/`--mark-wash`）。注意 axe 在 light/dark 各报 1 条 4.1.2（见第 5 行），不是对比度 | 无。禁用态 2.2:1 属 1.4.3 豁免 |
| 2 | 1.4.11 非文本对比度 | **FAIL** | 输入框边框 1.44:1（浅）/1.69:1（深），`styles.css:1039,1866`；焦点环 5.50/7.56 过 | 加 `--line-input` ≥3:1；2 条声明，约 25 B gzip |
| 3 | 2.4.7 焦点可见 | **PASS（1 弱项）** | 21 个 Tab 站点，20 个 2px `solid` accent 环（`.tmp/r16-ship/probe3.json`）；`.tiptap` `outline:none` 只剩光标 | 编辑区焦点弱，可接受；不建议为此加环（会晃眼），记入已知弱项 |
| 4 | 2.4.3 焦点顺序 | **PASS** | skip link 第一站；Tab 顺序 = DOM 顺序（顶栏→工具栏→侧栏页签→树→正文）；菜单 `Tab`/`Esc` 关闭（`App.tsx:3573`、`FileMenu.tsx:124`） | 正文里 `Tab` 只在文档开头劫持到 skip link（`App.tsx:3908-3915`），其余位置离开页面，符合常规 |
| 5 | 4.1.2 名称/角色/值 | **FAIL** | axe `aria-input-field-name`（serious）×1，target `.tiptap`，light/dark 各一次 | 加 `aria-label="正文"`；图标按钮已有 aria-label/title（67 处） |
| 6 | 2.1.1 键盘可达 | **PASS** | 顶栏/工具栏/侧栏/树/对话框按钮全部可 Tab；树「更多」按钮由 `:focus-within` 显示（`styles.css:482`）；无鼠标独占操作 | 编辑器内部快捷键不属 AA 必需；自定义快捷键是可选 |
| 7 | 2.2.2 / 2.3.3 减少动态 | **FAIL** | `prefers-reduced-motion` 0 命中；22 个 transition 元素；3 处 `@keyframes pop`；模拟 reduce 后仍 `0.12s` | 一个媒体查询块，实测 +109 B gzip |
| 8 | 1.4.4 缩放到 200% | **PASS** | 720×450（1440×900 的 200%）`scrollWidth=720`、横向溢出 0；干净页面上另测 320/640 CSS px 也无横向滚动（`ship-reflow-320.png`） | 200% 下正文/工具栏可读；未测 200% + 深色 + 对话框组合 |
| 9 | 1.4.12 文本间距 | **PASS** | 注入 1.5 行高、0.12em 字距、0.16em 词距、2em 段距后，顶栏/工具栏/状态栏/树/按钮 0 裁切（`ship-text-spacing-1440.png`） | 只测默认屏；长文件名与批注卡未测 |
| 10 | 1.4.10 重排 | **PASS** | 320/640 CSS px 无二维滚动、0 元素越界（`ship-reflow-320.png`、`ship-reflow-640.png`） | 窄屏抽屉（`.rail-open`）与 4 个对话框未逐一测 |
| 附 | 2.4.1 跳过区块 | **PASS** | `.skip-link` 第一个 Tab 聚焦、显示（`ship-focus-skiplink.png`） | 无 |
| 附 | 3.3.2 标签/说明 | **PASS（设置框）** | 设置对话框 axe 0 violation；字段有可见标签 | 保存对比、关闭确认、查找条未逐屏跑 axe |
| 附 | 读屏实录 | **未验** | 本机无 NVDA/VoiceOver，`sr-only` live region 仅代码核对（`App.tsx:4040`） | 第 18/20 轮人工补 |

## 版本建议

**建议发 0.30.0，但三件事按顺序做：先修 A1–A3，再改文档，最后打 tag。不攒到 1.0。**

- **为什么不攒到 1.0**：1.0 的前置写在 `STATE.md:106` 与 README 末节——第 17 轮性能与 `App.tsx` 拆分、第 18 轮文档/贡献指南/隐私确认、第 19 轮 RC、第 20 轮最终 QA。把可访问性修复压到 1.0，等于让已知的 3 条 AA 缺口在下载页再留 4 轮；而发布已经自动化（tag → `release.yml`），一次 0.30.0 的边际成本只有 CI 时间。
- **为什么现在能发**：0.29.0 的 4 个资产、校验和、CI 必过、Universal 双片都已核实（S4）；`release.yml` 的 preflight 会替我们校验 tag = `package.json` = CHANGELOG，写错版本发不出去。
- **版本号口径要定**：`AGENTS.md` §5 写「修复 +0.0.1，功能 +0.1.0」。本轮是界面一致性与可访问性修复，严格按语义化应为 **0.29.1**；简报写 0.30.0。判定规则：**若本轮加入用户可感知的新行为**（例如真的尊重 `prefers-reduced-motion`、输入框边界更清楚、新增可访问性设置项），发 0.30.0 成立；**若只改 token 与内部样式、用户看不出区别**，用 0.29.1 更诚实。建议由根代理在实施完成后按实际 diff 拍一次，别在 tag 前才改主意。
- **不发的情形**：首屏 >285,000 且砍不下来；axe 仍留 4.1.2 违规；CI 有任一必过 job 红。此时记 `PASS-WITH-UNVERIFIED` 发 0.29.x 也可以，但不能把 WCAG 缺口写进「已达标」。
- macOS 仍为 ad-hoc、未公证（与 0.29.0 相同，Release 首行已披露），不构成本轮阻塞；配齐 6 个 Apple secrets 之前不要在 README 暗示「已签名」。

## 证据清单

- `.tmp/r16-ship/probe.json`：axe light/dark/settings 结果、reduced-motion 计算值。
- `.tmp/r16-ship/probe2.json`：对比度审计（0 失败）、焦点站点、文本间距、reflow 320/640。
- `.tmp/r16-ship/probe3.json`：21 个 Tab 站点与焦点环、`.tiptap` 焦点样式、reduced-motion 复测、axe `color-contrast` 0/0。
- `.tmp/r16-ship/{contrast,border,bytes,cut}.mjs`：token 比值、边框比值、gzip 增量与砍法测量。
- `shots/round-16/ship-light-1440.png`、`ship-dark-1440.png`、`ship-settings-light.png`、`ship-focus-skiplink.png`、`ship-reflow-720x450-200pct.png`、`ship-reflow-1024x768.png`、`ship-reflow-320.png`、`ship-reflow-640.png`、`ship-text-spacing-1440.png`。
