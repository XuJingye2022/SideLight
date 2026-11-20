# 第 120 轮验收（tester）

- 判定 **PASS**（未读 `impl.md`；只读 `plan.md` 本轮任务、`git diff`、BACKLOG）。
- 范围：B-250「对比」面板长 diff 只能键盘读第一屏。A1 代码 + 静态门，A2 真机证据。

## 门禁
- `npm run verify` **PASS**：build exit 0，首屏门 gzip **315,546 B**（raw 1,023,808、files 3、headroom **4,454** ≥ 4,400）。
- **偏差（不判 FAIL）**：任务书要求门 gzip「仍 315,542」，实测 **315,546（+4 B）**。查因：`MarginRail.tsx` 内容变化使 rolldown 全局 chunk 哈希重算，入口 `index-*.js` 里 44 段 chunk 文件名的哈希换名（入口 raw 958,619 字符不变，gzip9 **304,967→304,971** = +4）。反事实：把 `MarginRail.tsx` 临时换回 HEAD 版重建 → 门 **315,542**；换回本轮版重建 → **315,546**（各两次构建同值，可复现）。门未破、硬线余量仍 ≥4,400，属哈希改写不是主包体积增长。
- `npm test` **64 文件 907 条 0 fail**（链尾新增 `railDiffA11y.test.ts`）。
- chunk gzip9：`dist/assets/MarginRail-D1qNoJ-u.js` raw **21,053** / gzip9 **7,419**；与 `scripts/measure-first-screen.mjs:8-9` 的「7,419 B，第 120 轮实测」一致。
- `git diff -- src/styles.css` **空**；`git status` 只计划内文件 + `shots/round-120/`。

## A1 静态门
- `git diff --stat -- src/components/MarginRail.tsx` = **1 file changed, 2 insertions(+), 1 deletion(-)**；`-U0` 的 `^-[^-]` **1**、`^+[^+]` **2**；diff 内 `rail-review` **0 命中**（`:934` 在审 ul 未动）。
- 新增 `src/lib/railDiffA11y.test.ts` **4/4 绿**。
- 负向（**未用 git stash**）：先备份 SHA256 `777DB98F…832C` → 只删对比 ul 的 `tabIndex={0}` → **2 红 exit 1**（恰好 ②、④；2 pass / 2 fail）→ 备份拷回，SHA256 与备份相同 → **4/4 绿**。

## A2 真机（ego CDP 57270、1440×900；tester 独立重跑两阶段，JSON 与本行截图均为本轮产物）
- before（`MarginRail.tsx` 临时换回 HEAD 版，文件拷贝，未 stash）：**7/7**——ul 无 `tabindex`、`tabIndex -1`；Tab×8 全停 `BUTTON.rail-diff-close`；关闭钮上 PageDown/PageDown/ArrowDown/End 后 scrollTop 全 **0**；滚轮 **400**；**119 行**、scrollH/clientH **2380/540**、超出 **1840**。
- after：**12/12、0 pageerror / 0 console error**——① `tabindex="0"`、`role="list"`、`aria-label="改动对比行"`；② 关闭钮 Tab 一次 → `UL.rail-diff-rows` 且 `:focus-visible` 真；③ 四块三主题 outline 均 **solid / 2px**，色 = 页内 `--focus-ring` 解析值（light `rgb(43,109,100)`、dark 与 auto-dark `rgb(156,203,194)`、sepia `rgb(122,90,42)`）；④ 溢出 **1840** ≥1,000 且 ≥clientH 540；⑤ PageDown **472→944**、ArrowDown **984**、End **1840 = max**、Home **0**；⑥ End 后末行底 = ul 底 **740.89**（差 0 ≤ +1）；⑦ ul 上 Esc 关面板、`[inert]` **0**、焦点回 `.rail-diff-open`。
- 截图 `shots/round-120/diff-kb-scroll.png`（聚焦环 + 已滚到底）。
- 回归：`.tmp/e2e-r100-diff.mjs` **43/43**、`.tmp/e2e-r101-review.mjs` **57/57**，均 0 FAIL；跑完已 `git checkout -- shots/round-100 shots/round-101`。
- 计划 CR-5 可裁组：⑧ 空态 Tab 站、⑪ 开面板按 `Ctrl+Alt+N` 面板让位 **未实现/未验**（⑨ 已被 A1 门③覆盖）。不记已验证。

## UNVERIFIED
- 真实屏幕阅读器播报（只验 DOM 与计算值）；⑧、⑪ 两条可裁组；真 WebView2 宿主、真实中文 IME、原生打印（本轮为浏览器态 UI）。
