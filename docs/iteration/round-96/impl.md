# 第 96 轮执行报告（executor）· 对话区（B-223）

轮前 `a79c9c7`，按 plan.md（rev.2）做 A1/A2；A1 先落地时 `onGenerateNotes` 是临时接线（H8），A2 完成后才跑最终门禁。

## 状态

- **A1 DONE**：新 `src/lib/chat.ts` + `chat.test.ts`（12 条）+ `MarginRail.tsx` + `styles.css` + `package.json`（test 链尾）
  + `App.tsx`（`settings`/`docName`/`getChatContext`/`canGenerate`/`onGenerateNotes` 五项连线）。口径见 CHANGELOG。
- **A2 DONE**：`ai.ts` 新 `annotationMessages(…, instruction?)` + `StreamOptions.instruction`（`prompt.ts` 标签没动）；
  `App.tsx` 的 `runAnalysis(instruction?)`、`runOne` 透传、两处 `onClick` 改 `() => void runAnalysis()`；
  `prompt.test.ts` +2；`CHANGELOG.md` 第 96 轮小节 + 标题上界 96。

## 命令

- `npx tsc --noEmit` → exit 0
- `npm test` → **58 文件 800 条 0 fail**（基线 57/786）日志 `.tmp/r96-impl-npmtest.log`
- `npm run verify` → PASS `raw=1015562 gzip=313360`（基线 313,086，净 **+274 B**；超内部预算 3,360 B 只 WARN）
- `measure-first-screen.mjs --max 314500` → **PASS exit 0**（`headroom=1140`）；未改编辑器/序列化，不跑 `roundtrip`

静态门（改前→改后）：`rail-chat-(log|turn|input|generate|error|mock)` in `src` **0→13**；
`streamChat`(MarginRail) **0→2**；`docName`(MarginRail) **0→3**；`canGenerate`(App) **0→1**；`annotationMessages`(ai.ts)
**0→2**；`instruction`(App+ai) **0→11**；`onClick={() => void runAnalysis()}` **2 处**。

## E2E（ego CDP 57270，1440×900，先 `node .tmp/reset.mjs 57270`）

- `.tmp/e2e-r96-a1-chat.mjs` **33/33 PASS**、0 pageerror：a 空态 1 / turn 0 / 输入可聚焦 / 空输入「发送」disabled；
  b 出「（模拟回复）」逐字、焦点回输入框、log 贴底；c 切页签往返仍 2 条；d Shift+Enter 换行不发送；e 假 Key 手推 SSE：
  1 段时「发送」disabled、2 段+`[DONE]` 拼成 `第一段第二段`、请求 system 含「当前文档节选」且末条=用户那句、401 出
  「API Key 无效」；f `.rail-chat-mock` 无 Key 1 / 假 Key 0；g「新对话」→ turn 0 且空态回 1；h 换文档 → 名字变、turn 0；
  几何 3 卡 `[146,318][330,500][512,664]` 不重叠、首卡 146 ≥ 页签底 58+2、栏宽 **320**、横溢 **0**；1024×700 抽屉开
  后对话可见、输入可聚焦、横溢 0；源码态「生成批注」disabled。
- `.tmp/e2e-r96-a2-generate.mjs` **14/14 PASS**、0 pageerror：点第 2 段 → 输「把第二段的结论提到开头」→「生成批注」→
  `__caps[0].messages[1].content` 以「作者偏好与检查重点：\n把第二段的结论提到开头」开头、不含「偏好-唯一标记」；
  自动切 `#rail-tab-notes[aria-selected=true]`、`.note` 1、输入框清空；再点 `.analyze-button` → 含偏好不含指令；
  空输入两钮 disabled；源码态「生成批注」disabled（读 `disabled` 不点，H10）。
- 截图 `shots/round-96/rail-chat.png`（Playwright 直出：`scripts/shot.mjs` 硬连 CDP 9222，本轮不可用）。

## CHANGELOG

已写第 96 轮三条（2 功能 + 1 门禁）；tester 可补验收行。

## 新踩坑（3 条）

1. **空输入时「发送」恒 disabled，不能拿它判「busy 结束」**：流式结束后 `!draft.trim()` 仍让它 true。判「不忙」用
   `.rail-chat-reset` 或助手气泡文本，否则轮询永不到达、断言假红。
2. **对话面板 `hidden` 时 Playwright `fill()/click()` 抛**：不切页签喂草稿只能 `evaluate` + 原生 value setter + 派发 `input`。
3. **`runAnalysis` 加可选参数后 `onClick={runAnalysis}` 会把 `MouseEvent` 当指令**：两处裸引用必须一起改，只加
   `typeof` 兜底在 `strict` 下仍 tsc 红。

## 残余（未入池）

① 预览态卸载 `MarginRail` → 对话随预览清空；② 按 `docName` 判身份：改名/另存为清空、同名不同目录不清（H9）；
③ 无 Key 时 `mockChat` 不看 `instruction`；④ 组合输入回车只按 `isComposing`，未实测（UNVERIFIED）。
