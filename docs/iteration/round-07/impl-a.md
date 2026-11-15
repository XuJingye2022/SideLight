# 第 07 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T1 → T2 → T3。基线 `92a3ac6`（工作树含 B 组 T4/T5 的改动）。未 commit；未跑 `npm run build`；未装依赖。
边界：改了 `src/App.tsx`、`src/components/SaveDialog.tsx`、`src/lib/diff.test.ts`、`src/styles.css`，新建 `src/lib/risk.ts`、`scripts/data-safety-acceptance.mjs`；`docs/roundtrip-report.md` 是 `npm run roundtrip` 生成物 + 本轮结论追加。未碰 `packaging/**`、`README.md`、`AGENTS.md`、`docs/CHANGELOG.md`、`docs/adr/**`、`package.json`。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T1 四条保存路径统一差异门 | **PASS** | 脚本 34/34：引用式链接取消保存写入 0、再按仍弹；宿主确认前 `postMessage` 0、确认后 1 条且 text 无 `\r`；另存为取消 `save picker=0`；保存并切换先弹确认、取消不切不写；新建/普通/表格值改动不弹 |
| T2 源码显示原文、保存后同步 | **PASS（3/4 直接实测，#4 复用第 06 轮宿主证据）** | 未编辑点横幅 → textarea 逐字节等于文件原文（两行 `[id]:` 都在）；确认保存后切源码 → 等于刚写入的文本；写入以 `\n` 结尾 |
| T3 两类损失分类 + SaveDialog 分组 | **PASS** | `classify`/`activeLosses` 11 条新单测全绿；`npm test` 16 文件 188 条；roundtrip 03/05/07 仍完全保真；02/04 被保存门拦下（报告写明） |

## T1 保存差异门覆盖所有保存路径

### 改动

- **唯一入口**：`prepareSave()` 产出 `{normalized, withEol}`（宿主只拿 LF，文件拿原换行；原文以 `\n` 结尾而产物没有时补回）；`requestSave(target: 'host'|'file'|'saveAs'|'switch')` 统一四条路径：`saveFile`、`saveAsCopy`、`saveAndSwitch`、宿主写回。
- **判定**：`activeLosses(originalText, normalized, baselineLossesRef.current)`；基线在载入时算好（`baselineLosses(原文, 编辑器序列化)`），基线为空时永不拦；`losses.length > 0 && !saveWarned` 才 `setPendingConfirm`。
- **确认**：`confirmSave()` 是唯一 `setSaveWarned(true)` 的地方，然后按 target 执行 `sendHostSave(normalized)` / `performCommit` / `performSaveAs` / 保存后切换。`cancelConfirm()` 只清 `pendingConfirm`，不动 dirty、不写字节。
- **改名**：状态 `pendingSave` → `pendingConfirm`（对象含 normalized/withEol/target/losses）；宿主写回队列 `pendingSaveRef` → `pendingHostSave`。`commitSave`/`finishSaved`/`sendHostSave` 里的 `setSaveWarned(true)` 全部删除（`loadIntoEditor`/`applyHostPayload` 只重置成 false）。
- **宿主不可写**：`requestSave('host')` 自动改走 `saveAs`；`dirty === false` 且宿主文档 → 「没有改动，未写入」，不发消息。
- **SaveDialog**：改成按损失类别渲染（类别标题 + 影响条数 + 前 3 行原文），等价改写单列；多一个「在源码模式看原文」按钮。

### 证据（`node scripts/data-safety-acceptance.mjs` → 34/34 PASS）

```
引用式链接样本：横幅出现；改字 Ctrl+S 弹框并列两行定义；取消 → 写入 0、dirty=true；再按仍弹
确认后才写 1 次，写出文本无 \r，dirty=false
宿主模拟：确认前 postMessage=0；确认后 1 条 save，text 无 \r；回包 ok 后 dirty=false
另存为：先弹确认；取消 → save picker=0、写入 0；确认 → picker=1、写入 1
新建文档：不弹，直接保存；普通文档：不弹，直接写盘
表格（分隔行会重排）：改表格外段落 → 弹框且含「表格分隔行」；只改单元格值 → 不弹
保存并切换：脏文档点 b.md → 切换确认 →「保存并切换」→ 先弹差异确认；取消 → 仍 a.md、写入 0
```

截图：`shots/round-07/t1-confirm-refs.png`、`t1-confirm-table.png`。

## T2 源码模式显示原文，保存后同步基线

- `rawTextRef`：`loadIntoEditor`/`applyHostPayload` 写入原文；空文本/新建清 `null`；`finishSaved`、宿主 `save-result ok` 更新成刚写入的文本，同时清空结构损失基线。
- `switchView('source')`：`!dirty && rawTextRef !== null` → 原文；`dirty` → 当前内容，并在源码框上方显示「源码里是你的改动 + 编辑器整理结果，不是文件原文」。
- `openSourceOriginal()`：从横幅/确认框强制用 `rawTextRef`（退回 `originalText`）初始化源码视图并切过去。
- 横幅文案改成分类型可验证：「这篇载入时就有会被改写的结构（N 类）：…」+「在源码模式打开原文」「知道了」；`role="status"`，源码视图也显示。工具条「源码」的 title 分未编辑/已编辑两种说法。
- 末尾换行：`prepareSave` 里补回（原文有、产物无时）。
- 证据：未编辑源码 textarea 逐字节等于 `04-reference-links.md` 原文；保存后切源码等于刚写入的文本（脚本断言）；写出文本以 `\n` 结尾。
- **第 4 条（CRLF 源文档宿主写回仍 CRLF）本轮没重跑真实宿主**：浏览器模拟只能证明发给宿主的是 LF 且无 `\r`，CRLF 落盘由宿主负责，第 06 轮真实宿主验收（`.tmp/host-a`，14/14）已覆盖同一路径。这里标 PARTIAL，留给根代理决定是否重跑。

