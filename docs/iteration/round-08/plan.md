# 第 08 轮 · 计划（rev2）

基线 `94ceeda`（v0.20.0）。5 个任务：A 组（builder，前端）T1→T2→T3→T4 串行；B 组（builder2，宿主/发布）T5 并行。本轮先堵数据丢失，最近文件不做。
**构建纪律**：任何实施者不跑 `npm run build`。A 用 `npx tsc --noEmit` 与 `npx vite build --outDir .tmp/build-a`，宿主验收用 `.tmp/host-a` 副本（`Copy-Item host/bin .tmp/host-a -Recurse`，覆盖 `.tmp/build-a/*` 进 `www`，CDP 9340）。B 用 `host/build.ps1`，产物与探针在 `.tmp/host-b`（CDP 9341）。`package.json` 只归 T5，`package-lock` 由根代理同步。

## T1 宿主文档草稿兜底与恢复提示（B1/H2/H5）｜A 组（builder，先做）

- **目标**：宿主打开的文档也有草稿落点；编辑时经 `draft-save` 写到文档同目录 `.sidelight/drafts/<cacheKey>.md`（与浏览器同一套键）；启动时草稿比原文件新就提示「恢复 / 丢弃」；保存成功后干净清掉，不留旧草稿。
- **为什么现在**：B1/B5 实测宿主模式**哪也不写**（`App.tsx:589-596` 跳过 localStorage、无目录句柄），关窗即永久丢失；`.sidelight/drafts` 只写不读；现有 `cacheKey` 与宿主若各用一套键，读不到同一份草稿。
- **文件**：`src/App.tsx`、`src/lib/cache.ts`、`src/lib/cache.test.ts`、`src/components/StatusBar.tsx`、`scripts/draft-acceptance.mjs`（新）
- **步骤**
  1. **键统一（H5）**：`cacheKey` 保持现有算法（去扩展名、非法字符换 `-`、40 字符截断）；**只有清洗后长度 >40 时**在 40 位后缀加 `-<4 位哈希>`，长度 ≤40 的文件名键**逐字节不变**（既有草稿与批注不搬家）。`readCache` 先读新键、未命中再读旧截断键（回读），命中后写回新键并删旧键；草稿与批注共用同一套键，不许只改草稿。`cache.test.ts` 加两条：「长名不撞」「旧键回读」。
  2. 协议客户端：`postMessage({v:1,type:'draft-save',id,text})` → `draft-save-result`；`{v:1,type:'draft-clear',id}` → `draft-clear-result`；启动 `GET /__draft`（`loadHostDraft()`，404 = 无草稿）。
  3. 启动：`/__doc` 成功后取 `/__draft`；`exists && draft.mtime > doc.mtime` → 「有比原文件更新的草稿（保存于 <时间>）。恢复它，还是丢弃并打开原文件？」；恢复 → 草稿正文 + `dirty=true` + 基线仍取**原文件正文**（不把草稿当原文）+ 状态栏「草稿已恢复」；丢弃 → 发 `draft-clear` 再载入原文。
  4. 编辑期兜底：宿主文档 `onUpdate` 后 800 ms 防抖发 `draft-save`，记 `draftGeneration`；**保存成功时序（H2）**：`save-result ok` → `clearTimeout(draftTimer)` → 等当前 `draft-save-result`（或 1 s 超时）→ 发 `draft-clear` 并 `draftGeneration++`；此后旧 generation 的迟到回包一律丢弃，直到下一次 `onUpdate` 才允许新草稿。
  5. 另存为成功同样按第 4 步清宿主草稿。
  6. `scripts/draft-acceptance.mjs`：浏览器段 mock `/__doc`/`/__draft` 并拦截 `postMessage`；宿主段用 `.tmp/host-a`（T5 落地后由根代理放行）。
