# 第 22 轮 · 数据第二批（D2/D3/D4/D5 复验）

- 环境：Sidelight 0.30.4，`localhost:5173`（Vite dev），headless Edge 157 CDP `127.0.0.1:9223`。每个用例新建 context，只读 `src/`。
- 方法：Playwright 连 CDP，`addInitScript` 注入内存文件系统（复刻第 21 轮 harness，另加 `Storage.prototype.setItem` 计数）。`/__doc`、`/__draft` 默认 404；用例 D 用 200 + 指定 mtime。用例 C 把“同一个文件夹”放进 `localStorage`，两个标签读写同一份文件表，模拟真浏览器里两个标签持有同一目录句柄。
- 复现脚本：`.tmp/r22-data/probe.mjs A|C|D`、`.tmp/r22-data/probe-b.mjs`（B）。输出：`.tmp/r22-data/out-{A,B,C,D}.txt`。本轮断言 A 4/4、B 9/10（B4 是取样时机问题，见下）、C 8/8、D 8/8。
- 截图：`shots/round-22/data-a-openfile-big.png`、`data-b-draft-not-restored.png`、`data-b-source-writes.png`、`data-c-two-tabs-same-file.png`、`data-d-stale-draft-prompt.png`。

第 21 轮的 D2、D3、D4、D5 在 0.30.4 全部仍在；本轮新增两条同一通道的缺口：保存路径绕过 256 KiB 门，双标签对**同一文件**的覆盖（上一轮只测了不同文件）。

---

## D2（P0，丢数据）浏览器草稿通道仍不闭环：`.sidelight/drafts` 只写不读；源码模式每键写全文；保存又无条件写 DOC_KEY

**复现**

1. 打开文件夹，`big315.md` = 2000 段，322,898 B。点开，光标到开头打 `ZZTOP-MARK`，等 1.4 s（在 2 s 自动保存之前）。
2. `.sidelight/drafts/big315.md` 长度 322,898，**含** `ZZTOP-MARK`；`localStorage['sidelight.doc.v1']` 长度 326,942，**不含**（256 KiB 门生效）。
3. 刷新页面：正文没有 `ZZTOP-MARK`，没有任何对话框，状态栏却显示「草稿 11:45」。
4. 源码模式另测（同一大小）：点「源码」，连打 3 个字符 → `setItem` 3 次，写入长度 326,943 / 326,944 / 326,945，每次都是整篇。
5. 再测保存路径：退出源码，末尾打 `QQQ-SAVED`，等自动保存完成 → `sidelight.doc.v1` 长度 326,954，**含** `QQQ-SAVED`（`finishSaved` 无条件写，绕过 256 KiB 门）；`.sidelight/drafts/src315.md` 同时被清掉。

**证据**

- `.tmp/r22-data/out-B.txt`：B1/B2/B3/B5/B6/B7 通过；B8/B9/B10 通过（`sizes=[326943,326944,326945]`，`DOC_KEY=326954 hasMarker=true draftAfterSave=null`）。
- 截图 `data-b-draft-not-restored.png`（正文无新字 + 「草稿」chip）、`data-b-source-writes.png`。
- 根因：`src/App.tsx:774-790` 写 `.sidelight/drafts`；全仓没有任何一处为恢复正文而 `readCache(..., 'draft')`——`src/App.tsx:1562` 只读 annotations，`:1847` 只在改名时迁移（`grep readCache src/App.tsx` 可复核）。源码模式 `src/App.tsx:1460-1474` 仍然每次 `sourceText` 变化就 `localStorage.setItem(DOC_KEY, …)`，没有 256 KiB 门，也没有 `hostModeRef` 判断。`src/App.tsx:2102-2106` 的 `finishSaved` 也无条件写 `DOC_KEY`，把 onUpdate 的门绕过去；`:2107-2113` 保存成功后再删草稿缓存。
- 状态栏「草稿」来自 `src/App.tsx:4219` 的 `initial.savedAt`，与 `.sidelight/drafts` 里的内容无关。

