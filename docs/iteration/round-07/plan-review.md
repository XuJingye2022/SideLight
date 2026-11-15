# 第 07 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-07/plan.md`（基线 `92a3ac6`，v0.19.0）。
审查方式：读计划、三份 findings、`src/App.tsx` 的保存/源码/风险段、`src/components/SaveDialog.tsx`、`packaging/installer.nsi`；未改产品文件、未 commit。
审查日期：2026-11-15。

## 结论：**REVISE**

H1（差异门只写在 `saveFile`，`saveAsCopy`/`saveAndSwitch` 仍可绕过）、H2（差分分类把用户编辑当损失，会造成每次保存都弹）是 blocker；H3–H6 会把「取消却写了」「确认了没写」「误报疲劳」带到实现里。

## 漏洞表（H1–H6）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | 计划 `:14` 的保存顺序只覆盖 `saveFile`；`saveAsCopy`（`App.tsx:1651-1674`）和 `saveAndSwitch`（`:1794`）仍直接 `saveAsFile`/`commitSave`，不经过 `prepareSave`/差异门。`saveWarned` 还在 `commitSave`（`:1554`）、`finishSaved`（`:1519-1520`）、`sendHostSave` 成功（`:1729`）里置 true，确认前/旁路路径仍能把它设成 true | `plan.md:12-17`；`App.tsx:1607-1643`（saveFile）、`:1651-1674`（saveAsCopy）、`:1794`（saveAndSwitch）、`:1519-1520`/`:1554`/`:1729`；`findings-bug.md:41-68` | `prepareSave` 必须由 `saveFile`、`saveAsCopy`、`saveAndSwitch` 三条路径共用；`saveWarned` 只在「差异确认框的仍然保存」回调里置 true，别在 `commitSave`/`finishSaved` 里无条件置；补「另存为取消/确认」与「保存并切换」两例脚本 | T1 |
| H2 | blocker | `classifyLosses(before, after)` 的 `before` 是原文、`after` 是当前序列化结果；用户正常编辑也会进 `after`，分类器按删除/新增行匹配表格、脚注、空行，分不清「用户自己删的」与「序列化损失」。表格分隔行、末尾换行、空行几乎每次保存都变，T1 `:15` 又规定「有损失每次弹」→ 用户被训练成无脑确认 | `plan.md:53-56`；`findings-bug.md:13,116-142`；`findings-ux.md:86-112`（只提示一次、空基线、表格） | 先算基线 `serialize(original)`，把「原文 vs serialize(original)」的损失与「serialize(original) vs 当前」的用户编辑分开；分类器只标「基线里存在、且当前仍由同一行触发」的结构性损失。表格分隔行只在「值未变、仅空格/宽度变」时算损失，用户增删行列不算；末尾换行只在原文有、产物无时算；空行变化单独折叠；`\` 硬换行只标「等价改写」，不当作数据丢失 | T3 |
| H3 | major | T2 的 `rawTextRef` 只在 `applyHostPayload`/`loadIntoEditor` 写入（`plan.md:34`），没有在保存成功、另存为、宿主写回成功后更新。保存后 `dirty=false`，源码模式会显示**旧原文**（可能仍带引用式链接定义），而磁盘已是序列化后的新内容；用户从源码再保存会把旧原文写回 | `plan.md:34-36`；`App.tsx` 的 `switchView`（`:2031-2047`）、`finishSaved`（`:1519`）、`sendHostSave` 成功（`:1727`）；`findings-bug.md:79-113`（源码显示序列化结果） | `rawTextRef` 在 `finishSaved`、宿主 `save-result` 成功、`saveAsCopy` 成功后更新为**刚写入的文本**；未编辑时用 raw，编辑后用当前并提示；另存为后 `rawTextRef` 指向新内容；补「保存后切源码显示新内容」与「源码保存不改写法」两例 | T2 |
| H4 | major | T4 的验收 `Select-String packaging/installer.nsi -SimpleMatch 'UserChoice','HKLM'` 0 命中，但现 `installer.nsi:55,58` 的 WebView2 运行时检查**本来就有 `HKLM`**（读 EdgeUpdate），按计划 T4 必 FAIL。`Section /o` + `/S` 的「静默不装」也只靠语义推断，dry-run 断言写的是「默认包」还是「默认 dry-run 包」不够明确；`ASSOC_DRYRUN` 若不先验证 `/S` 真实行为，可能把假绿当证据 | `plan.md:79-83,85`；`packaging/installer.nsi:54-60`（HKLM）；`findings-ship.md:25-48`（S1 未运行、dry-run 提案） | 把断言改成「无 `WriteRegStr HKLM`/`WriteRegDWORD HKLM`」或允许运行时检查的 `ReadRegStr HKLM`；明确 `assoc-default-setup.exe` 是 **ASSOC_DRYRUN 且非 FORCE** 的包，`/S` 后 `assoc-plan.txt` 不存在；补一条 `/S` 的 Section 选择证据（日志或组件选择） | T4 |
| H5 | major | T3 步骤 3 要「SaveDialog 按类别分组显示」，但 T3 文件表（`plan.md:116`）没有 `src/components/SaveDialog.tsx`（T1 独占）；T5 的 README 文案（`:96`）把「保存会被拦下」「源码模式保存不改写法」写成既定事实，而这些依赖 H1/H2 的实际结果；850,000 预算当前 794,843 + 关联 +2,656 + 前端约 +2.5K ≈800K，余量够但需要以实测为准 | `plan.md:116`、`:96`、`:100`；`SaveDialog.tsx:49-60`（这次只提示一次）；`packaging/installer.nsi` 当前 794,843 | 把 `SaveDialog` 加进 T3 文件表（或明确 T1 完成分组、T3 只加类别字段）；T5 的结论句改为「按 T1/T2/T3 实际结果二选一」，在根代理放行后再写；体积以 `installer.ps1` 实测回填 | T3/T5 |
| H6 | major | T1 的 `sendHostSave(text)`（`plan.md:14`）传的是 `currentMarkdown()` 的 `text`，`prepareSave` 已算出 `normalized` 却没用；源码模式的 CRLF 会原样发给宿主，与 T3「`text` 一律 LF 归一化」冲突。`pendingSave` 状态（SaveDialog）与现有 `pendingSaveRef`（宿主写回队列，`App.tsx:400,1687`）同名不同物，计划没有改名，容易把「确认中的保存」和「已入队的写回」混在一起 | `plan.md:12-17`；`App.tsx:1595-1600`（currentMarkdown）、`:1681-1711`（sendHostSave/pendingSaveRef）；`plan.md:1687` 的命名冲突 | `sendHostSave` 只接收 `normalized`（LF），`withEol` 只给浏览器/文件句柄；把 `pendingSave`（确认）改名为 `pendingConfirm`，`pendingSaveRef` 改名为 `pendingHostSave`；补「源码 CRLF 文档宿主写回仍 CRLF」与「确认前不入队」断言 | T1 |

---

## H1（blocker）差异门只写在 `saveFile`

计划 `:14` 的顺序是：

```
算 text → host 不可写走另存为 → !dirty 返回 → 差异门 → pendingSave → 确认后才 sendHostSave / commitSave
```

这只覆盖 `saveFile`。现有：

- `saveAsCopy`（`App.tsx:1651-1674`）直接 `saveAsFile`，没有 `prepareSave`/差异门。它由「另存为…」菜单、宿主不可写、旧只读路径调用。
- `saveAndSwitch`（`:1794`）直接 `commitSave(currentMarkdown())`；用户在「有未保存改动」对话框点「保存并切换」时不会看到差异清单。
- `saveWarned` 仍在 `commitSave`（`:1554`）、`finishSaved`（`:1519-1520`）、`sendHostSave` 成功（`:1729`）里置 true。计划 `:15` 说「只有确认成功后置 true」，但代码里这些函数会在确认/非确认路径被调用，必须逐个改。

**后果**：

- 用户点「另存为」或「保存并切换」，绕开差异门，静默把引用式链接定义写掉。
- 取消 SaveDialog 后，`pendingSave` 清掉，但 `saveWarned` 可能已被旁路置 true，下一次不再提示。
- 宿主分支的确认与入队没有统一「确认后只发一次」的保证。

**最小修法**：`prepareSave()` 返回 `{ normalized, withEol, diff }`，`saveFile`/`saveAsCopy`/`saveAndSwitch` 都先 `prepareSave`；`saveWarned` 只在 `SaveDialog` 的 `onConfirm` 里置 true；`saveAsCopy` 确认后走 `saveAsFile`，取消时保留 dirty；`saveAndSwitch` 确认后 `commitSave` 再切换。验收补「另存为取消不写」「保存并切换有差异确认」。

## H2（blocker）差分分类分不清用户编辑与序列化损失

计划 `:53` 的 `classifyLosses(before, after)` 用「原文 vs 当前序列化结果」的删除/新增行匹配类别。`after` 包含用户正常编辑：

- 用户删掉表格一行 → 删除行匹配 `^\|.*\|$` → 报「表格分隔行会被重排」，但这是用户自己的编辑。
- 用户删掉一段 → 删除行可能匹配空行/脚注 → 报损失。
- 每次保存表格文档，序列化都会改分隔行/列宽 → `lossKinds` 永远非空，T1 `:15` 规定「有损失每次弹」→ 每个表格用户每次 `Ctrl+S` 都被拦。
- 末尾换行、空行、frontmatter 后空行同理，几乎每篇都触发；`\` 硬换行改成两空格是等价语义，不应按「数据丢失」每次都弹。

findings-ux `:86-112` 已经把「只提示一次、不区分谁改的、新文档也弹」列为误报疲劳来源；计划 `:66` 也承认「差分分类若把用户自己删的行算损失会误报」，但没有给出区分算法。

**最小修法**：定义两个基线：

1. `baselineLoss = classifyLosses(originalText, serialize(originalText))`——只记录「载入即存在」的结构性损失；
2. `currentLoss = classifyLosses(serialize(originalText), text)`——只记录当前相对序列化基线的变化，用户编辑落在这里，不算损失。

保存时只提示 `baselineLoss` 中仍在当前文档命中的类别；用户自己删掉的行、增删表格行列、正常空行不算。表格只在「值未变、仅分隔行空格/宽度变」时算；末尾换行只在原文有、产物无时算；`\` 硬换行单独标「等价改写」，不归入数据丢失。给 `diff.test.ts` 加「用户删除一行不报」「用户增删表格行不报」反例。

## H3（major）`rawTextRef` 保存后不更新

计划 `:34` 只写 `applyHostPayload`/`loadIntoEditor` 设置 `rawTextRef`；`:35-36` 用 `!dirty && rawTextRef` 决定源码内容。保存成功后：

- `finishSaved`（`App.tsx:1519`）把 `originalText` 设为 `withEol`，但没有更新 `rawTextRef`；`rawTextRef` 仍是载入时的原文（可能含引用式链接定义）。
- 宿主 `save-result` 成功（`:1727-1735`）也只更新 `originalText`/`saveWarned`，没更新 `rawTextRef`。
- 另存为成功后 `rawTextRef` 还是旧文件内容。

于是保存后 `dirty=false`，切源码会显示**旧原文**，而磁盘已是新序列化内容；用户从源码保存可能把旧原文写回，正是「确认了没写」的反面。

**修**：`rawTextRef` 在 `finishSaved`、宿主写回成功、`saveAsCopy` 成功后更新为刚写入的文本；未编辑时用 raw，编辑后用当前并提示；源码保存不改写法；补「保存后切源码显示新内容」断言。

**CRLF**：`rawTextRef` 含 CRLF 时，源码 textarea 会显示 CRLF；`prepareSave` 归一化、`withEol` 按 `eolRef` 还原；浏览器下载也走 `commitSave` 的 `withEol`，不会直接把 CRLF 写进 Markdown。计划应把这条写进 T2 验收：CRLF 原文在源码里保存后仍是 CRLF（浏览器下载与宿主各一例）。

## H4（major）T4 的 `HKLM` 断言与 `/S` 语义

现 `packaging/installer.nsi:54-60` 的 WebView2 运行时检查用：

```nsi
ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\..." "pv"
```

计划 `:83` 的验收却要求 `Select-String packaging/installer.nsi -SimpleMatch 'UserChoice','HKLM'` **0 命中**。按现文件 T4 必 FAIL；应改断言为「无 `WriteRegStr HKLM` / `WriteRegDWORD HKLM`」，允许 `ReadRegStr HKLM` 运行时检查。

`/S` 的「默认不装」：计划 `:79-82` 依赖 `Section /o` 语义 + dry-run。需要明确测试的是 **ASSOC_DRYRUN、非 FORCE 的默认包** `/S` 安装后 `assoc-plan.txt` 不存在；如果 `/S` 语义与 `/o` 不一致，dry-run 会把问题暴露出来。计划还应把 `assoc-default-setup.exe`（dry-run 默认）与发布包（无 dry-run）分开命名，避免把「没有 plan 文件」当成「没有写关联」——发布包本来就不写 plan。

`ASSOC_DRYRUN` 的 `FileWrite "$INSTDIR\assoc-plan.txt"` 要在 `SetOutPath "$INSTDIR"` 之后执行；默认包 `/S` 不选节；`DeleteRegKey /ifempty` 保留 `VSCode.md`；`Applications\Sidelight.exe` 是「打开方式」显示产品名的可选但推荐项。这些方向对，只需把断言和测试包分清楚。

## H5（major）T3 的 SaveDialog 归属与 T5 的文档口径

- T3 `:55` 要「SaveDialog 按类别分组显示」，但 T3 文件表 `:116` 没有 `src/components/SaveDialog.tsx`；该文件在 T1 独占。T1 只加第三个按钮（`:16`），T3 要改分组/文案，属同一文件二次修改；应在 T3 文件表明确加入，或让 T1 一次把分组接口留好、T3 只传类别。
- T5 `:96` 的 README 文案把「保存会被拦下」「源码模式保存不改写法」写成事实，但这依赖 H1/H2 的实际结果；若 H1 的 `saveAsCopy` 仍绕过，文档就是假承诺。T5 应等根代理在 T1–T3 完成后放行，并把「按实际结果二选一」写进任务，不要提前写死。
- 体积：当前 794,843 B；关联 +2,656 B；前端约 +2.5 KB → ≈800,000 B，850,000 硬线有余量；但 `ASSOC_DRYRUN` 的测试包不应混入发布包，T5 的 `[TBD]` 由根代理回填。

## H6（major）`sendHostSave` 的归一化与命名冲突

计划 `:14` 写 `sendHostSave(text)`，但 `prepareSave` 已算出 `normalized`（`:12`）；T3 约定「宿主收到的 `text` 一律 LF 归一化」。如果源码模式里 `sourceText` 含 CRLF，`currentMarkdown()` 返回 CRLF，直接发给宿主会破坏协议；`withEol` 只该用于浏览器/文件句柄写入。

另外 `pendingSave`（SaveDialog 确认中的保存）与现有 `pendingSaveRef`（宿主写回队列，`App.tsx:400,1687`）同名不同物；计划 `:17` 的「取消不入队」要靠两者区分，命名不清理容易把确认中的文本当成已入队文本。

**修**：`sendHostSave(normalized)`；`withEol` 只给 `commitSave`/`saveAsFile`；把确认状态改 `pendingConfirm`，宿主队列改 `pendingHostSave`；验收补「CRLF 源文档宿主写回后仍是 CRLF」与「确认前消息数 0」。

## 逐项核对记录

### T1
- `prepareSave` 覆盖 `saveFile` 与宿主分支的方向对；但 `saveAsCopy`/`saveAndSwitch` 未覆盖（H1）。
- 新建空基线设 `null`、宿主载入不设 `saveWarned` 的方向对；`saveWarned` 仍被 `commitSave`/`finishSaved` 置 true（H1）。
- 取消只清 `pendingSave`、不写 dirty 的方向对；`saveAsCopy` 取消不写要补脚本。
- 连续保存「有损失每次弹」会被 H2 的分类误报放大；先修分类再谈频率。

### T2
- 未编辑源码用 raw、编辑后用当前并提示，方向对；`rawTextRef` 保存后不更新（H3）。
- `openSourceOriginal` 强制原文，方向对；旧数据回退 `originalText` 合理。
- CRLF：源码显示 raw 含 CRLF；保存走 `prepareSave` + `withEol`，浏览器下载不会变成 LF；需补两例（H3）。

### T3
- 差分分类的方向对，但基线选错（原文 vs 当前序列化）导致用户编辑误报（H2）；`classifyLosses` 需要「序列化基线」而不是「当前 vs 原文」。
- 末尾换行、空行、表格、多行脚注、`\` 硬换行、`&` HTML、自动链接、注释的类别覆盖方向对；`\` 只应标等价改写，不应算数据丢失。
- `findRiskySyntax` 保留薄封装、`risk.ts` 分类、`diff.test.ts` 正反例，方向对；补「用户删行不报」反例。

### T4
- `MUI_PAGE_COMPONENTS` + `Section /o`、默认不勾、卸载 `/ifempty`、`Applications\Sidelight.exe` 的方案与 findings S1/S2 一致，方向对。
- `Select-String 'HKLM'` 0 与现 WebView2 运行时检查冲突（H4）；`/S` 语义需用默认 dry-run 包证明，不能用无 dry-run 的发布包。
- `ASSOC_DRYRUN` 的 `FileWrite` 清单方案可行；确保在 `$INSTDIR` 已存在后执行。

### T5
- 0.20.0、CHANGELOG/README/AGENTS、`packaging/README.txt` 的改法与 findings S3/S5 对齐；不能写「保存不会改坏原文」「支持引用式链接/表格对齐」——计划已列。
- 体积预算 850,000 当前 794,843 + 关联 + 前端 ≈800K，余量够；`package-lock` 根代理同步。
- 文档结论必须等 T1–T3 实际结果，不能提前写 B（H5）。

### 通用
- 文件归属：A T1/T2/T3 串行改 `src/App.tsx`、`risk.ts`、`diff.ts`、`footnotes.ts`、`SaveDialog.tsx`（T3 未列 SaveDialog，H5）；B T4/T5 串行改 `packaging/`、`package.json`、文档；两组零并发重叠成立。
- 构建纪律：A `.tmp/build-a` + `.tmp/host-r7`；B `makensis` 到 `.tmp`；根代理最终 build；成立。
- 可独立复现：T1/T2 的浏览器段可用 stub；宿主段用模拟 `/__doc` + `postMessage`（plan `:18`）可复现；T4 的 `/S`、真实 HKCU、勾选后「打开方式」仍只能 UNVERIFIED；T5 的文档检查可复现。

## 做对的地方（别改过头）

1. T1 把差异门提到所有保存路径之前、把 `saveWarned` 从宿主载入移除，方向正确；这是本轮唯一能阻止「宿主首次保存静默改写」的结构。
2. T2 的 `rawTextRef` + 「未编辑原文 / 已编辑序列化」区分，以及 T3 把 `findRiskySyntax` 扩成 `classifyLosses` 的方向正确；只需把基线从「原文 vs 当前」换成「序列化基线 vs 当前」。
3. T4 的组件页 + `/o` + `ASSOC_DRYRUN`、T5 的「字节与 SHA 只写 CHANGELOG 一处」都是可执行、可验收的方案；保留。

---

### 附：本次审查证据

- `App.tsx:1607-1643`（`saveFile`）、`:1651-1674`（`saveAsCopy`）、`:1794`（`saveAndSwitch`）、`:1519-1520`/`:1554`/`:1729`（`saveWarned`）。
- `SaveDialog.tsx:49-60`（「这次只提示一次」、无第三按钮）。
- `packaging/installer.nsi:54-60`（WebView2 运行时检查使用 `HKLM`）。
- `findings-bug.md:13,70-142`；`findings-ux.md:86-112`；`findings-ship.md:25-48`（dry-run 与 `/S`）。
- 未改产品文件、未 commit；未生成新截图。
