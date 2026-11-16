# 第 21 轮 · 数据与恢复侦察（D1–D5）

- 环境：Sidelight 0.30.3，`localhost:5173`（Vite dev），headless Edge 157 CDP `127.0.0.1:9223`，profile `%TEMP%\sidelight-r21-data`。
- 方法：Playwright 连 CDP，`addInitScript` 注入内存文件系统（复刻 `scripts/stale-save-acceptance.mjs` 的 harness，另加 `Storage.prototype.setItem` 计数与 `showOpenFilePicker` 桩），`/__doc`、`/__draft` 一律 `404`（用例 E 除外，E 用 200 + 新 mtime 模拟“文件比草稿新”）。全部用例只读 `src/`。
- 复现脚本：`.tmp/r21-data/probe.mjs`（`node .tmp/r21-data/probe.mjs A|B|C|D|E|F`），输出存 `.tmp/r21-data/out-{A,B,C,D,E,F}.txt`。本轮 30/30 断言的原始输出都在这些文件里。
- 截图：`shots/round-21/data-a-openfile-big.png`、`data-b-draft-not-restored.png`、`data-c-delete-dirty.png`、`data-d-multitab.png`、`data-e-draft-prompt.png`。

---

## D1（P0，丢数据）删除当前有未保存改动的文件：不提示、不回滚、连草稿缓存一起删；撤销恢复文件后批注永久消失

**复现**

1. 打开文件夹，`a.md` 内容 `OLD-A\n`，`b.md` 内容 `B-DOC\n`；预置 `.sidelight/annotations/a.json`（一条引文 `OLD-A` 的批注）。
2. 点 `a.md`，提示「从 .sidelight 恢复了 1 条批注」。在正文末尾打 `IMPORTANT-NEW`，`window.__slState.dirty === true`。
3. 右键 `a.md` 行 →「删除（移到回收站）」→ 确认框只有「移到这个文件夹的 .sidelight/trash/，不会当场永久删除…」+「取消 / 移到回收站」，**没有任何未保存改动提示**；不弹「切换文档」确认。
4. 确认后：`.sidelight/trash/20261116-104329-483eo3-a.md` 内容是 `OLD-A\n`，`IMPORTANT-NEW` 不在任何地方；`.sidelight/drafts/a.md` 变成 `null`；`.sidelight/annotations/a.json` 变成 `null`。
5. 点提示条「撤销」：`a.md` 回来了（`OLD-A\n`），但 `annotations/a.json` 仍是 `null`；再点 `a.md`，没有「恢复了 1 条批注」。

**证据**

- `.tmp/r21-data/out-C.txt`：`C2 dirty=true`、`C3` 确认框全文、`C4 trash keeps only the old bytes`、`C5/C6` 两个缓存都被清、`C7 undo restores the file but not its annotations cache`、`C8 reopened file has no annotations back`（8/8 通过）。
- 截图 `shots/round-21/data-c-delete-dirty.png`。
- 根因：`src/App.tsx:1895-1973` `removeFile` 只 `waitForCommit()`（等已在飞的写盘），从不看 `dirty`/`dirtyRef`，也不调任何确认；`src/App.tsx:1923-1931` 删除成功后无条件 `removeCache(dir,'draft'|'annotations')`；`src/App.tsx:1946-1966` 的「撤销」只 `restoreFromTrash` 回字节，不恢复缓存。`src/components/TreeActions.tsx:284-287` 的确认文案只讲 trash 位置。
- 对比：改名走 `prepareRename` + `handleRenamedFile`（`src/App.tsx:1799-1867`），会迁移 `draft`/`annotations` 两个键；删除是唯一“撤不回来”的路径。

**影响**：① 打了一段没等自动保存（2 s 防抖）就删，所打的字永久丢失，回收站里只有旧字节；② 只要删过再撤销，这篇文档的批注全没了，且用户看到「已恢复 a.md」会以为一切复原。丢的是正文改动与全部批注。

**成本**：M。**建议**：`removeFile` 开头加 `if (dirtyRef.current) → 复用 pendingSwitch 的三选一（保存后删除 / 直接移到回收站 / 取消）`；缓存不立即删，改名到 `.sidelight/trash/<trashName>.draft|.json` 一起进回收站，`restoreFromTrash` 时搬回；撤销提示 6 s 后过期再清缓存。

