# 第 73 轮独立验收（tester）

不读 impl.md；按 `plan.md` A1/A2/A3、`git diff`、BACKLOG 复验。轮前 startSha `a0b66b5`；dev 5175；CDP 9222（每次 E2E 前 `node .tmp/reset.mjs 9222`）。

## 门禁
- `npm run verify` **PASS**：首屏 gzip **302,787 B**（轮前 302,014，+773；内部 310,000 / 硬线 320,000，余 17,213）。
- `npm test` **41 文件 532 条 0 fail**（+1 文件 +8 条）。日志 `.tmp/r73-test-full.log`。
- `npm run roundtrip`：rich **6/8**、source **8/8**、firstSaveBlocked 1/8；报告与 HEAD **无 diff**（两个既有 diff 非本轮）。

## A1 · B-154 待办行高与复选框对齐 — PASS
`.tmp/e2e-r73-a1-tasklist.mjs`（`.tmp/r73-a1-after.json`，`allPass:true`，0 pageerror）。改前读数用注入旧规则对照，与 finder 基线 `.tmp/r73-finder-bug.json` 一致（50.14 / 7.5）。
- li 高 **50.14 → 33.14**（≤34）；连行距 **53.19 → 36.19**（36.2±1）；`li > div > p` margin **0/0**（前 0/17）。
- |复选框中心 − 首行文字中心| **7.5 → 0.06**（≤1；16.56 vs 16.5），复选框 14×14 不变。
- 勾选第一项 → `Ctrl+S`（假 FSA）写回 `- [x] 第一项…`，其余 `- [ ]` / `- [x]` 原样，toast「已保存 任务.md」。
- 规则：`src/styles.css:1042`（`li>div>p{margin:0}`，TaskItem 真实结构）、`:1046-1051`（label 去 `margin-top:7px`，改 flex 居中 `height:1.95em`）。
- 截图 `shots/round-73/tasklist-fixed.png`（600×185）：三行复选框与文字同线、行距紧凑（目视）。

## A2 · B-155 TOC 标记段相邻即露 + 键盘可进入 — PASS
`.tmp/e2e-r73-a2-reveal.mjs`（`.tmp/r73-a2.json`，`allPass:true`，0 pageerror）。
- 载入（光标在标题一，隔标题二）**0 露 / 高 0**；点尾段 **0/0**；↑ 一次到「正文甲」（`anchorOffset 3`）→ **`.toc-source.is-revealed` 1 / 高 33.14**（改前 0/0）；再 ↑ → **anchor 在 `.toc-source` 内**（offset 5）。
- 点标题二（后一块）→1；点标题一（隔一块）→**0**（`tocWidgets` 恒 1）。
- 尾段 → ↑↑ → End → `Shift+Home` → `Backspace` 后 source 0；`Ctrl+S`（假 FSA）读回**无 `[TOC]`**、toast「已保存 toc.md」。
- 单测（`tocRender.test.ts` 11 条全过）：`withToc('一')`（紧贴前块）→ **0**；`withToc('一','二')`（隔一块）→ **−1**；段内仍露、后块按 `before(1)` 露。
- 偏差（不判红）：「再 ↓ → anchor 在 `.toc-source` 内」从正文甲按 ↓ 会到尾段、几何不可达；改用第二次 ↑ 证键盘进入。
- 探针 `.tmp/e2e-r73-probe-loadsel.mjs`：载入态 DOM anchor 停在隐藏段内是树持焦的滞留选区（rect 0/0、打字 0 变化），非不可见光标。

## A3 · B-156 公式 atom 选中即露源码 — PASS
单测 `mathReveal.test.ts` **5 条 0 fail**：区间收集、命中 1 / 远离 0、**同 doc 换选区 10 次 `DecorationSet` 同一引用**、NodeSelection 露/撤、非公式编辑只映射。E2E `.tmp/e2e-r73-a3-math.mjs`（`.tmp/r73-a3.json`，`allPass:true`，0 pageerror）：
- 行内 `$\alpha$`：Home 后 `Shift+→`×4 → `.sl-math-reveal` **1**、`::after` 为 **`"$\alpha$"`**、KaTeX `display:none`；按 → 移开 → **0**。
- 块级 `$$\beta$$`：尾段 ↑ 1 次 → **1**、`::after` 为 **`"$$\beta$$"`**、`.block-math-inner` none；↓ → **0**。
- 保存：先露出过公式的 A 组 vs 重新载入、全程不碰公式的 B 组，同处改一字后 `Ctrl+S` 字节**相等**，含 `$\alpha$` / `$$\beta$$`、正文无 `sl-math-reveal`（假 FSA）。
- 接线：`src/App.tsx:974` 挂 `mathReveal()`；`src/lib/mathReveal.ts` 工厂；样式 `src/styles.css:2095-2116`。

## 问题 2 · Typora 机制对照（用户焦点②）
结论见 `docs/iteration/round-73/typora-mechanism.md`（≤2 KB，带 `frame.js` 偏移）；摘录 `.tmp/r73-typora-extract{,-2}.txt`。要点：Typora 定界符是 **DOM 文本层**（高亮 `md-meta` 夹 `==`、行内公式 `<script type="math/tex">` 存原 TeX、块级原文在节点 `text`），光标驱动 `md-expand` 切换源码/成品，保存与导出从模型原文重建；本仓库 `==` 是 Mark（定界符不进 doc）、公式是 atom + `data-latex`，都缺「源码那份」——A3 伪元素是最小等价物，`==` 复用同一工厂（B2）。

## 回归
- `.tmp/e2e-r63-delta-toc.mjs 9222`（既有）：TOC 撤销 / 逐键删除 / 点条目跳转 / 预览双目录 / 保存 / 表格+公式共存，**0 pageerror**；相邻块源行转可见＝本轮设计。
- 未跑 `keyboard-acceptance` / `data-safety`：两脚本早有 ANSI 乱码与过期选择器（`鍙﹀瓨`、`.editor`），本轮未碰键位、输入规则、保存链。

## 判定
**PASS-WITH-UNVERIFIED**：A1/A2/A3 验收项全部成立，A2 一条方向键偏差已说明。
UNVERIFIED：Typora 主题 CSS 里 `.md-meta` 的显隐选择器（参考目录 54 个 CSS 无 `md-meta`，仅由 JS 的 `md-expand` 与 DOM 推断）；B1/B2/B3 属 B 轮未交付；真实中文 IME、真实 FSA、WebView2 宿主。
