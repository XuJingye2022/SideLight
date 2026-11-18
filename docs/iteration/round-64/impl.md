# 第 64 轮执行报告（executor）

参数：round=64 / 轮前 `368431c` / 0.32.1 / dev `:5175` / CDP 9222。状态：**A1、A2 完成，两脚本全过**；未 commit、未改版本与 `release/`。

## A1（B-115）源码态保留编辑器 — 完成

`src/App.tsx`（+34/−5）、`src/styles.css`（+15）。
1. 三元拆三段（`App.tsx:5584-5625`）：源码/预览块照旧卸载；编辑块 `{!previewMode && …}` 常驻 + `hidden={sourceMode}`，`EditorContent`/`MarginRail` 不卸载。
2. `.source-hidden` 恒加：`display:grid !important; height:0; min-height:0; padding:0; overflow:hidden; visibility:hidden; scale(0)`。`!important` 压 `[hidden]{display:none!important}`（`styles.css:135`），`min-height`/`padding` 见踩坑 3。
3. `sourceScrollTopRef`：`enterSourceFor`（`fromLoad` 不计，否则载入即源码会带回上一篇位置）与 `switchView` 进源码前记录，`restoreSourceScroll()` 双 rAF 还原。

实测（`.tmp/e2e-r64-impl-a1.mjs` 是 `.tmp/e2e-r53-tester-a1v2.mjs` 的逐字节副本、仅输出改 `.tmp/r64-impl-a1-after.json`；`.tmp/r64-impl-a1.log`）：big.enterTotal p50 **1234**（≤1,500）、big.exitTotal p50 **302**（≤600）、longTask 进/出最大 **1252/226**（无 >2,500）、scrollDiff 全 0、shapeOk、每轮 `inSrc.display='grid'`、srcHash **1557349733**、parse 3→3、preview.pmCount 0、consoleErrorCount 0；small.enter/exit p50 **125/56**（≤200）。
功能（`.tmp/e2e-r53-tester-func.mjs`，`.tmp/r64-impl-a1-func.log`）：源码追加一段→Esc→正文含新内容、`focusInEditor:true`；hidden 期 `focus()` 无效。**Ctrl+Z 撤不掉是既有设计**（`addToHistory:false`），只记录。

## A2（B-137）大纲跟随当前章节 — 完成

`src/components/Outline.tsx`、`src/lib/outlineTree.ts`、`src/lib/outline.test.ts`。
1. `rows`/`visibleId` 改 `useMemo`（rows 引用要稳）；条目加 `data-outline-id`。
2. 纯函数 `nearestScrollTop()`（`outlineTree.ts:61-86`）：已可见（±1）原样返回，越界只补最小距离并夹 `[0,maxScrollTop]`；单测 4 条（上/下/已可见/夹住），`outline.test.ts` 10→14。
3. `asideRef` + `useEffect([visibleId, rows])`：一帧后量矩形再写 `scrollTop`。容器取 `.outline` 的 `parentElement`（不用 `querySelector`）；矩形全 0 跳过；可见区用内边距盒。

实测（`.tmp/e2e-r64-impl-a2-outline-follow.mjs` **26 条全过、0 error**，数据 `.tmp/r64-impl-a2-outline-follow.json`）：改前 `.tmp/r64-ui-a.json` 的 `outlineActiveScroll.visible=false`；点正文 h2「第40节」（先滚 `.doc-scroll` 再 `page.mouse.click`）→ `scrollTop=466`、当前条 832–856 在容器 120–872 内、焦点不在大纲、`window.scrollY=0`；点 h1「甲章」→ `scrollTop=0`；手滚 200 → 500 ms 后仍 200；折叠「第8节」h3 消失再展开回现；折叠「第40节」后点正文 h3 → 祖先自动展开、h3 行回现且在容器内。截图 `shots/round-64/a2-outline-follow.png`。

## 门禁

`npx tsc --noEmit` 0；`npm test` **40 文件 517 条 0 fail**（`.tmp/r64-exec-test.log`）；`npm run verify` **PASS** gzip **300,971 B**（内部余 9,029；改前 300,727，+244 B；`.tmp/r64-exec-verify.log`）。`roundtrip` 未跑：只改视图挂载/CSS/大纲组件，未动 markdown 序列化。

## CHANGELOG 建议（`## Unreleased`）

- `源码模式不再卸载编辑器：1 MB 文档切源码不再冻结（进 9.8 s→1.2 s、出 2.1 s→0.3 s），进出保留阅读位置。`
- `侧栏大纲跟随当前章节：长文里当前节自动滚进可见区（越界才滚），折叠祖先后点正文子标题会自动展开。`

## 踩坑（新，3 条）

1. 按边框盒算跟随滚动，回顶停在 scrollTop=2：`.file-tree-list` 有 `padding:2px 6px 16px`，可见区要改用内边距盒。
2. 折叠祖先后再点同一处正文 h3 不自动展开（选区没变就没有 selectionUpdate），E2E 先把光标挪到 h2。
3. `.source-hidden` 的 `display:grid` 必须 `!important` 且配 `min-height:0`+`padding:0`，否则隐藏块会被撑回 272px。