---

## D2（P0，丢数据）浏览器草稿通道两头断：>256 KiB 的草稿写进 `.sidelight/drafts` 但全应用没有一处读回；源码模式又反向每键写全文（无上限）

**复现**

1. 打开文件夹，`big400.md` 约 315 KiB（2000 段）。点开，光标到开头打 `ZZTOP-MARK`，等 1.6 s。
2. 检查：`.sidelight/drafts/big400.md` 长度 322,898，**含** `ZZTOP-MARK`；`localStorage['sidelight.doc.v1']` 长度 326,942，**不含** `ZZTOP-MARK`（那是打开时写入的磁盘旧文）。
3. 刷新页面：编辑器里没有 `ZZTOP-MARK`，没有任何恢复提示，状态栏却显示「草稿 10:42」。
4. 另测源码模式：300 KiB 文档点「源码」，连打 3 个字符 → `localStorage.setItem` 被调用 3 次，写入长度 289,943 / 289,944 / 289,945（每次都是整篇），`sidelight.doc.v1` 最终 289,945。

**证据**

- `.tmp/r21-data/out-B.txt`（B1–B5 全过）、`.tmp/r21-data/out-F.txt`（F1/F2：3 次写、每次 >256 KiB）。
- 截图 `shots/round-21/data-b-draft-not-restored.png`（正文无新字 + 「草稿」chip）。
- 根因：`src/App.tsx:760-766` 只在 `draft.length <= 256*1024` 且非宿主时才写 localStorage；`src/App.tsx:774-790` 把草稿写进 `.sidelight/drafts`；但全仓 `readCache` 只有两处调用（`src/App.tsx:1562` 读 annotations、`src/App.tsx:1847` 改名迁移），**没有任何一处读 `kind:'draft'` 来恢复正文**——`grep readCache src/` 可复核。`src/App.tsx:1469-1473` 源码模式效果每次 `sourceText` 变化都 `localStorage.setItem(DOC_KEY, …)`，既没有 256 KiB 门，也没有 `hostModeRef` 判断（对照 `src/App.tsx:759-760` 的注释「宿主文档不写 localStorage：大文件会撑爆配额」）。
- 状态栏「草稿」来自 `src/App.tsx:453` `draftShown = initial.savedAt > 0` + `src/App.tsx:4223-4227`，它只反映 DOC_KEY 里有东西，与 `draftShown` 的内容新旧无关。

**影响**：① 约 256 KiB 以上的浏览器/文件夹文档，崩溃、刷新、关标签后拿不回未保存内容——草稿明明在磁盘上，应用不读；② 大文档在源码模式每键同步写 0.3–5.5 MB，掉帧，且挤爆 localStorage 配额（超限被 `catch` 吞掉，用户无感）；③ 「草稿」chip 给出虚假的安全感。

**成本**：M。**建议**：`loadIntoEditor`/`openSingleFile` 打开文件后读一次 `.sidelight/drafts/<key>`，与磁盘正文比对，不同就复用宿主那套「有比原文件更新的草稿」提示（用文件的 `lastModified` 比草稿 mtime，别只比存在）；`.sidelight/drafts` 文件写入时带上时间戳（现在是纯正文）。源码模式的 localStorage 写加 `hostModeRef` 守卫与 256 KiB 上限，超限改写 `.sidelight/drafts`。

---

## D3（P1，卡死/无保护）大小门只在文件树路径：同一份 5.61 MiB 文件「打开文件」照单全收，主线程卡 19 s

**复现**

1. 打开文件夹，`big.md` = 2802 B × 2100 段 = 5,884,200 B（5.61 MiB），`huge.md` 同结构 6.41 MiB。
2. 点 `big.md`：提示「文件太大，暂不支持（上限 5.5 MiB）。」，文档仍是「示例 · 侧灯.md」。点 `huge.md` 同样被拒。
3. 同一份 5.61 MiB 文本改走 `Ctrl+Alt+O`（「打开文件…」，`showOpenFilePicker` 返回同一内容的句柄）：无任何错误提示，19,393 ms 后 `window.__slState.name` 变成 `big-external.md`，正文已载入。

