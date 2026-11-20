# 第 116 轮执行报告（B-242 对话发言者标识）

HEAD `c3bf749`；A1/A2/A3 全部完成，0 回滚。

## A1 署名 + 条件渲染 + 机械门 — DONE

- `src/lib/chat.ts:136` 新 `chatSpeaker(role)`（`我：`/`侧灯：`），注释只写「只显示层，不进 `turn.text`」、不出现函数名（静态门口径）。
- `MarginRail.tsx:18` 加 import；`:773` 在 `<p>` 内、正文表达式前插 `{(turn.text || busy) && <span className="rail-chat-speaker">{chatSpeaker(turn.role)}</span>}`；原 `{turn.text || (busy && …'…')}` 未动（200 零 delta 不标署，B-246 范围不变）。
- `styles.css:1552-1560`：`.rail-chat-speaker` 6 声明 sr-only，块内三禁写 0。
- `chat.test.ts` +3（20→**23**）：纯函数两值；MarginRail 400 字切片（恰 1、条件与次序、忙省略号）；styles.css 按块 6 声明 + 三禁写（P2-4）。
- 23/23；负向 stash MarginRail+styles → **21 pass/2 fail**（恰 ②③）→ pop 23/23（`.tmp/r116-tests-{red,green}.log`）。
- 静态：`rail-chat-speaker` 0→**2**、`chatSpeaker` 0→**3**（`-- src` 口径 9 行，只记录）。

## A2 真机前后对照 — DONE

`.tmp/e2e-r116-speaker.mjs --phase before|after`（ego CDP 57270、1440×900、无 Key mock、无需假 FSA）。

- before 在 A1 前跑（P2-3）：`.tmp/r116-speaker-before.json` 3/3 OK —— 2 turn、署名 0、`innerText` 无两枚、0 pageerror。
- after **8/8**、0 pageerror：每 turn 恰 1 枚；剥前缀后 user/assistant 与 before 逐字相等；`innerText` 与 Range 都含两枚；CDP AX 树两枚 `ignored:false`；sr-only 计算值 absolute/inset(50%)/hidden、rect 1×1、三禁值 0；turn 高 35/58 与 log 108 等于 before、栏宽 320。
- 截图 `shots/round-116/chat-speaker.png`（39,676 B）、`chat-speaker-revealed.png`（40,430 B，注入后还原）。
- 旧脚本 10 文件 12 点各加 `stripSpeaker`（r113 的 `emptyChildren` 先 strip 再判空；r108-tester-live 两处含 P2-1 的 `text`）；`node --check` 10/10；复跑 r96-tester 42/42、e2e-r113 a–e 全 OK，跑完 `git checkout -- shots/round-96`（`.tmp/r113-chat-401.json`）。余 8 个只静态改 + 语法检查（UNVERIFIED）。

## A3 门禁 — DONE

- `npx tsc --noEmit` exit 0。
- `npm run verify -- --max 315800` **PASS**：门 **315,509 B**（+17、余 291；距硬线余 4,491）、raw 1,023,714；chunk gzip9 **7,392**（+55、上限 7,460）；合计 **322,901**（+72、超硬线 **2,901**，B-229 open）。
- `npm test` **62 文件 895 条 0 fail**（`.tmp/r116-npm-test.log`）；`roundtrip` 未跑。
- BACKLOG：B-242 → fixed + 三数证据；B-229 补复测一行。未碰 README/CHANGELOG/STATE 与 B-233/B-238/B-244/B-246/B-248。

## CHANGELOG 一行建议

- 对话记录给每条消息加 sr-only 发言者署名（`我：` / `侧灯：`），读屏与复制都能分出谁在说（B-242）。

## 新踩坑

1. sr-only 的 `position:absolute` 让 `innerText` 把署名单独断行（Range 仍连读）：旧脚本别断「开头就是正文」。
2. `emptyChildren` 必须在注入回调先剥前缀：署名让空 assistant 的 `textContent` 变成 `侧灯：`，不剥 B-243 回归会**假绿**。
3. 注释别出现被 `git grep -F` 当门的字串：chat.ts 注释写函数名会把 0→3 的门顶成 4。

## 偏差

- reveal 注入另加 `width/height:auto;overflow:visible`（只写 static+clip-path 仍被 1px+hidden 遮住）；拍完 remove，页面状态还原。
