# 第 54 轮计划（planner，revision 1）

- revision 1（2026-11-18）：修 `plan-review.md` 的 P1-1/2/3、P2-4/5/6；任务范围不变，B3 未审未改。
- round=54、nn=54、`startSha=b01a4e6`、0.32.1、dev `:5175`、CDP 9222（`reset.mjs 9222`）；不 push、不改 `release/`；CHANGELOG `## Unreleased`。
- 排序：P1（B-003、B-014+B-113、B-112）> 路线图（B-101、B-105）；每轮 25 min；超时砍 B3。
- 不排：B-004（要宿主）、B-115/116、B-108/109/110（P2）；F1/code 草稿副本交根代理。
- 门禁：`npm run verify`、`npm test`（B1 加 `npm run roundtrip`）；E2E 断 console 0；证据 `.tmp/e2e-r54-*`、`.tmp/r54-*`。

## A 轮

### A1（B-003，P1）拖入 `.md`/文件夹直接打开
文件（`src/` 下）：`lib/workspace.ts:116-131`/`:173-184`、`App.tsx:4079-4098`、新 `lib/workspace.test.ts`、`package.json`。
步骤：① drop 内同步 `getAsFileSystemHandle()`；② 句柄→`fileFromHandle`（`MAX_DOC_BYTES`+`.md`）→`requestLoad(text,name,{kind:'file',name,path:name,handle})`（`:2377`），无句柄→`File.text()`+`handle:null`（Ctrl+S 走另存为）；③ 目录→`workspaceFromHandle`→`setWorkspace`+`setSidebarTab('files')`+`ensureTrashDir`；④ 非 md/图片仍提示、多文件开首个、正文拖图给 ProseMirror（`defaultPrevented`）；⑤ effect 依赖 `[show]`→`[show, requestLoad]`（`requestLoad` 抓 `dirty`，`:2384`；否则恒读载入时的值，脏文本被静默替换）。
验收：单测：`fileFromHandle` 正常/超 5.5 MiB/非 md、`workspaceFromHandle` name+root（假句柄）；`.tmp/e2e-r54-a1.mjs` 合成 `DataTransfer` drop→文档名/正文/toast+URL 未变；**脏文本拖入→「切换文档」框（`:5640`）、正文与名不变、取消仍原篇**；`.png` 只旧提示；真实句柄 UNVERIFIED。

### A2（B-014+B-113，P1）整页缩放溢出 + 比例不可见
文件（`src/` 下）：`styles.css:113-134`、`App.tsx:1871-1906`/`:4030-4034`、`components/StatusBar.tsx`。
步骤：① 基线 1440×900、100/130/150/180/200% 的 `documentElement.scrollWidth-clientWidth`（0/26/250/586/810）；② `.app` 的 `min-width` 改 `calc(1120px / var(--page-zoom,1))`，同步 `:113-118` 注释，`overflow:hidden` 与打印块不动；③ 包裹层不加 `overflow`（会裁 `.file-menu`/`.export-menu`）；④ `StatusBar` 加 `pageZoom`/`onZoomReset`：≠100 出「缩放 N%」，点击回 100；⑤ `Ctrl+Shift+=`/`-` 补 `show('页面缩放 N%')`（`:1902`；`Ctrl+=` 仍是字号）。
验收：档位用 localStorage（`sidelight.settings.v1` 写 `pageZoom` 后 reload；`:4030-4034`）。② 已实测 1/1.3/1.5/2 溢出 0。判据：溢出≤0；末位=`.topbar button`/`.toolbar button` 中 `offsetWidth>0` 且 right 最大者，断 `right>0 && right<=innerWidth`（`.rail-toggle` 1440 宽隐藏、宽 0，不能当末位）；130% 有「缩放 130%」、100% 无；点击回 100%（`--page-zoom=1`）；截图 `shots/round-54/a2-zoom-200.png`。

## B 轮