**证据**

- `.tmp/r21-data/out-A.txt`（A1–A5 全过，`A5 … 19393 ms`）。
- 截图 `shots/round-21/data-a-openfile-big.png`。
- 根因：`src/lib/workspace.ts:234` `MAX_DOC_BYTES = 5 MiB + 512 KiB` 只在 `readNode`（`workspace.ts:239-249`，文件树路径）里检查；`pickFile`（`workspace.ts:171-189`）调 `file.text()` 后直接返回，`openSingleFile`（`src/App.tsx:1711-1729`）把它交给 `requestLoad`，全程没有大小判断。宿主的 6 MB 上限（`src/App.tsx:226` `MAX_HOST_DOC_LENGTH`）与 `readNode` 的 5.5 MiB 也是两套数字，同一文件在宿主与浏览器里一个能开一个不能开。
- 旁证：`scripts/bigfile-acceptance.mjs` 只测文件树路径（`row('big.md').click()`），所以这个缺口一直没被门禁覆盖。

**影响**：从「文件 → 打开文件…」打开大 Markdown（或桌面端双击任意 `.md` 超过 5.5 MiB）会把整篇读进编辑器，主线程阻塞十几秒到几十秒，期间界面无响应、无取消；超大的文件还可能直接把标签页/WebView 拖死，未保存的改动随之丢失。

**成本**：S。**建议**：在 `pickFile` 与 `openSingleFile` 里复用 `MAX_DOC_BYTES`（返回 `{tooLarge, size}`，由 App 弹与 `readNode` 同一句文案）；把 `readNode` 的 5.5 MiB、`MAX_HOST_DOC_LENGTH` 的 6 MB 收成一个常量并在文案里写同一个数；`bigfile-acceptance.mjs` 补一条「打开文件」路径。

---

## D4（P1，恢复串台）两个标签共用一个 `sidelight.doc.v1`：后写的标签把前一个标签的恢复槽顶掉，刷新后打开的是另一篇

**复现**

1. 标签 1：打开文件夹，点 `a.md`，末尾打 `AAA-TAB1`。读 `localStorage['sidelight.doc.v1']` = `{"text":"A-DOCAAA-TAB1","name":"a.md",…}`。
2. 同源标签 2：打开文件夹 → 点 `b.md` → 打 `BBB-TAB2`。回到标签 1 读同一个键 = `{"text":"B-DOCBBB-TAB2","name":"b.md",…}`，`AAA-TAB1` 消失。
3. 标签 1 刷新：`window.__slState.name === 'b.md'`，正文 `B-DOCBBB-TAB2`——标签 1 自己的 `a.md` 恢复位置被换成了另一篇。

**证据**

- `.tmp/r21-data/out-D.txt`（D1–D3 全过）；截图 `shots/round-21/data-d-multitab.png`。
- 根因：`src/App.tsx:89` 只有一个 `DOC_KEY`，写入点 `src/App.tsx:760-766`、`1469-1473`、`1660-1664`、`2109-2113`，都没有文档/窗口维度；`grep "'storage'" src/` 无结果，没有 `storage` 事件监听，两个标签互不知道对方写过。
- 与已知项的区别：STATE 里的「多窗口」未列；宿主是单实例，这条主要在浏览器/未来多窗口时命中。

**影响**：两篇都有未保存改动时，只有后写的那篇能恢复；另一篇的恢复槽被覆盖（浏览器模式下 `.sidelight/drafts` 又不读，见 D2，等于彻底没有兜底）。桌面端若将来放开多窗口，同一份文件两个窗口也会互相覆盖同一个键。

**成本**：S/M。**建议**：键加文档维度（`sidelight.doc.v1:<cacheKey>`，并保留一份「最近一篇」指针用于启动），或至少写前 `postMessage`/`BroadcastChannel` 探测占用并在冲突时改走 `.sidelight/drafts` + 提示；监听 `storage` 事件，在另一个标签写过时把自己标成「本标签草稿未入恢复槽」。

---

