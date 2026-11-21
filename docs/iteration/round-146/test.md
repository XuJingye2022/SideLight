# 第 146 轮（B 轮）tester 独立验收

结论 **PASS**。未读 `impl.md`；依据 `docs/iteration/round-145/plan.md` B 段、`git diff`、`BACKLOG.md`、自写 E2E。轮前 startSha `56b1601`。

## 环境偏差
- 5175 开工无监听（`node fetch` ECONNREFUSED）→ tester 起 `npx vite --port 5175 --strictPort`；57270 无监听 → ego Edge 实际调试端口 **60843**（`browser.json`，同第 145 轮）。

## 门禁
- `npm run verify` exit 0 **PASS**：门 **319,489 B** / 常驻 **4,486 B** / 真实首载 **323,975 B**（`headroom=none`；310,000 内部预算只 WARN；第 144 轮起只记录；对 145 轮 +1,037）。
- `npm test` **74 文件 1028 条 0 fail**（73→74：`autoRefresh.test.ts` 6 条 + `settings.test.ts` 4 条）；`roundtrip` 不跑（未动编辑器/序列化）。
- 无新运行时依赖、未升 `SETTINGS_VERSION`（settings.test 断言仍 2）、版本仍 0.32.2、未动 `release/`。

## B1 左栏拖宽 200–480 + 记忆；右栏把手常显
自写 `.tmp/e2e-r146-tester.mjs`（CDP 60843、1440×900、假 FSA、`autoSave:false`、先 `reset.mjs`）**29/29 PASS、0 pageerror**：
- 初始 218 → 拖 +102 → **320±2**，`localStorage.sidelight.settings.v1.sidebarWidth=320`（抬手落盘）→ reload 仍 **320**。
- 拖到 x=1430 → **480**；拖到 x=1 → **200**；←/→ 键 200→216→232→**216**（−16），`aria-valuenow` 同步。
- 把手：`role=separator`、`aria-orientation=vertical`、`aria-valuemin/max=200/480`、`tabIndex=0`；`Ctrl+Shift+L` 收起 → **44** + 把手 0，再展开回 **216**。
- 右栏 `.rail-resize::before`：`content:'""'`、**2×28 px**、`rgb(228,223,212)`（`--line`，非透明）；键盘聚焦 `:focus-visible` 真、outline **2 px solid**；**1024×700** 两把手 `getClientRects` **0**（`display:none`）。
- 截图 `shots/round-146/sidebar-drag.png`（1440×900，左栏 320 + 竖条）。

## B2 目录变化自动刷新（focus + 可见轮询，不打断当前文档）
同脚本 S3/S4（夹具 `a.md`/`b.md`/`sub/x.md`；先删 `window.FileSystemObserver` 走轮询）：
- 展开 `sub/`、开 `a.md` 打字（dirty=1）后假 FS 加 `sub/new.md` → 派发 `window.focus` → **2.35 s** 树出现（≤3.5 s），`sub/` 仍展开、无「已刷新」toast。
- 正文 `innerText`/`docName`/dirty=1/`activeElement`（`.ProseMirror…ProseMirror-focused`）**逐项不变**；`sl-parse-done` **3→3**、假 FS `getFile` **3→3**（不重解析、不读正文）。
- 删非当前 `b.md` → 派发 focus → **8 ms** 行消失（focus 触发路径真在跑，非只靠 2.5 s 轮询），当前篇/dirty 不变；全程工作区写盘 **0**（仅既有 `.sidelight/drafts/a.md` 停笔草稿，红线允许）。
- 静态：`refreshTree` 的 `background` 分支三处 `if (!background)` 守卫 + `treeSignature` 比较；effect 依赖 `workspace?.rootHandle`、cleanup 断 observer/清 interval/移监听；`FileTree` 无 `key`（实测 `sub/` 仍展开）。
- 截图 `shots/round-146/auto-refresh.png`（`sub/new.md` 出现）。

## 回归
- `keyboard-acceptance`（5175 + 60843）**52/52 exit 0**；跑后 `git checkout -- shots/round-05/`。
- `theme-acceptance` **未通过且与本轮无关**：第 78 行等「设置」按钮，第 143 轮已把它移进「文件 → 帮助」菜单，脚本过期；只记不判回归。

## 观察（不判 FAIL）
- 3 次 E2E 中 1 次 `activeElement` 掉 `body`（另 2 次含终跑保持正文焦点）；两次对照实验（只打字 5 s、展开 `sub/` 后背景刷新）焦点都保持，新增 `window.focus` 监听只排刷新不碰焦点 → 判浏览器/标签焦点抖动。
- S3 的 2.35 s：派发时正好落在 2.5 s 轮询后 800 ms 节流窗内，被 `MIN_GAP_MS` 挡下后由轮询补上；S4 的 8 ms 证明 focus 路径本身可用，两处均在 ≤3.5 s 内。

## 未验（UNVERIFIED）
- 真 WebView2/macOS 宿主、真实中文 IME、真实 FSA（`getFileHandle` 失败分支本轮未触发）。
- `FileSystemObserver` 真回调 300 ms 合并（只验到合成句柄 observe 失败退回轮询 + 静态代码）、`visibilitychange`→visible 补刷分支只静态核对、`pageZoom≠100%` 拖拽换算未测、指针离开窗口丢 pointerup 的拖拽中断未测。

## BACKLOG
- B1/B2 在 `BACKLOG.md` 无对应行（计划新增项），不改；B-273 仍 `open`。

commit 见 `git log -1`（HEAD 已不同于 startSha `56b1601`）。