- **验收（脚本全 PASS）**
  1. mock 宿主：编辑 3 字 → 800 ms 后 1 条 `draft-save`（`text` 无 `\r`），再编辑只新增一条（防抖合并）。
  2. mock `/__draft` 的 `mtime > doc.mtime` → 出现恢复框；恢复 → 正文 = 草稿、`dirty === true`、`rawTextRef` 仍是原文件正文（切源码显示原文）；丢弃 → 正文 = 原文 + 1 条 `draft-clear`。
  3. 保存成功：`draft-clear` 发生在 `draft-save` 之后；模拟「clear 后迟到的 draft-save-result」→ 不再写草稿、无二次 clear。
  4. `cacheKey`：40 字符以内名字与旧实现**逐字节相同**；两条 45 字符同名前缀 → 键不同；旧键文件存在时 `readCache` 能读到。
  5. 宿主段（`.tmp/host-a`）：编辑 → 关窗 → 重开出现恢复提示且内容一致（T5 后跑）。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/draft-acceptance.mjs`
- **风险与回退**：mtime 秒级同秒时以「草稿存在且内容不同」为准；`cacheKey` 迁移若写错会读不到旧批注，第 4 条验收兜住。回退：`git checkout -- src/` 并删脚本。
- **难度** M ｜ **量级** 170–240 行

## T2 关闭保护：浏览器 beforeunload + 宿主三选一（B2/U1/H4）｜A 组（builder，T1 后）

- **目标**：浏览器有未保存改动时关页能拦一下（自动保存排队时不打扰）；宿主关窗弹「取消 / 保存草稿并关闭 / 放弃并关闭」，显式聚焦「取消」，不叠模态、不静默退出。
- **为什么现在**：B2/U1 实测浏览器无 `beforeunload`（`src/` 零命中），宿主只有 `FormClosed` 日志（`Program.cs:131`），点 × 直接丢。
- **文件**：`src/App.tsx`、`src/components/CloseGuardDialog.tsx`（新）、`src/styles.css`、`scripts/draft-acceptance.mjs`（扩用例）
- **步骤**
  1. 浏览器：`useEffect` 在 `dirty && !autoSaveScheduled && !saving` 时注册 `beforeunload`（`preventDefault(); returnValue=''`），条件不满足时移除；文案交给浏览器系统串。
  2. 宿主：收到 `{v:1,type:'close-request'}` → 若 `pendingConfirm`/`pendingSwitch`/`saving` 存在，先置 `closeRequested=true` 排队，等当前模态/回包结束后再弹「关闭确认」；同一时刻只允许一个模态。
  3. `CloseGuardDialog`：复用 `.dialog` + `useDialogFocus`，但**用 `cancelRef.current?.focus()` 显式把焦点放到「取消」**（不依赖 DOM 顺序）；三个按钮回 `{v:1,type:'close-answer',action:'cancel'}` / `{action:'save-draft',text}` / `{action:'discard'}`。
  4. 文案：「「<文件名>」有改动还没写回文件。现在关窗，这些改动会丢失。」按钮「取消 / 保存草稿并关闭 / 放弃并关闭」（主按钮最右）；`save-draft` 的 `text` 取当前 `prepareSave().normalized`。
  5. 切文档对话框的「放弃改动」改「不保存」，与关窗同词。
- **验收（扩脚本）**
  1. 浏览器：改 3 字 → `page.close({runBeforeUnload:true})` 触发 dialog；`autoSaveScheduled` 为真或 `saving` 时不注册（脚本断言 `onbeforeunload === null`）。
  2. mock 宿主发 `close-request` → 对话框出现、`activeElement` 是「取消」（显式 ref）；点取消回 `cancel`，页面可继续编辑。
  3. 「保存草稿并关闭」→ 回包含 `action:'save-draft'` 与 LF 正文；「放弃并关闭」→ 回包只有 `action:'discard'`。
  4. 排队：先打开设置（`pendingConfirm` 用 mock 制造）→ 发 `close-request` → 不叠第二个对话框；关掉设置后才出现关闭确认。
  5. 宿主真实路径（`.tmp/host-a`，T5 后）：写 3 字 → 点 × → 对话框出现、窗口不关；三按钮各验一次。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/draft-acceptance.mjs`
- **风险与回退**：WebView2 里页面 `beforeunload` 不可靠，宿主必须自己拦（T5）；排队逻辑若丢事件会关不掉窗。回退：`git checkout -- src/` 并删组件。
- **难度** M ｜ **量级** 150–210 行

## T3 自动保存安全子集（B3/B4/H3）｜A 组（builder，T2 后）