### B1（B-101）`==高亮==`/`^上标^`/`~下标~`（默认关）
文件（`src/` 下 + `package.json`）：新 `lib/inlineSyntax.ts`、`inlineSyntax.test.ts`；`lib/inlineHtmlTags.ts`、`lib/tilde.ts:13-33`、`App.tsx:819-845`/`:1065`、`lib/settings.ts`、`components/SettingsDialog.tsx`。
步骤：① 关（默认）＝今天逐字节不变、单 `~` 守卫照旧；② 开：marked 行内扩展把 `==x==`/`^x^`/`~x~` 出成 mark/sup/sub（`~~x~~` 仍删除线；`~` 须成对）；③ 回写用三个专用 mark：扩展吐 `<span data-sl="eq">` 等独立标签（不与真 `<mark>`/`<sup>`/`<sub>` 共 tag，否则 `inlineMark` 抢），`renderMarkdown` 写回 `==a==`/`^a^`/`~a~`；④ 输入规则打完即转，不打断智能标点/反引号/`---`；⑤ 只注册一次、读实时开关：沿用 `installed` WeakSet（`tilde.ts:5`/`:13-15`），tokenizer 按 `syntaxRef.current` 分支（照 `createSmartTyping({isEnabled})`，`:801`）：开＝认领三对，关＝`loneTildeText`；输入规则同读 ref（`:1059`）。
验收：Node 测：关时 `==a==`/`^b^`/`~c~`/`H~2~O` 往返逐字节同；开时 `==a==`→`eqHighlight` 且回写 `==a==`、`^b^`→sup、`~c~`→sub、`<mark>a</mark>` 仍归 `inlineMark`；`roundtrip` 补三种真标签各一行；`.tmp/e2e-r54-b1.mjs`：开→打 `==高亮==` 出真样式→`Ctrl+/`（`:3584`）textarea 含原串；**同会话关开关不刷新**→`==x==`/`~c~` 保持字面。

### B2（B-112+B-117，P1）差距表计数与拆行
文件：`docs/typora-gap.md:7`/`:44`/`:50`/`:52-58`、`README.md:45`/`:96`、`AGENTS.md:72`/`:74`。
步骤：① 视图缩放、全屏移入「已经有的」：缩放写「`Ctrl+Shift+=`/`-`/`0`、`Ctrl+滚轮` 50–200%、步长 10（`settings.ts:35-37`）」；全屏写「`F11` 有入口，宿主内未验」（`round-53/findings-typora.md:32-34`）；② `:50` 拆两行：`==`/`^`/`~` 移入已有（仅当 B1 落地），TOC/emoji 留缺；③ 计数按表体：B1 落地 35/7、未落地 34/7；`### 视图与界面（3）`→`（1）`；三处同数；④ `README.md:45`、`AGENTS.md:72` 的「100–300%」→「50–200%」（真值 `settings.ts:35-36`）。
验收：`node` 数两表数据行＝表头数；改前已核（`Select-String -Pattern`）：`README.md`「当前已有 32 项，缺 9 项」1、`AGENTS.md`「32 项有」1、`typora-gap.md` 的 `^## 已经有的（32）`/`^## 缺的（9）` 2；改后同命令旧句 0、新句 1；`CHANGELOG:198`、`BACKLOG:30`、`round-48..51` 是历史，不碰。

### B3（B-105）主题体系 MVP：清单 + 1 套内置主题
文件（`src/` 下）：新 `lib/themes.ts`、`styles.css:1`/`:38`/`:68-69`、`lib/settings.ts`、`components/SettingsDialog.tsx:43-70`、`App.tsx`。
步骤：清单 light/dark/system/sepia（暖纸），只做 token 覆盖；radio 由清单生成、`aria-checked` 保持；`ThemeMode` 扩枚举、旧值兼容；Mermaid 重绘沿用 data-theme（第 46 轮）。
验收：`data-theme='sepia'`、computed `--paper`＝清单值、ink/paper ≥4.5:1、刷新仍 sepia、旧三档不变、截图 `shots/round-54/b3-sepia.png`；首屏 ≤310,000。
