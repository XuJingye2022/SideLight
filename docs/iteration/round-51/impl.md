# 第 51 轮 A 轮执行报告（executor · impl）

结论：A1 / A2 / A3 全部落地；`tsc --noEmit` 0 行、`npm test` 34 文件 442 条 fail 0、`npm run verify` PASS（首屏 gzip 295,476 B）。`scripts/data-safety-acceptance.mjs` 修好 3 处选择器后仍 exit 1，剩下的是 4 组历史断言过期（非本轮引入），按计划只记录。

## A1（B-006）无改动不写 + 不整篇读回 · DONE

- `requestSave`：`goal==='file'` 且 `!dirtyRef.current` 且落点已知（`saveTargetRef` 或 `fileRef.current.handle`）→ 提示「没有改动，未写入。」并 return；另存为不加门；无落点的新文档不拦。读同步 `dirtyRef`，不读 `dirty`。
- `performCommit`：身份守卫之后，`target` 存在且 `normalized===baselineRef.current` → 清 `dirtyRef`＋`setDirty(false)`，return true，不进 `finishSaved`（N2）。
- 去整篇读回：新增 `src/lib/saveDisk.ts`（`DiskSnapshot{text,size,mtime}` / `byteLength` / `diskSnapshot` / `reusableDiskText`）；`diskRef` ＋ 单 setter `rememberDisk(text|null, handle?)`（null 或无句柄→null；否则存快照，异步 `getFile()` 补 mtime，`diskRef.current===entry` 防竞态）。六处全走它：`:1047`(initial.raw,null)、`:1092`(null)、`:1159`(null)、`:2159`(text,file.handle)、`:2719`(withEol,target.handle)、`:3554`(null)。写前 `getFile()` 只取元数据，size+mtime 全中才用缓存（`''` 有效），否则 `file.text()`；回滚段未改。顺带删掉只写不读的 `fileMtimeRef`。
- E2E `.tmp/e2e-r51-a1.mjs` ＋ 假 FS `.tmp/r51-fsa.mjs`（getFile/text/writable 分开计数，meta 固定、只在 `close()` 后 +1000，`__externalEdit` 经 writable 写）。日志 `.tmp/r51-a1.log`，1 MB 种子 1,000,012 字：
  - 打一字 Ctrl+S：`text=0` / `writable=1` / `close=1` / `getFile=2` / 1643 ms，磁盘含新字；
  - 再 Ctrl+S：四计数全 0，提示「没有改动，未写入。」；
  - 外部改动后打字保存：`text=1`、`writable=1`，磁盘是新正文（不含外部文字）；
  - 空文件打「甲」保存：`text=0`，磁盘 `甲`；
  - 不动字 Ctrl+Alt+S：`writable=1`，`另存为.md` = `甲`。
  - UNVERIFIED：写盘期身份切换的回滚分支造不出（假 FS 写入同步完成）。
- 单测 `src/lib/saveDisk.test.ts` 8 条，已加进 `package.json` 的 test 链。

## A2（B-001+B-011）整页缩放 + 键位分层 · DONE

- `settings.ts`：`pageZoom`（默认 100、`clampPageZoom` 夹 50–200、旧存档读 100）。`App.tsx`：`--page-zoom=pageZoom/100`（无单位倍数，与 `--editor-size` 两条独立链）；`setPageZoom` 照 `setFontSize`；键位插在字号两条之前、用 `event.code` 判 Equal/Minus/Digit0（Ctrl+Shift+= 的 key 是 `+`、Ctrl+Shift+- 是 `_`，原分支接不住）；`productCombo` 补同条；独立 `wheel{passive:false}`，仅 ctrlKey 时 `preventDefault()`、±10、100 ms 节流、提示「页面缩放 N%」。`styles.css`：`#root{zoom:var(--page-zoom,1);height:calc(100vh/var(--page-zoom,1))}`，`height:100%` 与 `.app` 的 1120px 不动。快捷键对话框加三行。
- E2E `.tmp/e2e-r51-a2.mjs`，日志 `.tmp/r51-a2.log`：三次 Ctrl+Shift+= → `1.1/1.2/1.3`；Ctrl+Shift+- → `1.2`；Ctrl+Shift+0 → `1`；每步 `--editor-size` 都 17px；Ctrl+= → 18px 且 pageZoom 仍 `1`；100/110/120% 的 documentElement/body 横纵溢出 0；Ctrl+滚轮 → 110 且后注册的 window 监听读到 `defaultPrevented=true`，再滚 → 120；刷新后 `--page-zoom=1.2`、`#root` 计算 zoom 1.2；console 0。截图 `shots/round-51/impl-a2-zoom-120.png`。130% 按计划不判。

