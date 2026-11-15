# 第 10 轮 · 实施报告 A 组（builder）

日期：2026-11-16。范围：T1 → T2 → T3。基线 `24bb46a`（工作树含 B 组 T4/T5）。未 commit；未跑 `npm run build`；未改 `host/**` 与文档类文件。
边界：改了 `src/App.tsx`、`src/lib/risk.ts`、`src/lib/frontmatter.ts`、`src/lib/frontmatter.test.ts`、`src/lib/diff.test.ts`、`src/styles.css`、`scripts/roundtrip.mjs`，新建 `src/lib/serializeDocument.ts`、`src/lib/tableReuse.ts`、`scripts/fidelity-acceptance.mjs`；`docs/roundtrip-report.md` 由脚本重新生成。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 表格 02 保真 + 共享序列化 + 三栏输出 | **PASS** | 02 rich 逐字节等于原文；`serializeDocumentBody` / `serializeDocument` / App 保存三处一致；未改动表格保存与原文相同，改值后规范退让且不弹确认；roundtrip 报告已是 rich/source/firstSaveBlocked 三栏，无「5 / 7」「6 / 7」 |
| T2 frontmatter 后空行 01 保真 | **PASS** | 01 rich 逐字节等于原文；`split→join` 0/1/2/3 空行单测全绿；App 的 `joinFrontmatter` 调用点只剩草稿一处且传了 leading，其余五处统一走 `serializeDocument` |
| T3 引用式链接默认源码模式 + 退出守卫 | **PASS（浏览器入口实测；宿主入口代码路径，未起真实宿主）** | 打开 04 后 `viewMode==='source'`、源码框逐字节等于原文；源码未编辑 Ctrl+S 写出非空且逐字节等于原文；源码改字后点「回到富文本编辑」弹确认，取消内容/dirty 不变，确认后切回；切回后首次保存仍被拦 |

## T1 表格整块复用与共享序列化

- **`Table.extend` 先验结论**：有效。在 `MarkdownManager` 的扩展列表里用扩展后的 `Table`，`renderMarkdown` 能把表格自带的首尾 `\n` 裁掉；App 与 `scripts/roundtrip.mjs` 都注册了同一个 `ReusableTable`。因此没有启用「在共享出口再裁一次」的兜底。
- **`serializeDocument(editor, {frontmatter, footnotes, original})`**：编辑器 Markdown → 既有 repair 链 → `reuseTables(original, body)` → 拼脚注 → 拼 frontmatter。末尾换行统一成原文的个数（序列化器会多带一个 `\n`，01 的 143→144 就是它）；`serializeDocumentBody` 是只出正文的薄封装，供三处同源验收。
- **三处同源**：`App.tsx` 的 `serializeBody`、`currentMarkdown`、`scripts/roundtrip.mjs` 的 `throughApp` 都走 `serializeDocument*`；`serializeBody` 目前没有调用方（基线/草稿/当前 Markdown 已全部改为带 original 的 `serializeDocument`），保留它作为共享出口的薄封装，避免以后又写一份。
- **`tableReuse.ts`**：`collectTables`（fenceMap 跳过代码块、表格块=表头+分隔行+数据行，不含前后空行）、`splitCells`（支持 `\|` 转义）、签名（表头单元格 + 列数 + 对齐三元组 + 全部数据单元格），多表按出现序号配对；签名命中整块换回原文行。
- **风险降级**：`table-separator` 改为 `blocking:false`；基线在复用后的文本上算，02 的基线因此为空。改值/加列/删行/改对齐四种退让由单测覆盖；App 实测改值保存不弹确认、写出的文本含改后的字与规范分隔行。
- **报告**：`npm run roundtrip` 现在给三栏（rich / source / firstSaveBlocked），逐样本数字由脚本重算；汇总行写「5 个样本完全保真（共 7 个）」而不是「5 / 7」。06 在「已知边界」写明：多 1 个空行、不修、二次往返收敛。

## T2 frontmatter 后空行

- `leadingNewlines(text)` 独立导出（数正文开头 `\n` 的个数，支持 CRLF）；`SplitResult` 未改，既有 4 条 `deepEqual` 全部保留。
- `joinFrontmatter(frontmatter, body, leading?)`：不传第三参时与旧实现逐字节相同；传了才补 `max(0, leading − current)`，`body === ''` 不补。
- **关键修正**：leading 必须取「frontmatter 之后的 body」的开头空行，不能对整篇原文取（整篇开头是 `---`，永远 0）。`serializeDocument` 内部对 `original` 调 `splitFrontmatter(original).body` 再 `leadingNewlines`；`scripts/roundtrip.mjs` 显式传 `leadingNewlines(frontmatter.body)`。
- **grep 调用点**：`src/App.tsx` 只剩 `onUpdate` 草稿拼接一处 `joinFrontmatter(..., leadingNewlines(splitFrontmatter(original).body))`；原先的 initial 基线、applyHostPayload 基线、loadIntoEditor 两处基线、currentMarkdown 共 5 处都改成 `serializeDocument`（内部补 leading）。`scripts/roundtrip.mjs` 的旧 `joinFrontmatter` 调用已随三栏重写走 `serializeDocument`。
- `frontmatter.test.ts` 新增 4 条：leadingNewlines 0/1/2/3、split→join 0/1/2/3 逐字节、空 body 不补、无第三参行为不变。**3 个空行在 split→join 层能逐字节保住**；解析侧 3 个空行的样本不在 fixtures 里，rich 上限未单独证明（本轮 01 的 1 个空行已保真）。

