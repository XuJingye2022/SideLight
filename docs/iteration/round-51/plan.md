# 第 51 轮计划（两轮，planner）· revision 1

- R1–R6 修订（唯一 1 次）；任务与范围不变：A1–A3/B1–B3，不加任务，P2 不动。`round=51`/`nn=51`、`startSha=fb6fe9a`；0.32.1；环境同 BRIEF（CDP 9222，E2E 前 `node .tmp/reset.mjs 9222`）；不 push、不改 `release/`。
- 序 B-006>B-001+B-011>B-013>B-002+B-012>B-008/B-005>B-007；P2 全 deferred（B-003 让位 B-007）。门禁 `tsc --noEmit`/`npm test`/`npm run verify`，动编辑器或序列化加 `roundtrip`；CHANGELOG `## Unreleased`。截图 2 张（A2 120%、B2）。

## A 轮

### A1（B-006，P1）`src/App.tsx`：无改动不写 + 不整篇读回

- 新增 `.tmp/r51-fsa.mjs`、`.tmp/e2e-r51-a1.mjs`。① `requestSave`:2997 只对 `goal==='file'` 短路：`!dirtyRef.current && (saveTargetRef.current || activeFile?.handle)`；**`saveAs` 永不加门**；无落点的新文档不拦（空文档否则存不出）。判据读同步 `dirtyRef`（:621 声明、:911 写），不读 `dirty`。
- ② `performCommit`:2791：仅 `target` 存在时 `normalized===baselineRef.current → return true`（不进 `finishSaved`）。
- ③ 去掉 :2813 整篇读回：`diskRef={text,size,mtime|null}` ＋ 单 setter `rememberDisk(text|null, handle?)`（null/无句柄→null；否则存 `{text, size: 字节长, mtime:null}` 再异步 `getFile()` 补 mtime，`diskRef.current===entry` 防竞态），评审列的 5 处 + 新文档 :1159 全走这一个 setter：:1047 `(initial.raw, null)`（`''` 也是已知）、:2159 `(text, file?.handle)`、:2719 `(withEol, target.handle)`、:1092/:3554 `(null)`、:1159 `(null)`。写前 `file=await getFile()`，text+size+mtime 全中才用缓存（`''` 有效），否则读全文（mtime 未知也读）；回滚 :2837-2845 不动。
- ④ `.tmp/r51-fsa.mjs` 从 `r30-fsa.mjs` 复制改（不改旧文件）：`state.meta` 按 path 存 lastModified（固定初值，不用 `Date.now()`），只在 `writable.close()` 后 +1000；`getFile`/`text`/`writable` 分开计数（包 `File.text`）；`move`/`removeEntry`/`getFileHandle` 同步维护。
- 验收：1 MB `big.md`（bug-4:5-11 种子）打一字 Ctrl+S → `text=0`、`writable=1`、磁盘含新字；再 Ctrl+S → 提示逐字、`writable` 不增；不动字点「另存为」仍写盘（R1）；空文件打「甲」保存 → `text=0`、磁盘含「甲」；外部改动后打字保存 → `text≥1`、磁盘是新正文；`npm test` fail 0；回滚未验记 UNVERIFIED。10 min。

### A2（B-001+B-011，P1）整页缩放 + 键位分层

- 文件：`src/App.tsx`:1801/:1804-1807/:3690/:3891-3904、`src/lib/settings.ts`、`src/styles.css`:107-111、`ShortcutsDialog.tsx:43-49`。
- ① `pageZoom:number`（默认 100，clamp 50–200，`loadSettings` 读 `parsed.pageZoom ?? 100`）；`setPageZoom` 照 :1804-1807 样板。② :1801 旁 `--page-zoom = pageZoom/100`（**无单位倍数**）；`styles.css` 加 `#root{zoom:var(--page-zoom,1);height:calc(100vh / var(--page-zoom,1))}`，:107-111 的 `height:100%` 保留、`.app{min-width:1120px}` 不动。③ 键位**插在 :3891 之前**、`preventDefault()` 后 `return`：`mod && shiftKey && !altKey && ['Equal','Minus','Digit0'].includes(event.code)`（`Ctrl+Shift+=` 的 key 是 `'+'`、`Ctrl+Shift+-` 是 `'_'`，:3891/:3896 接不住，B-011 即此）；:3891-3904 不改；`productCombo`:3699 补同条。④ 独立 effect：`wheel{passive:false}`，仅 `ctrlKey` preventDefault、±10、100 ms 节流、提示「缩放 N%」。⑤ 对话框加三行。
- 验收：三次 `Ctrl+Shift+=`→`1.1/1.2/1.3`、`Ctrl+Shift+-`→`1.2`、`Ctrl+Shift+0`→`1`；**每按一次都断言 `--editor-size` 不变**；`Ctrl+=`→17→18px 且 pageZoom 仍 100；100/110/120% 无横纵滚动条；**130% 不判无滚动**（实测 `.app` 1120×1.3=1456>1440、横条再吃 15px 高 → 横纵都出，属预期）；`Ctrl+wheel`→110 且 `defaultPrevented`；刷新后 120；console 0；截图 `impl-a2-zoom-120.png`；实测依据 `.tmp/rev51-zoom-probe{2,3}.mjs`。9 min。

