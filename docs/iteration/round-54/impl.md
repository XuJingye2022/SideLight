# 第 54 轮实现报告（executor）

- round=54、startSha `b01a4e6`、0.32.1；未 commit/push。
- **A1 DONE / A2 DONE**（A2 度量口径见踩坑 1）。

## A1（B-003）拖入 `.md` / 文件夹 → DONE

改动：
- `src/lib/workspace.ts:113` `workspaceFromHandle`（`pickWorkspace:131` 复用）；`:249-291` `DroppedFile`/`inspectDropped`（只收 `.md`/`.markdown`，超 `MAX_DOC_BYTES` 拒）/`fileFromHandle`/`fileFromDrop`（无句柄 `handle:null`）/`dropHandle`（同步取句柄，`undefined` 与 reject 都当没句柄）。
- `src/App.tsx:2478-2542` `openDropped`：目录→工作区+文件页签+`ensureTrashDir`；文件→`requestLoad`；非 md 只给旧提示。`:4160-4186` drop 监听在同步段取 `items[0]` 句柄、多文件开首个、`defaultPrevented` 让给 ProseMirror。
- `src/App.tsx:2386-2412` `requestLoad` 返回 `loaded|confirm|same|stale`；`:2435` `tooLargeNote` 改 `useCallback([])`。
- 新增 `src/lib/workspace.test.ts`（7 条）；`package.json` test 链追加。

证据：
- 单测 7 pass：正常 / 5.5 MiB 放行 / +1 字节拒 / `.png`、无后缀、`.MARKDOWN`。
- `.tmp/e2e-r54-a1.mjs`（reset 9222 后跑，输出 `.tmp/r54-a1.json`）：
  - drop `r54-drop.md`：名/正文正确、toast「已打开「r54-drop.md」」、URL 未变、0 error。
  - 改动后 `Ctrl+S`：`showSaveFilePicker` 打桩被调 1 次 → 走另存为（「已取消保存。」）。
  - 脏文本 drop：`[aria-label="切换文档"]` 出现、名与正文不变；点取消→框关、仍原篇。
  - drop `图.png`：只出旧提示，文档不动、0 error。
  - drop 文件夹（假句柄）：树出现「r54-docs / 甲.md / 乙.md」、toast「已打开文件夹「r54-docs」」。
- **真实 FSA 句柄 UNVERIFIED**（合成 drop 拿不到真句柄，目录/句柄分支靠假句柄）。

## A2（B-014+B-113）缩放溢出 + 比例可见 → DONE

改动：`src/styles.css:133-134` `.app` `min-width` → `calc(1120px / var(--page-zoom, 1))`；`src/components/StatusBar.tsx:89` 加 `status-zoom` 按钮（≠100 显示「缩放 N%」，点击回 100）；`src/App.tsx:5604` 传参、`:1895` `resetPageZoom`；`:4109-4121` `Ctrl+Shift+=`/`-`/`0` 补 `show('页面缩放 N%')`（`Ctrl+=` 仍是字号）。

证据（1440×900，`.tmp/r54-a2.json`，errors `[]`）：

| 档位 | overflowX 改前→改后 | appRight | 末位按钮 right | 缩放 chip |
| :--- | :--- | :--- | :--- | :--- |
| 100% | 0 → 0 | 1440 | 1430 | 无 |
| 130% | 26 → 0 | 1440 | 1427 | 有，在视口内 |
| 150% | 250 → 0 | 1440 | 1425 | 有 |
| 180% | 586 → 0 | 1440 | 1422 | 有 |
| 200% | 810 → 0 | 1440 | 1420 | 有 |

130% 点 chip → `--page-zoom=1`、chip 消失、落盘 100；`Ctrl+Shift+=` → toast「页面缩放 110%」。截图 `shots/round-54/a2-zoom-200.png`。

## 门禁

`tsc --noEmit` 0 error；`npm test` **35 文件 449 条 0 fail**；`npm run verify` PASS，首屏 gzip **296,610 B**（内部预算 310,000）；`roundtrip` 未跑。

## CHANGELOG 一行建议

- 拖入 `.md` 或文件夹直接打开（拖图仍交正文；脏文本先问「切换文档」）；整页缩放 130% 起不再横向溢出，状态栏「缩放 N%」可点回 100%。

## 新踩坑

1. **dev server 的 `/src/styles.css` 变换缓存不失效**：磁盘已改、`GET /src/styles.css` 与 `?t=<新 mtime>` 仍是旧内容；`?x=1`、`?direct` 才是新内容。WS 发 `vite:invalidate`（两种 payload）无效；同 server 的 App.tsx 改动正常。A2 因此用 `<link href="/src/styles.css?direct">` 复挂磁盘 CSS；`dist/assets/index-*.css` 含新规则。tester 复测建议先重启 dev server。
2. **`requestLoad` 成功提示必须在 `await` 之后**：`loadIntoEditor` 会 `setNotice(null)`，先 `show()` 的 toast 立刻被清掉。
3. **`FileSystemHandle` 不能按 `kind` 收窄**（非 union）：句柄变量要声明为 `FileSystemFileHandle | FileSystemDirectoryHandle | null`，否则 TS2740/TS2739；合成 `getAsFileSystemHandle()` 返回会 reject 的 Promise，必须 try/catch + 判 `.then`。