## T3 引用式链接默认源码模式

- `risk.ts` 导出 `hasReferenceDefinitions` / `countReferenceDefinitions`（复用 `REF_DEFINITION` + `fenceMap`，围栏内不算）。
- **`enterSourceFor(text)`**：`setSourceText` + `sourceBaselineRef.current = text` + `setViewMode('source')`（并关专注/打字机）。`loadIntoEditor` 与 `applyHostPayload` 只在 `hasReferenceDefinitions(原文)` 时调它；草稿恢复在 `recoverHostDraft` 里显式 `setViewMode('edit')`，新建/示例/空文本不进。
- 源码视图常驻说明条 `.source-note`：「源码模式 · 文件原文 / 你的改动 + 编辑器整理结果」+「这篇有 N 条引用式链接定义…」+「回到富文本编辑」按钮；不再只在 dirty 时出现 `.source-hint`。
- **退出守卫**：`backToRich` 在 dirty 时弹 `.dialog`「源码里有未保存的改动…」；取消不动 `sourceText` 与 dirty；确认后 `switchView('edit')`（`applySource` 把源码写回正文）。编辑视图里 `openSourceOriginal` 在 dirty 时同样先确认「打开源码原文会丢掉改动」。
- **保存后仍拦**：源码模式保存是原文，`finishSaved(..., keepLosses=sourceMode)` 不清空 `baselineLossesRef`；切回富文本后首次保存仍命中 `reference-links` blocking loss，弹出第 7 轮的差异确认。
- 验收脚本 `fidelity-acceptance.mjs`：02 三处字节相同、01 保存字节相同、02 改值不弹、04 默认源码 + 源码 Ctrl+S 非空且等于原文 + 退出确认取消/确认 + 切回后首次保存被拦。

## 门禁

```
npx tsc --noEmit                        → exit 0
npm test                                → 16 个文件、205 条断言、0 失败（frontmatter +4、diff +9）
npm run roundtrip                       → rich 5 个保真（共 7）；source 7 个等值；firstSaveBlocked 1 个（04）
npx vite build --outDir .tmp/build-a    → exit 0
node scripts/fidelity-acceptance.mjs    → 19/19 PASS
node scripts/keyboard-acceptance.mjs    → 28/28 PASS（回归）
```

## 与计划的偏离 / 遗留

- **D1（`serializeDocument` 多做了末尾换行归一）**：只补不裁会让 01 多出 1 字节；现在「原文末尾几个换行，输出就几个」，01/02 才逐字节相同。这属于共享出口的边界，已写进报告说明。
- **D2（`serializeBody` 当前无调用方）**：保留为 `serializeDocumentBody` 的薄封装，满足「三处同源」的代码归属；实际保存路径统一用带 original 的 `serializeDocument`。
- **D3（source 列是定义等值）**：报告不启动源码编辑器，只按「源码不经过解析」记为等值；条件「未编辑源码」已写在表头说明。
- **D4（3 个空行的解析侧上限未证）**：split→join 层 0/1/2/3 全过；fixtures 没有 3 空行样本，rich 的 3 空行未测。
- **D5（T3 宿主入口未实测）**：`applyHostPayload` 走同一个 `enterSourceFor`，但本轮没有起真实宿主；浏览器入口已实测。
- **D6（`scripts/acceptance.mjs` 回归未通过）**：本机 CDP 的 JS `prompt` 一律 `Page.handleJavaScriptDialog: No dialog is showing`（直接 `window.prompt` 也复现），与本轮代码无关；该脚本不在本轮门禁，未改它。
- **D7（06 不修）**：taskList 间空行仍 +1，报告「已知边界」写明不修、二次往返收敛。
- **D8（`__slMarkdown` 调试口）**：为验收三处同源，把 `currentMarkdown` 暴露到 `window.__slMarkdown`（与既有 `__slState` 同类，只读调用）；如不希望留在产品里，可下一轮删除。

## 截图

- `shots/round-10/t1-table-edited.png`（02 改单元格后保存）
- `shots/round-10/t3-source-default.png`（04 默认源码模式 + 说明条）
- `shots/round-10/t3-rich-save-blocked.png`（切回富文本后首次保存被拦）