- **目标**：停笔 2 秒后自动写盘（默认开、设置可关），但只在安全条件下写；不绕过第 7 轮差异门、**绝不弹差异框**、不写半截 IME、不在外部修改后覆盖；失败降级草稿并可见，不重试风暴。
- **为什么现在**：B3 实测 IME 组合期间 `onUpdate` 已触发；B4 实测自动保存若走普通 `requestSave`，`losses>0` 会 `setPendingConfirm` 弹框，既打扰又可能写掉引用式链接/表格；浏览器 FSA 没有外部修改检查。
- **文件**：`src/App.tsx`、`src/lib/settings.ts`、`src/components/SettingsDialog.tsx`、`src/components/StatusBar.tsx`、`scripts/draft-acceptance.mjs`（扩用例）
- **步骤**
  1. `requestSave` 加 `mode: 'user' | 'auto'`（默认 `'user'`）。**auto 模式**：`activeLosses.length > 0` → 不写、置状态栏「需手动保存」、**绝不 `setPendingConfirm`**；`pendingConfirm`/`pendingSwitch`/`closeRequested`/`saving` 任一为真 → 本次跳过（不排队重试）。
  2. `Settings.autoSave: boolean`（默认 `true`，`loadSettings` 缺省兼容）；设置里加「自动保存（停笔 2 秒）」，小字「只写回已打开的文件；宿主文档另存草稿」。
  3. `composingRef`：`compositionstart` 置位、`compositionend` 后 400 ms 才允许触发。
  4. 触发：`onUpdate` 后 2 s 防抖 → 触发时**重算** `activeLosses` 与 `dirty`，条件全满足才调 `requestSave({mode:'auto'})`；目标可写（宿主 `hostDoc.writable` 或文件句柄）；写前比 `hostDoc.mtime` / `handle.getFile().lastModified` 与打开时记录。
  5. 反馈：成功 → 状态栏 chip「已自动保存 HH:MM」；有损失 → 「需手动保存」；失败/超时 → 红色「自动保存失败」+ 写一次草稿，连续 3 次后停 auto 直到手动保存成功；外部修改 → 「文件已被外部修改」并暂停，提示另存为。
  6. 保存/另存为/新建/切文档时 `clearTimeout`，并清 `autoSaveScheduled`。
