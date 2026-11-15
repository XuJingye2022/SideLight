# 第 04 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T1 → T2 → T3 → T4（串行）。基线 `bff19f9`。未 commit；未跑 `npm run build`（`npx tsc --noEmit` + `npx vite build --outDir .tmp/build-a`）；未装依赖。
边界：`src/**` 与 5 个新脚本（`save-acceptance.mjs`、`filemenu-acceptance.mjs`、`export-acceptance.mjs`、`ime-composition.mjs`、`readonly-acceptance.mjs`）；未改 `package.json`、README、AGENTS、CHANGELOG、`packaging/**`。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 保存有落点 + dirty 基线 | **PASS**（宿主段以 T4 的宿主实跑覆盖，见 D1） | 浏览器 25/25：picker 落盘、10 s 提示仍在、第二次不弹 picker、不支持/取消分支、dirty 六态全过 |
| T2 文件菜单 + 新建/另存为 | **PASS** | 31/31：三态菜单、Esc 焦点、文件夹新建 `未命名.md` 且选中、Ctrl+S 不弹 picker、脏改动取消、另存为、示例徽标 |
| T3 导出当前内容 + 组合输入 | **PASS** | export 7/7（源码标记进 HTML/TXT/MD、文件名跟文档名）；IME 12/12（5 处组合输入、一次 Ctrl+Z、组合中 Ctrl+S） |
| T4 只读横幅 | **PASS** | 宿主 14/14：横幅出现且 8 s 仍在、`readOnly=true`、Ctrl+S 另存新文件、原文件 SHA256 不变、普通文件无横幅 |

## T1 保存必须有落点（`src/lib/workspace.ts`、`src/App.tsx`、`src/styles.css`、`scripts/save-acceptance.mjs`）

### 改动

- `workspace.ts`：新增 `FileWriteTarget`、`SaveAsResult = FileWriteTarget | 'unsupported' | null` 与 `saveAsFile(name, text)`（`showSaveFilePicker` → `createWritable()` 写入；取消返回 `null`；无 picker 返回 `'unsupported'`）。
- `App.tsx`：
  - `notice` 加 `persist?: boolean`，计时器 `notice.persist` 直接跳过（真跳过，不是只改样式）。
  - `baselineRef`（保存基线）与 `saveTargetRef`（另存为落点）；`onUpdate` 改为 `contentRef.current() !== baselineRef.current`，删掉无条件 `setDirty(true)`；源码模式也按基线比较。
  - `finishSaved(name, target, normalized, withEol)`：新句柄写进 `saveTargetRef` **并**构造带 handle 的 `activeFile`（两条路径统一），更新 `docName`、基线、`dirty=false`、`readOnly=false`，提示「已保存 <文件名>」+「另存为」，按旧名与新名各清一次草稿。
  - `commitSave`：有句柄 → `writeNode`；无句柄 → `saveAsFile`；`'unsupported'` → 下载降级 +「无法确认落点…」且 dirty 保持 true；取消 → 「已取消保存」且 dirty 不变。
  - `saveAsCopy`（文件菜单/提示条共用）：重新选落点后走同一 `finishSaved`。
- 基线取「序列化后的正文」而不是原始文本：`joinFrontmatter(frontmatter, joinFootnotes(serializeBody(editor), footnotes))`，否则示例文件末尾换行等规范化差异会让「撤销回原状」仍显示脏（验收六态第 2 条抓到过一次，已修）。

### 证据（`node scripts/save-acceptance.mjs`）

```
打字后 dirty=true / 首次保存调用了 picker / 打桩 picker 下有文件、正文写入 / 首次保存没有走下载
提示含「已保存」与文件名 (已保存 示例 · 未命名.md) / 保存后 dirty=false / 10 秒后「已保存」仍在
第二次保存不再弹 picker (1 -> 1) / 第二次写入同一文件且内容更新 / 第二次保存后 dirty=false
不支持 picker 时有下载 / 提示含「无法确认落点」/ 提示不含「已保存」/ 降级后 dirty 仍为 true
取消后提示「已取消保存」/ 取消后没有「已保存」/ 取消后 dirty 仍为 true / 取消后正文不变
六态 1 打字 true / 2 撤销回基线 false / 3 保存成功 false / 4 保存后再打字 true / 5 再撤销回保存基线 false / 6 载入后初始 false
25/25 PASS
```

截图：`shots/round-04/t1-saved.png`。
宿主段（验收第 6 条）：由 T4 的宿主实跑覆盖——同一 `saveAsFile` + picker 桩在 `.tmp/host-t4` 里跑通（只读文档 Ctrl+S → 另存文件内容含正文、`dirty=false`、提示含「已保存」），见 D1。

## T2 文件菜单 + 新建/另存为（`src/components/FileMenu.tsx` 新、`App.tsx`、`FileTree.tsx`、`styles.css`、`scripts/filemenu-acceptance.mjs`）

