# 第 77 轮计划审查（critic）

判定：**PASS-WITH-NOTES**（按角色约定视作通过，不触发 planner 第 2 次改稿）。本批 3 条全是 P2/deferred，按直令审；无 P0/P1 阻塞项，改法可行，25 分钟内做得完。

## 已核事实（读文件/命令，不转述计划）
- `SettingsDialog.tsx:44-88`：四个 `role="radio"`，全文件无 `tabIndex`/`onKeyDown`。选中态类 `is-on` 在 `:59`/`:76`，内置主题 `data-theme-id` 在 `:77`；`.is-on` 是唯一可见选中样式（`styles.css:1552-1557`）。
- `FindBar.tsx:48-49`：`locked`/`disabled`；两输入无 `readOnly`（`:54-96`）；`disabled=` 4 处（`:97`/`:100`/`:128`/`:131`）。
- `StatsDetail.tsx`：无 `onKeyDown`；`:63-65` 打开即聚焦面板。App 的 Esc 分支 `App.tsx:4151-4154` 正是「关面板 + `.stats-trigger` 聚焦」，A3 与它对齐，可行；`.stats-trigger` 常驻（`StatusBar.tsx:46-57`，带 `aria-expanded`）。
- 基线：`docs/iteration/round-76/test.md:7-8` 首屏 **303,664 B**、**43 文件 559 条**；`package.json` 的 test 命令 43 条。三个组件全是 lazy（`App.tsx:32-47`），新增 lib 进各自 chunk，首屏 6,336 B 余量不受压。
- BACKLOG：Deferred 表是 5 列（`BACKLOG.md:90-91`），B-136 在 `:103`，属该表（**无状态列**）。

## 漏洞与修法（6 条）

1. **P1 收尾写「tester 复验后 verified」与 CDP 不可用矛盾。** A1/A2/A3 的用户症状（方向键、只读输入、Tab 关面板）只能靠 E2E 证明；CDP 9222–9226 无监听 → 全 UNVERIFIED。第 76 轮先例是 `fixed`（B-111/B-122/B-134）。修：A1/A2 记 `fixed`（单测+静态+build/verify，浏览器项 UNVERIFIED）、A3 记 `fixed`（静态+交付脚本，无单测，E2E UNVERIFIED）；tester 结论写 PASS-WITH-UNVERIFIED，不写 `verified`。
2. **P1 A1 合成单条 map 漏了 `is-on`/`data-theme-id` 的回归断言。** 选中态只靠 `is-on`；历史脚本按 `data-theme-id` 找钮（`.tmp/e2e-r55-tester.mjs:177`、`.tmp/e2e-r56-finder-a.mjs:154`）。修：计划写明保留 `className={selected ? 'is-on' : ''}` 与内置项 `data-theme-id`；静态断言写「`is-on` ≥1、`data-theme-id` ≥1」，不要断言次数（合成后 `is-on` 2→1）。
3. **P2 A1 打开设置时初始焦点与 roving 停点分叉。** `useDialogFocus` 的 FOCUSABLE 含 `button:not([disabled])`（`useDialogFocus.ts:4-11`），`:35` 聚焦第一个 radio（浅色，改后可能是 `tabIndex=-1`）。修：不要为此改 hook；验收补「打开后选中项 `tabIndex=0`」，或报告里记「焦点落第一个 radio 为既有行为」。
4. **P2 A1 取下一项用全文档 `querySelectorAll('[role="radio"]')`。** 现在只有 SettingsDialog 有 radio；将来第二组会串组。修：用 `.theme-options` 的 ref 做 `querySelectorAll`。
5. **P2 A3 没有可执行断言。** 验收只有 grep 加一个跑不了的 E2E；handler 接错元素、漏 `preventDefault` 也过。修：至少静态断言 `preventDefault` 与 `onClose` 同在 `event.key === 'Tab'` 块内；报告写 UNVERIFIED。
6. **P2 B-136 在计划里写成「open」，实际在 Deferred 表。** `BACKLOG.md:103` 是 5 列表（无状态列）；同表 `B-153`(:108)/`B-139`(:109) 已多写状态格。修：写明收尾在该行「原因」列标 `fixed（第 77 轮…）`，或把行移到 P2 表并补状态，别把 6 列行塞进 5 列表。

## 结论
方案可行、不碰红线（无新依赖、不动内核/序列化、不改 release/）、时间够。执行时把第 1、2 条的改法并入验收与收尾即可，不必重写计划。CDP 按计划每任务只探一次，连不上就记 UNVERIFIED。
