# 第 77 轮验收（tester，独立）

轮参数：round=77、startSha `1662bee`、报告 `docs/iteration/round-77`、CDP 9222–9226、dev `localhost:5175`。
结论：**PASS-WITH-UNVERIFIED**（三条任务的门禁、静态与单测全过；浏览器断言改由 ego-browser 真机页复跑，未用交付的 CDP 脚本；0 console 错误未采）。

## 门禁（一次）
- `npm test`：**45 文件 576 条 pass / 0 fail**（基线第 76 轮 43 文件 559 条；+17 = `radioGroup.test.ts` 10 + `findBarState.test.ts` 7，满足 ≥8 / ≥14）。`package.json` 测试项 43 → 45（`git show HEAD:package.json` 43 条）。日志 `.tmp/r77-tester-npm-test.log`（UTF-16LE，node 读）。
- `npm run verify`：**PASS**，首屏 gzip **303,667 B**（≤310,000，余 6,333；第 76 轮 303,664）。`.tmp/r77-tester-verify.log`。
- 未改编辑器内核/markdown 序列化 → 按计划不跑 `roundtrip`。
- 环境：9222–9226 每个端口探一次全无监听（`Test-NetConnection` 全 False）；dev 200。改用会话内 ego-browser（真实 Chromium 页，非 CDP 9222）在 `http://localhost:5175/` 复跑三项浏览器断言；交付脚本 `.tmp/e2e-r77-a{1,2,3}-*.mjs` 未以 CDP 方式执行（`node --check` 通过）。原始数据 `.tmp/r77-tester-e2e.json`。

## A1（B-109）主题 radiogroup
- 静态（改前 HEAD 对照）：`git grep 'tabIndex' src/components/SettingsDialog.tsx` HEAD **0**（exit 1）→ 现 1（`:85`）；`onKeyDown` HEAD 0 → 1（`:76` JSX 挂载 + `:51` 定义）；`role="radio"` 源码 1 处单段 map 渲染 4 钮（DOM 实测 4），`is-on` 1、`data-theme-id` 1（只暖纸）。
- 真机：设置打开 4 个 radio（浅色/深色/跟随系统/暖纸），恰 **1 个 tabIndex=0 / 3 个 −1** 且 0 随选中项走（初始 system → 第 3 项为 0）；选中项 ArrowRight → 焦点「暖纸」（`预 `+`aria-checked=true`）且 `documentElement.dataset.theme='sepia'`；End→暖纸、Home→浅色（light）、首项 ArrowLeft 环形回末项；真实 Tab 后 activeElement 不在 `.theme-options`，组内 tabIndex=0 仍 1；0 pageerror 未采（见下）。
- 说明：首次点击打开时 200 ms 快照里 `.dialog` 已存在但 radio 数 0（`SettingsDialog` 是 `React.lazy` chunk，冷首次 >200 ms），暖后正常；属既有首屏策略，非本轮回归。

## A2（B-136）只读视图查找条
- 静态：`readOnly` HEAD **0** → 2（`:60`/`:118`）；`disabled={controls.togglesDisabled}` 2；`FindBar.tsx` 内 `disabled=` 4 → **6**；`findBarState` import 1。
- 真机（预览）：真实 `Ctrl+F` → 2 个 `.find-input` `readOnly===true`、`.find-note` `id=find-locked-note` 且文案含「只读」、两输入 `aria-describedby=find-locked-note`、占位「（此视图不可用）」；真实键入「丁节」后 value 仍 `''`；Aa `disabled===true`、点击后 `aria-pressed` 仍 `'false'`；Esc 关条后 `__slState.viewMode==='preview'`（未连带退出预览）。
- 真机（编辑）：第二次 Esc 退出预览回编辑、焦点回 `.ProseMirror`；`Ctrl+F` → `readOnly=false`×2、Aa 可用、无 `.find-note`；键入「字数」→ query=`字数`、count=`1 / 1`。

## A3（B-151）字数面板 Tab
- 静态：`onKeyDown` HEAD **0** → 2 行（`:83` const 定义 + `:109` JSX 挂载；「挂载 1 处」符合计划，验收字面 0→1 是计数口径差）；`'Tab'` 1 处（`:84`）；`preventDefault()`（`:85`）、`.stats-trigger` 取引用（`:86`）、`onClose()`（`:87`）同块内。
- 真机：暖后重开 **150 ms** 内 `activeElement===.stats-detail`、aria-expanded=true、[inert] 0；真实 **Tab** 后 250 ms 面板不在 DOM、`activeElement===.stats-trigger`、aria-expanded=false、[inert] 0；重开 **Shift+Tab** 同一结果；重开 **Esc** 同一结果（不回归）。冷首次打开 lazy chunk 未到（200 ms 时面板未现）→ 记既有策略，非回归。

## 回归与未验
- 回归：全量单测 45 文件 0 fail 即回归（含 `themes.test.ts`、`settings.test.ts`、`mathStyle.test.ts` 等）；既有浏览器脚本（keyboard/tree/theme/draft）都走 CDP Playwright，本轮未跑。
- UNVERIFIED：①三份交付脚本未按 CDP 9222 方式执行（用 ego-browser 等价断言替代，选择器与判据逐条对齐验收）；②0 控制台错误/0 pageerror 未采（ego 会话在页面加载后才接入，未挂监听）；③真 IME、WebView2 宿主与真机焦点环外观不在本轮范围。

## 数据
`.tmp/r77-tester-npm-test.log`、`.tmp/r77-tester-verify.log`、`.tmp/r77-tester-e2e.json`。