## T3 风险识别改差分（两段基线）+ SaveDialog 分类 + 顺手修

- **`src/lib/risk.ts`**（新）：`classify(before, after)` 覆盖引用式链接定义、表格分隔行、多行脚注续行、含 `&` 的 HTML、自动链接、HTML 注释、`\` 硬换行、末尾换行、空行增删。`baselineLosses(original, serialized)` 只留 blocking；`activeLosses(original, current, baseline)` 用 key 取交集——基线为空永远返回空数组。
  - 表格：按表头单元格值做 key，只有「同一张表还在、分隔行文本变了」才算；单元格值变、增删行、删表都不算。
  - 引用式链接：定义行消失且 URL 仍出现在当前文本（说明是序列化改写）才算；用户把整段连同 URL 删掉不算。
  - `\` 硬换行、末尾换行、空行增删：`blocking: false`，只进「等价改写」，不拦保存。
  - 代码围栏里的定义不算链接。
- **`diff.test.ts`**：新增 11 条断言（基线命中、基线为空不拦、代码围栏、表格空白变化、表格值/删行反例、`&` HTML、自动链接、多行脚注、`\` 等价、末尾换行、删整段反例）。`npm test` 188 条（原 177 + 11）。
- **SaveDialog**：按类别分组（标题 + 影响条数 + 前 3 行原文），等价改写单列；取消/仍然保存/在源码模式看原文三个按钮；文案改为「这篇后续保存仍会在有格式损失时提示」。
- **`docs/roundtrip-report.md`**：重新生成并追加第 07 轮结论——03/05/07 完全保真；02 的 `-3 +5` 与 04 的 `-4 +1` 都是保存门拦截项；01/06 只剩空行差异（等价，不拦）。
- 门禁：`npm run roundtrip` 中「当前应用（扩展 + 保真修复）」仍是 **3/7 完全保真**，03/05/07 为 `ok`，02/04 明确拦截。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 个文件、188 条断言、0 失败
npx vite build --outDir .tmp/build-a  → exit 0
node scripts/data-safety-acceptance.mjs → 34/34 PASS
npm run roundtrip                     → 当前应用 3/7 完全保真；03/05/07 仍保真
```

产物大小：本轮未单独记录（不跑 `npm run build`；`.tmp/build-a` 由根代理复核）。

## 与计划的偏离

- **D1（`findRiskySyntax` 删除而非薄封装）**：横幅改用 `lossLabels(baselineLosses(...))`，能分类型显示；`findRiskySyntax` 已无调用方，直接删掉，避免两套判定。
- **D2（`baselineLosses` 签名）**：`risk.ts` 不依赖 Tiptap，签名是 `baselineLosses(original, serialized)`；计划里的 `baselineLosses(original)` 由 App 在载入时用 `serializeBody(editor)` 补第二参数完成。
- **D3（SaveDialog 折叠）**：等价改写（空行/硬换行/末尾换行）列成一段列表，没有做逐类展开；只影响可读性，不影响拦截判定。
- **D4（02/04 未修到保真）**：本轮不碰序列化/解析层；02 与 04 由保存门拦下，报告写明，符合 T3 的「要么修好、要么明确拦截」。
- **D5（切文档测试用目录 stub）**：`showDirectoryPicker` 用内存目录句柄，不是真实 Windows 对话框；验证的是 `requestSave('switch')` 与确认取消语义。
- **D6（宿主只跑模拟）**：`/__doc` + `window.chrome.webview` 都用页面内 stub；真实宿主进程本轮未起（CDP/端口归 B 组），CRLF 落盘复用第 06 轮证据。
- **D7（末尾换行只修普通/文件路径）**：宿主路径的尾部换行由宿主按 `endsWithNewline` 还原，前端只保证发 LF；本轮不重复宿主修复。

## 遗留

1. T2 第 4 条（CRLF 源文档真实宿主写回 + 源码显示原文）未在本轮重跑真实宿主；需根代理用 `.tmp/host-r7` 或放行后用第 06 轮宿主副本复核。
2. 02-table 的 `-3 +5`、04-reference-links 的 `-4 +1` 仍是已知损失，只是被拦；彻底保真要解析/序列化层重写，属下一轮/独立 ADR。
3. 01/06 的空行差异归为等价改写，保存时不拦；若产品要求逐字节，需把空行也加入 blocking 并接受「每次保存都弹」。
4. SaveDialog 的等价改写未做展开，只是列表。
5. 真实系统文件选择器、真实宿主、安装版真人双击仍属未验清单。