### A3（B-008+B-005，P1，可砍）

- 文件：`src/App.tsx:4956-4999`、`scripts/data-safety-acceptance.mjs:128/:148/:309`。四钮加 `aria-pressed`、容器 `role="group"`；三处 `.editor`→`.ProseMirror`。
- 验收：初始 false、点击 true、源码/预览互斥；`aria-pressed` 改前 6（都在 :4912-4949）、改后 10，:4956-4999 区间 0→4；脚本 exit 0（别处过期只记录）。3 min。

## B 轮

### B1（B-013，P1）1 MB 载入 110.9 s 热点

- 文件：`src/App.tsx:1001-1025`、`src/lib/{codeScan,html,math}.ts`；新增 `.tmp/e2e-r51-b1.mjs`。
- 步骤：先写基线脚本（种子与 `measure` 照 `.tmp/e2e-r51-bug-4.mjs:5-12`，按 `.at(-1)` 取单遍，加 100 KB 档），**改代码前跑一次**存 `.tmp/r51-b1-before.json`；先 100 KB 看拐点，末了一次 1 MB（24k 节点）；:1013/:1015 加 3 条 dev-only mark 定位，修后删 mark、留原 5 个标签，同脚本跑 after.json。
- 验收：同脚本同 seed `ready` 110.9 s→≤30,000 ms、100 KB ≤3,000 ms；顶层节点数与首末段逐字不变；roundtrip PASS。热点在 `marked`/`tiptap-markdown` 内 → 不加不换依赖，记 profile 前三 + UNVERIFIED。11 min。

### B2（B-002+B-012，P1）全屏 + 宿主缩放钩子

- 文件：`host/Program.cs:1491` 一带、`src/App.tsx`（keydown F11）、`ShortcutsDialog.tsx`。宿主 `IsZoomControlEnabled=false` ＋ `ContainsFullScreenElementChanged`；页面 F11 → `requestFullscreen()`/`exitFullscreen()`，`fullscreenchange` 里写 `documentElement.dataset.fullscreen = String(fullscreenElement !== null)`；对话框加「F11 全屏」。
- 验收：`host\build.ps1` 通过、`host\bin\Sidelight.exe` FileVersion=0.32.1；`git grep -nE 'IsZoomControlEnabled|ContainsFullScreenElementChanged' -- host` 各 ≥1（改前同式 0 命中作对照）；浏览器态**断言 `dataset.fullscreen==='true'`** 且 `fullscreenElement!==null`（只断言后者等于没验代码），再按一次 → `'false'`；宿主内 UNVERIFIED；不改 `AreBrowserAcceleratorKeysEnabled`。7 min，截图 `impl-b2-fullscreen.png`。

### B3（B-007，P1，可砍）

- 文件：`src/App.tsx`（`editorProps`:823-871、`guardBlockInTable`:3678、祖先法 :827-831）。加 `handleTextInput`（直接 props 先于插件 props，`someProp` 先查 `_props`，已核）：`text===' '`、表格祖先内、光标前本段匹配 `^#{1,6}$`/`^[-*+]$`/`^>$`/`^1\.$` → `insertText(' ')` 后 `return true`（字面落字），其余 `return false`（智能标点照常）；命令与粘贴不动。
- 验收：单元格键入 `# 标题` → 只 1 个 `p`、无 heading/blockquote/bulletList，源码含字面 `# 标题`；正文同样键入仍造块；重开 `|` 行不变；工具栏仍提示「表格单元格里不能用命令插入…」。6 min。

A 22 min（10+9+3）+门禁 5；B 24 min（11+7+6）+门禁 5。A3/B3 可砍；A1/B1 超时砍该轮第 3 条。