**影响**：① 2 秒自动保存窗口内刷新/崩溃、关掉自动保存、或写盘失败（只读、占用、网络盘）时，浏览器/文件夹文档没有可用兜底——草稿在磁盘上，应用不读；② 大文档源码模式每键同步写 0.3–5.8 MB，掉帧并挤爆 localStorage 配额（超限被 `catch` 吞掉）；③ 每次保存成功又整篇写一次 DOC_KEY，和注释「大文件会撑爆配额」相反；④ 「草稿」chip 给出虚假安全感。

**成本**：M。**建议**：打开文件后读一次 `.sidelight/drafts/<key>`，用文件 `lastModified` 比草稿 mtime，不同就复用宿主的恢复提示；源码模式补 `hostModeRef` 与 256 KiB 门，超限改写草稿目录；把 4 处 DOC_KEY 写入收成一个带门的函数；`.sidelight/drafts` 写入带 mtime。

---

## D3（P1，卡死/无保护）`Ctrl+Alt+O` 打开 5.61 MiB 仍无大小门：主线程停 15.7 s

**复现**

1. 打开文件夹，`big.md` = 2802 B × 2100 段 = 5,884,200 B。
2. 点 `big.md`：提示「文件太大，暂不支持（上限 5.5 MiB）。」，文档不变。
3. 同一份文本给 `showOpenFilePicker` 桩，按 `Ctrl+Alt+O`：无任何错误提示，15,944 ms 后 `__slState.name` 变成 `big-external.md`，正文 5,880,000 字符。
4. 期间主线程最长停顿 15,700 ms；50 ms 定时器在 15.9 s 里只跑了 5 次（应约 318 次）。

**证据**

- `.tmp/r22-data/out-A.txt`：A1–A4 全过，`wall=15944ms stall=15700ms ticks=5`。
- 截图 `shots/round-22/data-a-openfile-big.png`。
- 根因：`src/lib/workspace.ts:234` `MAX_DOC_BYTES` 仍只在 `readNode`（`:239-249`）里检查；`pickFile`（`:171-189`）拿 `file.text()` 后直接返回；`src/App.tsx:1711-1724` `openSingleFile` 全程不看大小。宿主的 6 MB（`src/App.tsx:226`）与 5.5 MiB 仍是两套数字。

**影响**：从「文件 → 打开文件…」打开大 Markdown（桌面端双击任意 `.md` 超过 5.5 MiB 同路径）会把整篇读进编辑器，界面十几秒无响应、无取消；更大的文件可能拖死标签页/WebView，未保存改动随之丢失。

**成本**：S。**建议**：`pickFile` 先 `getFile()` 看 `size`，与 `openSingleFile` 共用 `MAX_DOC_BYTES` 和同一句文案；三个上限收成一个常量；`scripts/bigfile-acceptance.mjs` 补「打开文件」路径。

---

## D4+D5（P1，覆盖/误导）恢复槽只有一份、且不看新旧：同一文件两标签后写覆盖（磁盘、草稿、DOC_KEY），旧草稿照样弹提示且保留后是“干净”的

**复现**

A. 两标签同一文件

1. 同一 context 两个标签，都打开文件夹并点 `a.md`（`A-DOC\n`）。
2. 标签 1 末尾打 `AAA-TAB1`，等 3.8 s（自动保存）：磁盘 `a.md` = `A-DOCAAA-TAB1\n`，`.sidelight/drafts/a.md` 在 1.4 s 时也是这份。
3. 标签 2 仍是旧正文（不会自动刷新），末尾打 `BBB-TAB2`，等 3.8 s：磁盘变成 `A-DOCBBB-TAB2\n`，`AAA-TAB1` 消失；草稿缓存在 1.4 s 时也已只剩 tab 2 的文本。
4. 唯一恢复槽 `sidelight.doc.v1` 只剩 `{"text":"A-DOCBBB-TAB2\n","name":"a.md"}`。两个标签都没有「文件已被外部修改」提示，标签 2 显示「已自动保存 11:46」。
5. 标签 1 刷新：`a.md` + `A-DOCBBB-TAB2`，`AAA-TAB1` 在任何一层都找不回来。

B. 草稿新旧与保留后状态

