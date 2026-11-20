# 第 113 轮执行报告（executor）

轮前 `9e4990c`。A1/A2/A3 全 DONE，回滚 0 条。

## A1 失败收尾撤掉空 assistant 占位（B-243）

- `src/lib/chat.ts:73-83`：`appendDelta` 后加导出纯函数 `dropEmptyAssistantTail(turns)`——末条不存在 / 非 assistant / 有字 → 返回同一引用；否则 `slice(0,-1)`。
- `MarginRail.tsx:18` import；`catch (error)`（`:213`）改成 `if (!aborted && aliveRef.current) { setChatError(...); setTurns((previous) => dropEmptyAssistantTail(previous)) }`（`:216-219`）。渲染 `:728` 的 `turn.text ||` 与 busy「…」未动。
- 静态核对：`dropEmptyAssistantTail(` 全文件 **1 处**（在 `catch (error)` 后 138 字符）；`setTurns(dropEmptyAssistantTail(turns))` **0 处**。
- `git diff --stat`：产品代码 3 文件（chat.ts +13、MarginRail.tsx +8−2、chat.test.ts +52）；第 4 个 `BACKLOG.md` 属 A3。

## A2 单测 + 静态门（chat.test.ts 18 → 20）

- ① 纯函数 4 组：`[user]+[assistant,'']` → 1 条且与原前缀 `deepEqual`；`[user]+[assistant,'答']`、`[]`、末条 user 都 `assert.equal` 同一引用。
- ② 读源码静态门：`dropEmptyAssistantTail(` 恰 1 处且在 `catch (error)` 后 ≤400 字符、闭包写法 0、渲染区 `turn.text ||` 与 busy「…」仍在。
- `node --experimental-strip-types src/lib/chat.test.ts` → **20 条 0 fail**。

## A3 真机证据 + 收口

- 新建 `.tmp/e2e-r113-chat-401.mjs`：只借 r112-finder 的 header / 假 FSA / 开局清库 + reload + 开 `a.md` + 对话页签 / `chatState`；不复制其 A/B 两段、不写 `shots/round-112/`；开头 `mkdirSync('shots/round-113',{recursive:true})`。
- **a–e 全 OK**、0 pageerror（`.tmp/r113-chat-401.json`）：
  - a：401 后 turn **1**、assistant **0**、`role=log` 空文本子元素 **0**、`.rail-chat-error` 含「API Key 无效」、`aria-busy=false`（turn 高 35 px）；改前同状态 2 条 + `{text:"",h:16}`；
  - b：连发两次仍 2 条全 user（函数式 setTurns 没吞上一轮）；
  - c：假 SSE 成功 → assistant 1 = 「看到啦」（撤占位未波及正常回答）；
  - d：「新对话」→ 0 条、错误消失；e：0 pageerror。
- 截图 `shots/round-113/chat-401-no-bubble.png`（45,089 B）。
- 回归：r96 **42/42**、r112 **10/10**（均 0 pageerror）。跑前后各 `git checkout -- shots/round-112 shots/round-96`；`git status --porcelain shots/round-96 shots/round-112` 为空。
- BACKLOG：B-243 `open`→`fixed` 补证据（行号更正 `:196` / `:213-215`）；`## Deferred（不阻塞停止）` 加 B-246 一行（200 空流 = 静默失败，另开轮）。未加新 open 条目。

## 门禁

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0，无输出 |
| `npm test` | **62 文件 884 条 0 fail**（chat.test.ts 18→20） |
| `npm run verify -- --max 316000` | PASS；门 gzip **315,218 B**（净 +5，改前 315,213；余硬线 320,000 4,782 B） |
| 懒 chunk `MarginRail-*.js` | raw 19,597（+104）/ gzip9 **6,916**（+32）；真实首载 **322,134**（改前 322,097，B-229 仍 open） |

## CHANGELOG 一行建议

- 对话页签：请求失败（如 Key 错）后撤掉从没被填过的空回答气泡，错误只留在提示条里。

## 新踩坑

1. **快手失败不能只等 `aria-busy=false` 判收尾**：按 Enter 后立刻轮询先读到旧状态 `false`（React 未提交），假绿。要先固定等 1.5 s 再轮询（`sendAndSettle`）。
2. **页面 reload 后假 FSA 的 `getAsFileSystemHandle` 覆盖会丢**：树不一定恢复，须在 `.tree-file` 数为 0 时重跑 `openFolder()`。
3. **`npm test` 没有总计行**：逐文件跑 `node --experimental-strip-types`，要用 `^ℹ tests (\d+)` 逐条求和才得 62 文件 884 条。
