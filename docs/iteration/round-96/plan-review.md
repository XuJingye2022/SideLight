# 第 96 轮计划审查（critic · rev.2 复审，覆盖 rev.1 同名文件）

结论：**PASS**。rev.1 的 H1–H6 全部修掉（逐条见下）；新提 4 条 P2，不阻塞。

## 上版漏洞核对（行号为 plan.md / 实测代码）
- **H1 ✓** plan.md:28 两处 `onClick={() => void runAnalysis()}`。现状 `App.tsx:5334`（`.analyze-button`）与 `:6037`（`.analyze-bubble`）仍是裸引用，无第三处（`git grep runAnalysis` 共 6 处）。plan.md:27 加 `typeof instruction === 'string'` 兜底；`annotationMessages` 是新增导出（当前 src 0 命中），旧调用方绕不过去。
- **H2 ✓** plan.md:12 `resetChat()` + `useEffect(…, [docName])`；plan.md:14「新对话」钮；plan.md:20 验收 h「换文档 turn 0」。`docName` state 在 `App.tsx:578`、`window.__slState.name` 在 `:907`，可观测。
- **H3 ✓** plan.md:29 `editor ? … : ''`。`readBlocks(editor: Editor)`（`App.tsx:200`）落在 null 收窄内，TS2345 已消除。
- **H4 ✓** plan.md:11 用 `chatDraft`，避开 `MarginRail.tsx:83` 的追问 `draft`；plan.md:15 把选择器改成 `.rail-chat-compose textarea`（现状 `styles.css:1346` 确是 `input`，会漏样式）。
- **H5 ✓** plan.md:6 改 `--max 314500`。实测 `node scripts/measure-first-screen.mjs --max 314500` → `raw=1,014,369 gzip=313,086 headroom=1,414` PASS、exit 0；`scripts/measure-first-screen.mjs:19` 的位置参数过滤会跳过 flag 值，`:80-81` 超了真 exit 1，不是自证。
- **H6 ✓** plan.md:14 的 disabled 含 `analyzing`/`!canGenerate` 并给 title。`analyzing` 是既有 prop（`MarginRail.tsx:17`，`App.tsx:5940` 已传）；`canGenerate={viewMode === 'edit'}` 覆盖源码态，预览态整块卸载（`App.tsx:5922`），无静默失效。

## 基线抽查（与计划一致，不需修）
HEAD `a79c9c7`，工作树只有 `docs/iteration/round-96/` 未跟踪；首屏 313,086 / 余 6,914 与 plan 同。`streamChat`（`ai.ts:189`）、`buildMessages` 回 `[system,user]`（`:24-28`）、auth 文案「API Key 无效或没有权限。」（`:76`）、`mockChat` 回复含「（模拟回复）」（`:217`）→ A1/A2 的 E2E 断言可成立。`npm test` 是显式文件列表，新 `chat.test.ts` 必须手挂链尾，plan.md:9 已写。范围仍是用户队列第 3 条；无新依赖、不写正文、只读自带 Key、不动 0.32.1 与 `release/`。

## 新漏洞（P2，不阻塞）
**H7（P2）B-223 不在发现池。** plan.md:3 写「按 B-223（lead/finder 入池）」，但 `git grep -n B-223 -- docs/iteration/BACKLOG.md` exit 1，全仓只在 plan.md 命中。收尾时没有行可标 `fixed`，第 96 轮记录只剩计划文件。
修法：本轮回补一行 P1 `B-223`（证据写用户 2026-11-20 队列第 3 条 + plan.md），或把 plan.md:3 改成「无 BACKLOG ID，lead 派单」。

**H8（P2）A1 单独落地时 `npm run build` 必红。** A1 给 `MarginRail` 加到 5 个必填 prop（plan.md:11），App 侧连线却在 A2.3（plan.md:29）：只做完 A1 时 `App.tsx:5933` 的 `<MarginRail>` 缺 props → TS2741，而 A1 验收 1（plan.md:18）就要求 build。
修法：把 `settings`/`docName`/`getChatContext`/`canGenerate` 的 App 连线并进 A1（`onGenerateNotes` 留 A2），或写明「A1 的 build 在 A2 接线后跑一次」。

**H9（P2）按 `docName` 判身份有三个边界。** 另存为、首次命名都会改 `docName`，会清空正在进行的对话；两篇同名不同目录的文档反而不清空。plan.md:38 的残余 ② 只写了改名。
修法：用 `activeFile?.path ?? docName` 作 key，或把残余 ② 扩成「改名/另存为会清空，同名不同目录不会」。

**H10（P2）源码态的「生成批注」点不到。** 源码态 `MarginRail` 在 `.doc-layout[hidden]`（`App.tsx:5925`）里，click 会被 Playwright 判不可见；A2 验收 ② 的「源码态 disabled」要写成 `evaluate` 读 `button.disabled`。
修法：验收里注明断言方式，别用 click 判。