1. `/__doc` 返回 `x.md`、`mtime = now + 120 s`（文件比草稿新）；`/__draft` 404；`sidelight.doc.v1` = `{text:'OLDER-DRAFT-CONTENT\n', savedAt: now - 1 h}`。
2. 载入后仍弹「有未保存的草稿（保存于 10:46）。打开 x.md 会替换它。」——不显示文件修改时间，也不说草稿更旧。
3. 点「保留草稿」：提示「已保留本地草稿…另存为」，`__slState.dirty === false`，状态栏只有「草稿 10:46」。
4. 按 `Ctrl+Alt+O` 打开 `y.md`：不弹「切换文档」，恢复槽直接变成 `Y-DOC`，旧草稿消失。
5. 反向（草稿比文件新）会弹提示，但文案同样只有草稿时间，没有文件时间。

**证据**

- `.tmp/r22-data/out-C.txt`（C1–C8 全过）：`tab1="A-DOCAAA-TAB1\n"`、`tab2="A-DOCBBB-TAB2\n"`、`slot=…BBB-TAB2…`、`reloadDialog=""`。
- `.tmp/r22-data/out-D.txt`（D1–D8 全过）：D1 旧草稿照弹、D2 无新旧/文件时间、D3 `dirty=false`、D5/D6 无提示替换。
- 截图 `data-c-two-tabs-same-file.png`、`data-d-stale-draft-prompt.png`。
- 根因：`src/App.tsx:89` 只有一个 `DOC_KEY`；全仓没有 `storage`/`BroadcastChannel` 监听（`grep` 无结果），两个标签互不知道对方写过。浏览器文件夹写盘不看 mtime：`fileMtimeRef` 在 `src/App.tsx:1643-1647` 设置后从未比较（宿主的 `PATH_CHANGED` 只覆盖宿主写回）。localStorage 草稿分支 `src/App.tsx:1029-1039` 只判 `savedAt > 0 && text !== data.text`，不比 `data.mtime`（宿主 `/__draft` 分支 `:1013-1023` 有比较）。`keepDraft`（`:2015-2021`）只关提示、切 `hostMode=false`，不设 baseline、不置 dirty，所以后续 `requestLoad` 的 `if (dirty)`（`:1679`）拦不住。

**影响**：① 两人/两窗口同时编辑同一文件时，后保存的整篇覆盖前一篇，前一篇既不在磁盘也不在草稿/恢复槽；② 旧草稿会被当成“当前稿”保留，且 marked clean（dirty=false），再打开别的文件就静默丢掉——用户以为已经保住；③ 提示不给新旧依据，选「继续打开」也可能丢掉真正更新的本地草稿。

**成本**：M（同文件写前 mtime 检查 + 三选一提示 S/M；草稿提示 S）。**建议**：写盘前用 `file.lastModified` 与载入时 mtime 比，变了就提示「覆盖 / 另存为 / 取消」；`DOC_KEY` 加文档维度并留「最近一篇」指针，监听 `storage` 事件把旧标签标成“草稿未入槽”；草稿提示只在 `savedAt > 文件 mtime` 时弹，文案给两头时间；`keepDraft` 写 `.sidelight/drafts` 并把 baseline 设为宿主正文、`setDirty(true)`。

---

## 本轮最值得做的 3 件事

1. **接通浏览器草稿读取，并把三条写路收成一个带门的函数**（D2，M）：打开时读 `.sidelight/drafts` 比 mtime 提示恢复；源码模式与 `finishSaved` 都补 256 KiB 门与 `hostModeRef`。这决定 2 秒窗口、自动保存关闭、写盘失败时还有没有救。
2. **给「打开文件」补大小门**（D3，S）：`pickFile` 先看 `size`，与文件树共用 5.5 MiB 文案，`bigfile-acceptance.mjs` 覆盖这条路径。成本最小，直接消掉 15 秒卡死。
3. **写盘前查 mtime + 恢复槽加文档维度 + 草稿提示比新旧**（D4/D5，M）：同一文件两标签的静默覆盖是最像“正常使用”的丢数据路径；旧草稿提示与 `keepDraft` 的 dirty=false 一起修，才能让“保留草稿”真的被保护。