### 改动

- 新 `FileMenu.tsx`：顶栏「文件 ▾」四项（新建 / 另存为… / 打开文件… / 打开文件夹…），`aria-haspopup`/`aria-expanded`，Esc 关闭并把焦点还给按钮。
- `App.tsx`：
  - `pendingSwitch` 加 `after?: () => void`；新建走**同一套** dirty 确认（取消则什么都不做），确认后才真正建。
  - `startNewDocument`：真实文件夹 → `rootHandle.getFileHandle('未命名.md', {create:true})`（重名 `未命名 N.md`），把新节点插进树快照后 `loadIntoEditor('', name, file)`；示例/空态 → 空正文 + `未命名.md`。
  - `newDocument`：dirty 时挂起确认（`after`），否则直接建。
- `FileTree.tsx`：真实文件夹树头加「＋ 新建文件」「打开其他文件夹」；示例态显示 `示例` 徽标 + 「改动不写盘，保存会另存为」，不显示「＋ 新建文件」；空态文案改为「先打开一个文件夹，保存才会写回」。
- `styles.css`：`.file-menu-wrap/.file-menu`、`.file-badge`、`.file-tree-demo-note`、`.file-tree-head-actions`。

### 证据（`node scripts/filemenu-acceptance.mjs`）

```
空状态：文件菜单四项 ["新建","另存为…","打开文件…","打开文件夹…"] / 有「打开文件夹」项
菜单 Esc 关闭 / Esc 后焦点回「文件」按钮
示例态：有「示例」徽标 / 写明「改动不写盘，保存会另存为」/ 没有「＋ 新建文件」/ 菜单四项仍在
真实文件夹：树里有已有.md / 树头两个入口 ["＋ 新建文件","打开其他文件夹"]
文件夹新建：未命名.md 出现且 is-active+aria-current / 正文空 / dirty=false
文件夹保存：不弹 picker (0 -> 0) / 磁盘上有 未命名.md / dirty=false
无文件夹新建：未命名.md 且正文空 / dirty=false / 保存走 picker (1) / dirty=false
脏改动新建：弹出未保存确认 / 取消后正文不变 / dirty 不变
另存为：文件名更新 另存为的.md / 新文件含正文 / dirty=false / 提示「已保存」
示例态保存走 picker (0 -> 1) / dirty=false / 不改文件树
31/31 PASS
```

截图：`shots/round-04/t2-demo.png`（示例徽标）、`t2-folder.png`（真实文件夹新建后）。

## T3 源码导出 + 组合输入（`src/App.tsx`、`scripts/export-acceptance.mjs`、`scripts/ime-composition.mjs`）

- `exportAs`：导出前若 `sourceMode` 先 `applySource()` 把源码写回编辑器（不切视图），HTML/TXT 取 `editor.getHTML()/getText()`；Markdown 仍走 `currentMarkdown()`；三个分支共用 `docName`，成功提示带实际文件名。
- `export-acceptance.mjs`：打字 → 切源码 → 追加 `SRC-ONLY-MARK` → 连续导出 HTML/TXT/MD。
- `ime-composition.mjs`：CDP `Input.imeSetComposition` + `Input.insertText` 在正文/标题/代码块/表格/源码五处各一次；**没有改任何输入逻辑**。

### 证据

```
exports: ["示例 · 未命名.html","示例 · 未命名.txt","示例 · 未命名.md"]
HTML/TXT/Markdown 导出含 SRC-ONLY-MARK；文件名跟文档名；HTML 仍含先前正文
7/7 PASS

正文/标题/代码块/表格/源码：组合输入上屏一次 + 一次 Ctrl+Z 撤回整词（10 条）
组合中输入 Ctrl+S 后提交：只上屏一次；页面没有脚本错误
12/12 PASS
```

截图：`shots/round-04/t3-export.png`。

## T4 宿主只读横幅（`src/App.tsx`、`styles.css`、`scripts/readonly-acceptance.mjs`）

- 前置确认：`host/Program.cs:601` 已把 `readOnly:true` 写进注入的 `sidelight.doc.v1`（T5a 已落地），`host/build.ps1` exit 0；按计划重跑后把 `host/bin` 拷成独立 `.tmp/host-t4`，并用 `.tmp/build-a/assets` 覆盖它的 `www`。
- `App.tsx`：`initial.readOnly` 读 `sidelight.doc.v1`；`readOnly` 状态进 `__slState`；正文上方渲染持久 `.readonly-banner`（`role="status"`、无关闭键、带「另存为」）；只读文档的 `saveFile` 直接走 `saveAsCopy`；`finishSaved` 与 `loadIntoEditor` 清只读标记。
- 宿主实例用 `SIDELIGHT_PORT=47831`（避开另一实例占用的 47821）与 CDP 9335 启动，独立副本，不共享 `host/bin`。