## A3（B-008+B-005）视图钮 aria-pressed + data-safety 选择器 · DONE（脚本门禁部分达标）

- `App.tsx:5054-5105` 四钮加 `aria-pressed`，容器加 `role="group" aria-label="视图"`。改前对照：全文 6（:4912/:4924/:4936/:4943/:4946/:4949）、视图组区间（原 :4956-4999）0；改后全文 10、组区间 4。
- E2E `.tmp/e2e-r51-a3.mjs`，日志 `.tmp/r51-a3.log`：初始四钮全 `false`；点源码 → 源码 `true`、预览 `false`；点预览 → 预览 `true`、源码 `false`（`viewMode==='preview'`），两者互斥；专注、打字机各自 `true`，再点回 `false`；`[aria-pressed]` 10、组内 4、`role=group`；console 0。
- `scripts/data-safety-acceptance.mjs`：`:128` 改 `'.ProseMirror, .source-editor'`；`:148`/`:309` 改 `.ProseMirror`，并在 `edit()` 里先点「回到富文本编辑」——含引用式链接定义的文档自动进源码模式，该模式下 `.ProseMirror` 与 `.editor` 都不在 DOM。
- 结果：先 `node .tmp/reset.mjs 9222` 再跑，仍 **exit 1**。修好后第 1、2 组（引用式链接的确认/取消/再按/写 LF）与新建/普通文档/末尾换行全 PASS；仍 FAIL：`宿主：确认前 postMessage 数 = 0`（实测 2，含 annotations-save）、`宿主：确认后 1 条 save`（含 annotations-save×2、draft-save）、`宿主：成功后 dirty=false`、`表格分隔行损失：弹确认框`＋文案（随后 `cancel()` 超时终止）。证据：`git show HEAD:` 的同一 `edit()` 用 `.editor` 就先超时，脚本改前已断。

## 门禁 / 改动 / CHANGELOG

- `npx tsc --noEmit` 0 行；`npm test` 34/442/fail 0（改前 33/432）；`npm run verify` PASS，gzip 295,476 B（改前 294,913，内部 310,000）。日志 `.tmp/r51-npmtest.log`、`.tmp/r51-verify.log`。
- 改动：`src/App.tsx`、`src/lib/settings.ts`、`src/lib/settings.test.ts`、`src/styles.css`、`src/components/ShortcutsDialog.tsx`、`scripts/data-safety-acceptance.mjs`、`package.json`；新增 `src/lib/saveDisk.ts`、`src/lib/saveDisk.test.ts`、`.tmp/r51-fsa.mjs`、`.tmp/e2e-r51-{a1,a2,a3}.mjs`。未 commit、未改版本、未动 `release/`。被脚本覆盖的 `shots/round-07/t1-confirm-refs.png` 已 `git checkout --` 还原。
- CHANGELOG 建议：保存：无改动不写盘、不再整篇读回旧文件（1 MB 打一个字 0 次全文读取）；整页缩放 Ctrl+Shift+= / - / 0 与 Ctrl+滚轮（与正文字号分开）；视图四钮补 aria-pressed 与分组。

## 新踩坑

1. `.editor` 不是过期选择器：它就在 ProseMirror 元素上（`tiptap ProseMirror editor doc-body`）。换成 `.ProseMirror` 会打断「含引用式链接定义 → 自动进源码模式」的文档，该模式下两个类都不在 DOM；要按模式分派。
2. 假 FS 的 `File.text` 计数要包在原 File 上：写端的 `Blob.text()` 不能算进去，否则「不读盘」断言被写入路径污染。
3. `finishSaved` 只 `setDirty(false)`，`dirtyRef` 靠 `:743` 镜像 effect 回写：`performCommit` 新加的 `normalized===baseline` 短路不进 `finishSaved`，必须自己清 `dirtyRef.current`。