- **验收（扩脚本）**
  1. 可写文件打一字停 2.2 s → 写入 1 次、chip「已自动保存」、`dirty === false`。
  2. 打开 `04-reference-links.md`（`activeLosses > 0`）停 2.2 s → **写入 0 次**、chip「需手动保存」、**无 `pendingConfirm` 对话框**。
  3. **排队后变脏**：先排入 auto（当时 losses=0），在 2 s 内输入 `[` 使 losses 非空 → 不写、不弹框、chip 变「需手动保存」。
  4. `pendingConfirm` 打开时 auto 不触发（写入次数不增）。
  5. `compositionstart` → 打字 → 2.2 s 内不写；`compositionend` 后 400 ms 才可能写。
  6. 设置关闭 → 2.5 s 无写入；`createWritable` 抛错 → 写一次草稿、chip 红色，连续 3 次后不再尝试。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a; node scripts/draft-acceptance.mjs`
- **风险与回退**：自动保存与差异门、宿主写回队列、切文档三处竞态；2 s / 400 ms 常量集中一处。回退：`git checkout -- src/`。
- **难度** M–L ｜ **量级** 200–280 行

## T4 设置面板与文件菜单临界修复（U2/U4/H6）｜A 组（builder，T3 后）

- **目标**：1366×768 与 1024×768 下设置面板不裁「保存」按钮（可滚动、按钮 sticky 且在视口内）；文件菜单不折行、超长标签用省略号而不横向溢出。
- **为什么现在**：U2 实测 1366×768 面板高 780、上边 −6、保存按钮底 753，再加一行「自动保存」后底 779 > 768；`.dialog` 无 `max-height`/`overflow`（`styles.css:849-856`）。U4 实测「打开文件夹…」已折三行（高 94 px）。
- **文件**：`src/styles.css`、`src/components/SettingsDialog.tsx`（必要时容器 class）
- **步骤**
  1. `.dialog { max-height: calc(100vh - 40px); overflow-y: auto }`（`overlay` 内边距 20 px ×2，H6）；`.dialog-actions { position: sticky; bottom: 0; background: var(--paper-raised); padding-top: 8px }`；`.dialog-note` 不 sticky。
  2. `.file-menu { width: max-content; min-width: 208px; max-width: min(360px, calc(100vw - 24px)); overflow: hidden }`；`.file-menu button { white-space: nowrap }`；菜单项内文字容器加 `overflow: hidden; text-overflow: ellipsis; min-width: 0`（`kbd` 不收缩）。
  3. 四档视口（1440×900 / 1280×800 / 1366×768 / 1024×768）复测面板与菜单。
- **验收**
  1. 四档：`dialog.getBoundingClientRect().top >= 20`、保存按钮 `bottom <= innerHeight - 20`；内容超高时可滚动到按钮；截图 1366×768 一张。
  2. 文件菜单四项 `height <= 40`、`white-space === 'nowrap'`、每项 `scrollWidth <= clientWidth`（超长标签截断不溢出）；截图一张。
- **门禁**：`npx tsc --noEmit; npm test; npx vite build --outDir .tmp/build-a`
- **风险与回退**：sticky 按钮在短面板下有遮挡感，用纸面背景对齐；滚动条出现会改变宽度。回退：`git checkout -- src/styles.css`。
- **难度** S ｜ **量级** 40–70 行

## T5 宿主草稿协议、关窗三选一、0.21.0 文档（S1–S3/H1）｜B 组（builder2，与 A 并行）

- **目标**：宿主提供 `draft-save`/`draft-load`（`/__draft`）与 `FormClosing` 三选一配合；新增 ADR-0008；版本 0.21.0 与文档、体积预算。
- **为什么现在**：B1 证明宿主文档没有任何草稿落点；B2 证明宿主关窗静默；S1–S3 要把 CI `.tmp` 坑、体积与文档同轮收口。
- **文件**：`host/Program.cs`、`host/draft-probe.mjs`（新）、`docs/adr/0008-host-draft-and-close-guard.md`（新）、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`package.json`
- **步骤**
  1. **草稿键（H2/H5）**：宿主用与 `src/lib/cache.ts` 相同的 `CacheKey()` 算法（去扩展名、非法字符换 `-`、40 截断、超长加 4 位哈希），路径 = `<docDir>\.sidelight\drafts\<CacheKey>.md`，不接受页面给的任何路径；`GET /__draft` 读同一个键，404 = 无草稿，200 = `{v:1,exists:true,mtime,size,text}`（严格 UTF-8、LF、>6 MB → 413 `TOO_LARGE`），头同 `/__doc`（`no-store`、Host 校验、无 CORS）。
  2. `draft-save`：原子写该文件（同目录临时文件 + `File.Replace`，UTF-8 无 BOM、`\n`），回 `{v:1,type:'draft-save-result',id,ok:true,bytes,mtime}`；失败 `error:'IO'|'TOO_LARGE'|'NO_PATH'`。`draft-clear`：删文件并回结果。
  3. **`FormClosing`（H1）**：`async void`；`closeConfirmed` 为真直接返回；否则 `e.Cancel = true`；`closePending` 为真直接返回（**再次点 × 不重复发请求**）；置 `closePending` 后 `await ReadDirtyAsync()`（禁止 `.Result`）；`"0"` → `closeConfirmed=true; form.Close()`；`"1"/unknown` → 发一次 `{v:1,type:'close-request'}`。**5 s 无答案只保留窗口，不清 `closePending`**。
  4. `close-answer` 分支：`cancel` → `closePending=false`（下次点 × 可再问）；`save-draft` → 用回传 `text` 写草稿，**写成功才** `closeConfirmed=true; form.Close()`，失败保持窗口并显示可见错误（`closePending=false`）；`discard` → **先 `draft-clear`**（失败也记日志继续）再 `closeConfirmed=true; form.Close()`。`FormClosed` 只保留日志。Alt+F4/任务栏关闭同走 `FormClosing`；注销/关机 `SessionEnding` 标 UNVERIFIED。
  5. `host/draft-probe.mjs`：起 `.tmp/host-b`（CDP 9341），argv 打开样本 → 打字 → 等 `draft-save` → 断言草稿文件键与浏览器 `cacheKey` 一致、内容/编码正确；重开断言 `/__draft` 返回该草稿且 mtime 更新；关窗四路断言（取消留窗、存草稿后关、discard 后草稿已清、再次点 × 不产生第二条 `close-request`）；断言 `.sidelight` 只出现在文档目录。
  6. `docs/adr/0008-host-draft-and-close-guard.md`：背景（B1/B2 实测）、决定（草稿键与浏览器一致、协议字段、关窗三选一、5 s 超时保持窗口、discard 清草稿）、错误码、隐私（草稿只存本机、不联网、不写仓库）、否决方案（写 localStorage、写 `%TEMP%`、静默关闭）、UNVERIFIED（Alt+F4 真机以外的注销/关机、真实 IME）。
  7. **0.21.0**：`package.json` 只改版本；CHANGELOG 加 `## 0.21.0 — 2026-11-15`（草稿兜底、关窗三选一、自动保存安全子集、设置/菜单临界修复、体积 `[TBD]`）；README 更新「现在能做什么 / 不能做什么」与隐私句「草稿只存本机：文档同目录 `.sidelight/`，不发网络」；AGENTS §6 状态与未验项。体积预算 ≤805,000 B（当前 799,631，+草稿/关窗约 3–4 KB）。