### 证据（`node scripts/readonly-acceptance.mjs`，14/14）

```
宿主启动并暴露 CDP (9335)
argv 文档出现只读横幅 / role=status 且有「另存为」/ __slState.readOnly === true / 正文是 argv 内容
8 秒后横幅仍在
只读文档 Ctrl+S 走另存为（新文件含正文）/ 另存为后横幅撤掉、readOnly=false / dirty=false / 提示「已保存 只读另存.md」
原文件 SHA256 前后一致 (21644C2F5720…)
打开文件（有句柄）：没有只读横幅 / readOnly=false / 载入了普通文件内容
14/14 PASS
```

截图：`shots/round-04/t4-readonly.png`（横幅）、`t4-normal.png`（普通文件无横幅，负向断言）。

## 门禁汇总

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 个文件、171 条断言、0 失败
npx vite build --outDir .tmp/build-a  → exit 0，产物合计 1,406,633 B
node scripts/save-acceptance.mjs      → 25/25 PASS
node scripts/filemenu-acceptance.mjs  → 31/31 PASS
node scripts/export-acceptance.mjs    → 7/7 PASS
node scripts/ime-composition.mjs      → 12/12 PASS
node scripts/readonly-acceptance.mjs  → 14/14 PASS
```

## 与计划的偏离

- **D1（T1 宿主段用 T4 的副本覆盖）**：计划要求 `.tmp/host-base`（CDP 9334）跑 T1 第 6 条，但根代理没有留下 `.tmp/host-base`，且固定端口 47821 被另一实例（`.tmp/host-t5a/Sidelight.exe`）占用、`Global\Sidelight` Mutex 会让新实例变成转发器退出。T1 的宿主保存路径（`saveAsFile` + picker 桩 + 内容/dirty/提示）由 T4 的 `.tmp/host-t4` 实跑覆盖；没有单独跑 `.tmp/host-base`。真实系统保存对话框仍是 **UNVERIFIED**（打桩只能验流程）。
- **D2（T4 端口）**：宿主要么固定端口被占、要么 Mutex 冲突，本次用 `SIDELIGHT_PORT=47831`（源码里就是给测试用的覆盖）跑 `.tmp/host-t4`，CDP 9335。只读横幅与保存路径和端口无关。
- **D3（基线取序列化结果）**：计划说「baselineRef 在载入时更新」，实现取 `当前编辑器序列化后的完整 Markdown`；否则「撤销回载入态」与原始文本的规范化差异会让 dirty 六态第 2 条永远为 true（已用脚本复现并修正）。
- **D4（源码 dirty 比较）**：计划写「源码模式比 `sourceText !== sourceBaselineRef.current`」，实现按保存基线 `baselineRef` 比；`sourceBaselineRef` 仍保留给「进源码后是否改过」与草稿判断。原因：从编辑模式带着未保存改动进源码、不改就退出时，用 sourceBaseline 会把 dirty 误清。
- **D5（T1 首次保存的差异框）**：示例文档第一次保存仍会先弹「保存后文件会有这些差异」（既有行为，confirm 后才走 picker）；脚本已处理，正式体验不变。
- **D6（示例态另存为后的树）**：示例工作区另存为只更新文档身份，不往示例树里插节点；验收只要求「不写示例目录」，文件树不变。

## 文件清单

- 修改：`src/App.tsx`、`src/lib/workspace.ts`、`src/components/FileTree.tsx`、`src/styles.css`
- 新建：`src/components/FileMenu.tsx`、`scripts/save-acceptance.mjs`、`scripts/filemenu-acceptance.mjs`、`scripts/export-acceptance.mjs`、`scripts/ime-composition.mjs`、`scripts/readonly-acceptance.mjs`、`docs/iteration/round-04/impl-a.md`
- 截图：`shots/round-04/t1-saved.png`、`t2-demo.png`、`t2-folder.png`、`t3-export.png`、`t4-readonly.png`、`t4-normal.png`
- 宿主测试副本（`.tmp/`，不入库）：`.tmp/host-t4`（T4 用，含最新 www）、`.tmp/readonly-doc.md`
- 未 commit；未跑 `npm run build`；未改 `package.json`/README/AGENTS/CHANGELOG/`packaging/**`

## 遗留

1. 真实系统保存对话框（T1）与安装版 IME 是 **UNVERIFIED**：只能打桩/浏览器验证，需一次真人安装版操作。
2. T1 验收第 6 条没有按计划在 `.tmp/host-base` 单独跑（见 D1）；宿主保存路径由 T4 覆盖，如果 tester 要求分项证据，可在没有其它宿主实例运行时补跑 `.tmp/host-t4` + picker 桩（脚本现成）。
3. 示例工作区「另存为」后新文件不在示例树里（D6），属预期；若产品要求显示，另开任务。
