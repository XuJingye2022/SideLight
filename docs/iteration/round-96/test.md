# 第 96 轮验收（tester 独立 · 未读 `impl.md`）

轮前 `a79c9c7`，任务 A1 对话页签 + A2「生成批注」（B-223）。**判定：PASS**。

## 门禁
- `npm run build` exit 0（`tsc --noEmit` + vite + host-www 镜像 98 文件）。
- `npm test` **58 文件 800 条 0 fail**（基线 57/786；`chat.test.ts` 12 条、`prompt.test.ts` 8→10）。逐文件求和：`.tmp/r96-tester-npmtest.log`。
- `node scripts/measure-first-screen.mjs --max 314500` exit 0：**raw=1,015,562 gzip=313,360 headroom=1140 files=3**（`target=310000 gap=-3360`，超内部预算只 WARN，硬线内余 1,140）。
- `npm run verify` exit 0（默认 `--max 320000`）：gzip 313,360、headroom 6,640 PASS。
- `roundtrip` 未跑：未改编辑器/序列化（diff 只碰 `App.tsx`/`MarginRail.tsx`/`styles.css`/`ai.ts`/`chat.ts` 及其测试）。

## 静态（改前取 `a79c9c7`；未跟踪文件用 `git grep --untracked`）
| 口径 | HEAD | 现在 |
| :--- | :--- | :--- |
| `git grep -nE 'rail-chat-(log\|turn\|input\|generate\|error\|mock)' -- src` | 0（exit 1） | **13** |
| 对照 `.rail-chat-compose` | 4 | 4 |
| `streamChat` in `MarginRail.tsx` | 0 | 2（import + 调用） |
| `docName` in `MarginRail.tsx` | 0 | 3（prop 类型/prop/effect） |
| `canGenerate` in `App.tsx` | 0 | 1 |
| `annotationMessages` in `ai.ts` | 0 | **2**（定义 + 调用） |
| `instruction` in `App.tsx`+`ai.ts` | 0 | 11 |
| `onClick={() => void runAnalysis()}` | 0（裸引用 2 处 `App.tsx:5334/6037`） | **2**；裸引用 0（exit 1） |

## E2E（自写 `.tmp/r96-tester-a1a2.mjs`，ego CDP **57270**，1440×900/1024×700，自造 2 篇夹具 + 假 FSA + 自写 fetch/SSE）**42/42 PASS，0 pageerror**（`.tmp/r96-tester-a1a2.json`、`.tmp/r96-tester-a1a2.log`）
- a 点「对话」：空态 1、turn 0、`textarea.rail-chat-input` 未 disabled 且可聚焦、空输入「发送」disabled。
- b 输「帮我看这段」Enter：user 1 + 助手占位即出；**626 ms** 回「（模拟回复）…」；完成后 `activeElement` 是 `.rail-chat-input`；log 贴底。
- c 切「批注」再回：仍 2 条（user,assistant）。
- d `Shift+Enter`：value=`换行测试\n`、turn 仍 2。
- e 假 Key + 自写 SSE：推 1 段时「发送」disabled、气泡=`第一段`；推第 2 段 + `[DONE]` 后气泡=`第一段第二段`；请求体 `messages` = `system,user`，system 含「当前文档节选」与夹具正文、user=提问；401 → `.rail-chat-error` 含「API Key 无效」。
- f mock 提示：无 Key **1**、假 Key **0**。
- g「新对话」：turn 0、draft 空、空态回 1。
- h 换 `r96-tester-other.md`：`__slState.name` 随变、turn 0。
- 几何：3 段选区 →「分析本段」3 卡（[146,318]/[330,482]/[494,664]）；再发 3 条对话 +6；切「批注」后栏宽 **320**、首卡 top 146 ≥ 页签底 58+2、3 卡不重叠有序、`.doc-scroll` 横溢 0（1212/1212）；截图 `shots/round-96/rail-chat.png`。
- 1024×700：`.rail-toggle` 开抽屉后对话可见（栏 340、输入可见）、输入可聚焦、页面 `scrollWidth-clientWidth` 0。
- A2：假 Key（`userPrompt=偏好-唯一标记`）点第 2 段 → 输「把第二段的结论提到开头」→「生成批注」→ `__cap.messages[1].content` **逐字含指令**、**不含**「偏好-唯一标记」、首条 system；自动切 `#rail-tab-notes[aria-selected=true]` 且 `.note`=1；再点 `.analyze-button` → 含「偏好-唯一标记」、不含指令；清空输入后发送与生成批注都 disabled；源码态 `viewMode=source`、「生成批注」disabled 且 title=「切回编辑视图再生成批注」。

## 回归
`node scripts/keyboard-acceptance.mjs http://localhost:5175`（`SIDELIGHT_CDP=http://127.0.0.1:57270`）**52/52 PASS**、exit 0（脚本末行 `52/52 PASS`；日志未落盘）；跑完 `git checkout -- shots/round-05/` 已还原 3 张被覆盖截图。未跑 `theme-acceptance`（本轮不碰主题/token）。

## 观察（不判 FAIL、属既有行为）
- 源码态整块 `.doc-layout` 收尺寸（第 64 轮 `.source-hidden`），侧栏在源码态不可见；A2 的「源码态生成批注 disabled」按 **DOM 属性**验（`disabled=true`、`title` 命中），非点击路径。
- 1024×700 抽屉自身宽 340（抽屉布局口径，非 320 栏宽）；页面级横溢 0。
- 对话只按 `docName` 判身份：改名也清空（计划已记残余）；预览态 `!previewMode` 卸载栏 → 对话随预览清空。

## UNVERIFIED
- 真实中文输入法在 textarea 里回车的 `isComposing` 分支（只验了合成 keydown；代码判 `event.nativeEvent.isComposing`）。
- 真模型对话质量与真 SSE 网络（fetch/SSE 为页面内假实现，401 也用假 Response）。
- 真 WebView2 宿主、原生打印（本轮未要求）。
