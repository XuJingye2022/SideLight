# 第 54 轮测试报告（tester，A 轮）

- 环境：`D:\Documents\SidelightProgram`，轮前 `startSha=b01a4e6`；dev `http://localhost:5175`（未重启）；CDP 9222，E2E 前跑 `node .tmp/reset.mjs 9222`。
- 方法：只读 `plan.md`、`git diff`、源码；未读 `impl.md`；两个 E2E 脚本自写（`.tmp/e2e-r54-tester-{a1,a2}.mjs`）。
- 判定：**PASS-WITH-UNVERIFIED**（A1 真实句柄、A2 宿主 WebView2 未验）。

## 门禁

- `npm run verify` PASS：首屏 gzip **296,610 B**（批前 296,055，+555；内部 310,000 / 硬线 320,000，余 23,390）。
- `npm test` **35 个文件 449 条**全过（批前 34/442；新增 `src/lib/workspace.test.ts` 7 条）。
- 未跑 `roundtrip`：`git diff` 不含编辑器与序列化（`workspace.ts` 不参与 `renderMarkdown`）。

## A1（B-003）拖入 `.md`/文件夹直接打开：PASS

- 单测（`src/lib/workspace.test.ts`，7/7）：`fileFromHandle` 正常读出正文并保留句柄；正好 `MAX_DOC_BYTES`（5.5 MiB）可开、+1 字节返回 `tooLarge`；`.png` 与无后缀返回 `notMarkdown`；`.markdown` 大小写不敏感；`fileFromDrop` 返回 `handle:null`；`workspaceFromHandle` 的 `name`/`rootHandle`/`root` 与「目录在前、按名排序、跳过隐藏项」；`dropHandle` 对合成 `DataTransferItem`（返回 `undefined`）、缺方法、抛错都退化为「无句柄」。
- e2e（自写，合成 `new DataTransfer()` + `DragEvent('drop')` 派发到 window）：
  - `.png`：toast 仅「拖入的文件不会直接打开：请用「文件 → 打开文件」（Ctrl+Alt+O）」，文档名与正文不变。
  - `.md`：名 `未命名.md` → `拖入的笔记.md`，正文含「拖入的正文第一段」，toast「已打开「拖入的笔记.md」」，`location.href` 前后相同。
  - 脏文本（`window.__slState.dirty=true`）拖入 `第二篇.md`：出现 `[role=dialog][aria-label="切换文档"]`，文案「切到「第二篇.md」之前…」；名与正文逐字不变；点「取消」后对话框消失、仍是 `拖入的笔记.md`、正文不变、仍 dirty。0 控制台错误。
- 关键实现核对：`openDropped`（`src/App.tsx:2478-2521`）在 drop 同步段取第一项句柄（`:4175-4179`）；窗口 `drop` effect 依赖 `[show]` → `[openDropped]`（`:4183`），`requestLoad`（`:2386-2412`）闭包因此拿到当下 `dirty` —— 这正是「脏文本被静默替换」的修法，实测生效。
- UNVERIFIED：真实拖放会带 `getAsFileSystemHandle()` 句柄（拖真文件 → `Ctrl+S` 写回原文件；拖文件夹 → 工作区树 + trash），合成事件造不出真句柄；多文件只开首个（只读代码 `:4177-4179`）。

## A2（B-014 + B-113）整页缩放溢出与比例可见：PASS

- 档位：localStorage `sidelight.settings.v1.pageZoom` 写值后 reload（读 `src/lib/settings.ts:83-104`，写 `--page-zoom` 在 `src/App.tsx:1879`）。
- 1440×900 实测（`.tmp/e2e-r54-tester-a2.mjs`）：`documentElement.scrollWidth - clientWidth` = **0 / 0 / 0 / 0 / 0**（100/130/150/180/200%）；末位可见控件（`.topbar button`/`.toolbar button` 中 `offsetWidth>0` 且 right 最大，`.rail-toggle` 宽 0 自动排除）right = 1430 / 1427 / 1425 / 1422 / 1420，均 `>0 且 ≤1440`。
- 比例：130% 状态栏「缩放 130%」，100% 无此按钮；点它 → `--page-zoom=1`、stored 100、按钮消失；`Ctrl+Shift+=` → toast「页面缩放 110%」且按钮「缩放 110%」。
- 产物佐证：`dist/assets/index-BcNqF5p9.css` 为 `.app{…min-width:calc(1120px / var(--page-zoom,1))…}`。
- 截图：`shots/round-54/a2-zoom-200.png`（200% 实拍，标题栏到状态栏均未出屏，右下「缩放 200%」）。
- **环境注记**：同一脚本第一次跑读数仍是改前基线（0/26/250/586/810）——dev server 的 Vite transform cache 对 `/src/styles.css` 仍返回旧字节（`Invoke-WebRequest` 里 `calc(1120px / var(--page-zoom` 0 命中，加 `?t=` 才 1 命中）。只 touch 该文件 mtime（内容不变、未重启 server）后再请求即为新字节，重跑全绿。以后「改了 CSS 没生效」先查 dev server 交付字节，别判产品。
- UNVERIFIED：真实宿主 WebView2 窗口内 130%–200%；`Ctrl+滚轮` 档位（:`1901-1913`，与本轮无关）。

## 回归

- `scripts/session-acceptance.mjs` **18/18 PASS**（切换/写回/恢复路径，与 `requestLoad` 改动同一条）。
- `scripts/filemenu-acceptance.mjs` 5 FAIL + 1 崩溃（`getByRole('button',{name:'＋ 新建文件'})` 超时）：失败断言都在 `.file-tree-demo-note` 与树头按钮名上。该脚本最后改动 round-12（`git log -1` = `971e1ca`），`src/components/TreeActions.tsx` 在 round-21（`584d5e7`）已改，且本轮 diff 不含这两个文件 → 既有脚本过期（同 B-209 类），**非本轮回归**。

## 收尾

- `docs/CHANGELOG.md` 第 54 轮一行；`docs/iteration/STATE.md` 轮次表一行；`docs/iteration/BACKLOG.md` B-003 / B-014 / B-113 标 `fixed`。
- 未 commit 前 `git rev-parse HEAD` 必须与 `b01a4e6` 不同。
