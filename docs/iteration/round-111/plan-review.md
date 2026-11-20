# 第 111 轮计划审查（critic，revision 1 复核）

结论：**PASS**（新 P2 = 3，无 P0/P1）。H-1…H-5 全落到位；三条 P2 只改预期/措辞/引用，不改产品改法。

## H-1…H-5 复核（plan.md 行号）

| id | 落点 | 判 |
| :--- | :--- | :--- |
| H-1 P1 红基线不稳 | plan:24-27（focusin + 16 ms 采样、只统计 t>tClick、点前断 `aria-busy` 与 `activeElement`）+ plan:32 | 已落地；<16 ms 瞬态由 focusin 补，改前红可归因 |
| H-2 P2 git status 假路径 | plan:39（4 个 M + 2 个 `??`、注明 `.tmp` 不入 status） | 已落地 |
| H-3 P2 二维只证一维 | plan:9、38（test.md 写不可达、单测覆盖） | 已落地（措辞见 N-2） |
| H-4 P2 判读未落字 | plan:8、38（按缺陷读、两条交付行为、lead 确认） | 已落地 |
| H-5 P2 回归漏 r96 | plan:38（A2① 加 r96 33/33、② 加 shots/round-96） | 已落地 |

## 新漏洞

### N-1（P2）场景 C 的「改前绿」写反

位置：plan:29 对 plan:32。旧代码 finally 无条件 `inputRef.current?.focus()`（`MarginRail.tsx:208-214`，全文件恰 1 处），C 在流式中把焦点带进正文，收流后旧代码必回焦 → **C 改前必红**，不是绿。照「A/C 绿」跑 before 会与预期相反，executor 可能怀疑夹具或改弱 C 断言；而 C 恰是 H-4 交付行为②（焦点移出面板不回焦）的唯一 E2E 证据。
修：plan:32 改「B/B2/C 红、A 绿」，并写明 C 的改前红是旧无条件回焦的第二证据（A 绿 = 普通收流仍回焦，C 绿 = 不回焦为本轮新增行为）。

### N-2（P2）「(true,true) E2E 不可达」不成立

位置：plan:9、38。按钮入口确禁用（`:695`）、卸载走 `aliveRef`（`:162-165`）；但拖入 `.md` 打开（`App.tsx:2837` `openDropped` → `requestLoad` → `loadIntoEditor` 不聚焦）时焦点可仍在 `.rail-chat-input`，`docName` 变 → `:170` `resetChat` → abort → 该格可达；此时旧代码回焦是 no-op，新旧无可见差异。
修：test.md 措辞收窄成「无按钮/键盘入口；拖入打开可达但新旧无可见差异（焦点本就在输入框）」，保留「只有单测真值表覆盖」，免测试者按绝对化措辞反咬。

### N-3（P2）存储清理的引用与事实不符

位置：plan:22「清 localStorage+indexedDB 再 reload（r108 `:32-42`）」。实测 r108:32-42 只 `localStorage.clear()+sessionStorage.clear()` 后 reload，无 indexedDB 清理。
修：引用改「照 r108 的清存储 + reload 思路」，并写明 indexedDB（句柄库）清理是本轮自写；或改引 r102（不清 IDB 也 13/13）。

## 已核事实（HEAD `c626e66`，工作树只 `?? round-111/`）

- 行号对上：`resetChat` `:151-158`（abort `:152`）、`[docName]` effect `:169-171`、finally `:208-214`、唯一 `.focus()` `:212`、busy 时 reset disabled `:695`、`#rail-panel-chat` `:684`、`.rail-chat-log` 带 `aria-busy`/`aria-live` `:704`。`chat.ts` 71 行、纯模块（只 import type），尾插纯函数可行。
- 体积：`measure-first-screen.mjs --dir dist` → gzip **315,220**（余 4,780、PASS；超内部预算只 WARN）。`App.tsx:20` 懒加载、`chat.ts` 只被 `MarginRail.tsx:18` 与测试引用 → 首屏净增 0 成立。B-229 仍 open（合计 321,999），本轮按 §1 再涨 ≤321 B，非本轮范围。
- 测试：`npm test` 实跑 **62 文件 877 条 0 fail**（`.tmp/r111-critic-npm-test.log`），`chat.test.ts` 13 条 → +2 得 15、总 879 成立；静态门先例 `chat.test.ts:125-136`（读 MarginRail 源码按行断）。
- 脚本：假 FSA `injectFiles` 在（r102:62-154）；r96 33 条（`:192` 回焦断言）、r108 17 条（`:169` 回焦断言）直连本轮；三张截图均已被跟踪，跑完 checkout 可还原。
- git status 口径：`host/bin/` 在 `.gitignore:9`、`host/bin/www` 0 跟踪 → 构建后不会多出 M。
- 环境：5175 → 200、CDP 57270 `/json/version` → 200，A1 可跑。