## D5（P1，误导）冷启动草稿提示不看新旧：比原文件旧一小时的草稿照样弹「有未保存的草稿」；点「保留草稿」后 dirty=false，再打开任何文件就静默替换掉它

**复现**

1. `/__doc` 返回 `NEWER-FILE-CONTENT\n`、`fileName: x.md`、`mtime = now + 120 s`；`/__draft` 404；`localStorage['sidelight.doc.v1']` = `{text:'OLDER-DRAFT-CONTENT\n', name:'x.md', savedAt: now - 3600000}`。
2. 载入后弹 `.dialog[aria-label="未保存的草稿"]`，全文：「有未保存的草稿（保存于 09:44）。打开 x.md 会替换它。」+「保留草稿 / 继续打开」。既不显示文件修改时间，也不说草稿比文件旧——宿主分支（`/__draft` 比 `/__doc` mtime）有这层比较，localStorage 分支没有。
3. 点「保留草稿」：提示「已保留本地草稿；宿主文件没有载入，保存会走「另存为」。」，`window.__slState.dirty === false`，状态栏只有「草稿 09:44」。
4. 接着 `Ctrl+Alt+O` 打开 `y.md`：**不弹**切换确认，`sidelight.doc.v1` 变成 `{"text":"Y-DOC\n","name":"y.md",…}`，`OLDER-DRAFT-CONTENT` 从唯一恢复槽消失。

**证据**

- `.tmp/r21-data/out-E.txt`（E1–E7 全过）；截图 `shots/round-21/data-e-draft-prompt.png`。
- 根因：`src/App.tsx:1029-1039` 只判 `draft.savedAt > 0 && draft.text !== data.text`，不拿 `data.mtime` 比；对照宿主分支 `src/App.tsx:1013-1023` 有 `draftData.mtime > data.mtime`。`src/App.tsx:2022-2028` `keepDraft` 只清提示、切 `hostMode=false`，不置 `dirty`（也没有基线可置），于是后续 `requestLoad` 的 `if (dirty)`（`src/App.tsx:1679`）不生效，`loadIntoEditor` 在 `src/App.tsx:1660-1664` 覆盖 `DOC_KEY`。文案见 `src/App.tsx:4311-4338`。

**影响**：用户看到「有未保存的草稿」会默认那是比文件新的内容；实际可能是别人已经保存过之后残留的旧草稿，选择保留就把旧文本当成当前稿（桌面端随后保存走另存为，但用户很容易再拿它覆盖原文件）。反过来，选「继续打开」也有可能丢掉真正更新的本地草稿——因为提示不提供任何新旧依据。加上第 2 步的 dirty=false，保留下来的草稿在切文档时没有任何保护。

**成本**：S/M。**建议**：localStorage 分支补 `savedAt > data.mtime` 才弹；文案给两头时间（「草稿 09:44 · 文件 10:44，文件更新」）并加第三个选项「保留草稿并另存为」；`keepDraft` 里把草稿写成 `.sidelight/drafts`（有目录时）并把 `baselineRef` 置为宿主正文、`setDirty(true)`，让切文档/关窗重新走保护。

---

## 本轮最值得做的 3 件事

1. **删文件前拦住未保存改动，缓存跟着回收站一起走**（D1）：`removeFile` 加 dirty 三选一确认，`draft`/`annotations` 改名进 trash，撤销时搬回。同一条改动同时修好「删完撤销批注全丢」。
2. **把浏览器草稿通道接通，并给源码模式补回上限**（D2）：打开文件时读一次 `.sidelight/drafts/<key>` 与磁盘正文比对并提示恢复；源码模式的 `localStorage.setItem` 加 `hostModeRef` 守卫 + 256 KiB 门。这决定 256 KiB 以上文档崩溃后还有没有救。
3. **统一大文件门，堵住「打开文件」这个口子**（D3）：`pickFile`/`openSingleFile` 复用 `MAX_DOC_BYTES`，5.5 MiB 与 6 MB 收成一个常量，`bigfile-acceptance.mjs` 补这条路径。成本 S，收益是十几秒卡死和潜在崩溃直接消失。

（D4 多标签恢复槽、D5 草稿新旧提示留到下一轮；两者都只需 S/M，且 D5 与 D2 的恢复提示可以一起改。）