- **验收**
  1. `powershell -File host/build.ps1; node host/draft-probe.mjs` exit 0：键一致、草稿写读、新于原文判定、四路关窗、落点五项 PASS。
  2. `node -e "console.log(require('./package.json').version)"` = `0.21.0`；CHANGELOG 含 `## 0.21.0 — 2026-11-15`；README 含「草稿只存本机」；ADR-0008 含「FormClosing」「close-answer」「draft-save」「5 s」「UNVERIFIED」。
  3. `npm test` 0 失败。
- **门禁**：`powershell -File host/build.ps1; node host/draft-probe.mjs; npm test`
- **风险与回退**：`FormClosing` 异步关闭若漏第二次 `Close()` 会「取消后关不掉」；草稿目录只读回 `NO_PATH`；真实 Alt+F4/注销不在自动化范围。回退：`git checkout -- host/ docs/adr/0008-*.md README.md AGENTS.md docs/CHANGELOG.md package.json` 并删探针。
- **难度** L ｜ **量级** 340–440 行

## 文件归属与并行（零重叠）

| 任务 | 组与顺序 | 独占文件 |
| :--- | :--- | :--- |
| T1 | A（builder，先做） | `src/App.tsx`、`src/lib/cache.ts`、`src/lib/cache.test.ts`、`src/components/StatusBar.tsx`、`scripts/draft-acceptance.mjs` |
| T2 | A（builder，T1 后） | `src/App.tsx`、`src/components/CloseGuardDialog.tsx`、`src/styles.css`、`scripts/draft-acceptance.mjs`（扩用例） |
| T3 | A（builder，T2 后） | `src/App.tsx`、`src/lib/settings.ts`、`src/components/SettingsDialog.tsx`、`src/components/StatusBar.tsx`、`scripts/draft-acceptance.mjs`（扩用例） |
| T4 | A（builder，T3 后） | `src/styles.css`、`src/components/SettingsDialog.tsx`（必要时） |
| T5 | B（builder2，并行） | `host/Program.cs`、`host/draft-probe.mjs`、`docs/adr/0008-*.md`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`package.json` |

- 两组零重叠：A 只碰 `src/` 与新验收脚本；B 只碰 `host/`、ADR-0008、文档与 `package.json`。`package.json` 只归 T5；`npm test` 文件数仍 16（T1 只在 `cache.test.ts` 加断言）。
- 跨组依赖：**草稿键算法两边必须一致**（T1 的 `cacheKey` ↔ T5 的 `CacheKey()`），T1 第 1 条键规则即契约；T1/T2 的宿主真实段等 T5 落地，根代理在 T5 完成后重做 `.tmp/host-a` 并跑宿主段；A 的浏览器与 mock 段随时可跑。
- 报告：A 组 `docs/iteration/round-08/impl-a.md`，B 组 `impl-b.md`，根代理合并 `impl.md`；截图 `shots/round-08/t3-*.png`、`t4-*.png`。

## 本轮不做（写进下轮建议）

**最近文件**：页面拿不到完整路径（`/__doc` 只给 `fileName`），协议没有路径字段；要做得先扩协议并解决隐私与失效处理，下轮单独设计。KaTeX 惰性化、`App.tsx` 重构、真实中文输入法、CI `windows-host` 首跑（无 remote）同样不做。

## 本轮 Demo（≤3 条用户可见变化）

1. 宿主里改完直接关窗会先问「取消 / 保存草稿并关闭 / 放弃并关闭」；下次打开提示恢复草稿，不再静默丢。
2. 停笔 2 秒自动保存，状态栏显示「已自动保存 HH:MM」；有格式损失或输入法组合中不写、也不弹框，失败会明说并保留草稿。
3. 1366×768 下设置面板能滚动、保存按钮始终可见；文件菜单不折行。

## 风险最高的任务

**T5**。同时改宿主生命周期与磁盘写入：`FormClosing` 是同步事件，却要 `await` 异步 dirty 读取再二次 `Close()`，漏掉就「取消后再也关不掉」；`closePending` 守卫、`discard` 先清草稿、`save-draft` 失败不关窗三处都是丢数据/关不掉的边界。缓解是 `host/draft-probe.mjs` 的键一致、草稿写读、四路关窗与「再次点 × 不重复请求」自动断言，并把注销/关机标 UNVERIFIED。次高是 T1：`cacheKey` 迁移若只改草稿不改批注，会让现有批注变孤儿，靠「旧键回读」「长名不撞」两条测试兜住。

## 下一轮建议主题

**最近文件与真实环境验证**：先扩宿主协议暴露路径候选或由宿主维护 `recent.json`，做失效提示与隐私说明；再补真人关窗（Alt+F4/任务栏/注销）、真实 IME、网络盘写回；发布侧推进 CI `windows-host` 首次手动触发与 KaTeX 惰性 spike。
