# 第 16 轮 · 计划审查（critic）

审查对象：`docs/iteration/round-16/plan.md`（v0.29.0）。
审查方式：读计划、三份 findings、`src/styles.css`、`src/App.tsx` 的 toast/live region/焦点段；未改产品文件、未 commit。
审查日期：2026-11-16。

## 结论：**REVISE**

H1（全局 `[hidden]` 用 `display:none` 会丢文件树 `scrollTop`，与 T1 自己的验收冲突）、H2（深色 token/焦点环的「两套主题 + 源码框 shadow + 双环」没有闭环）、H3（toast 去 `aria-hidden` 后与常驻 live region 双播）是 blocker；H4/H5 为 major。

## 漏洞表（H1–H5）

| 编号 | 级别 | 问题 | 证据（文件:行 / 实测） | 最小修法 | 影响 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| H1 | blocker | T1 `:13` 加全局 `[hidden]{display:none!important}`，但 T1 `:17` 又要求「切回后 `scrollTop` 不变」。`display:none` 移除布局盒，Chromium 下 `scrollTop` 通常归零；计划没有保存/恢复 `scrollTop` 的步骤，`tree-acceptance` 新断言也只查 `display/height/行数`，抓不到滚动丢失。另 `hidden` 在 App 还用于 `<input type=file hidden>`，全局 `!important` 对它无害，但必须全仓确认没有「`hidden` + 自定义 display」的其它面板。 | `plan.md:13,15,17`；`App.tsx:3869-3870`（FileTree hidden/inert）、`:4254`（image input hidden）；`styles.css:271-279`（`.file-tree{display:flex}`） | 保留 `[hidden]{display:none!important}`，但 T1 切走前把 `file-tree-list.scrollTop` 存到 ref，切回 `rAF` 恢复；`tree-acceptance` 加「切回后 `scrollTop` 与切走前相等」和「`display:none` 时 `scrollHeight` 不为 0 但不可见」断言；全仓 `grep -n 'hidden'` 只接受 FileTree/input 两类 | T1 |
| H2 | blocker | T2 `:30` 要求六个 token 在 `:root` 与**两处深色块**都定义；计划只写「深色块（两处都加）」，但没有把 `--mark-strong` 的深色值写死（「取更暗档」），也没有说明 `--focus-ring` 在深色是否仍用 `var(--accent)`。`:32` 的 `.source-editor` 用 `box-shadow` 做焦点辅助，但源码框父级有 `overflow:auto` 时外阴影会被裁；`:32` 同时保留全局 `:focus-visible`，源码框会出现 outline+shadow 双环。`:34` 的 reduced-motion `!important` 会覆盖所有 `transition-duration`，若焦点环依赖 transition 会闪。 | `plan.md:30-34`；`findings-bug.md:42-65,84-109`；`styles.css` 的 `.source-editor`/`focus-visible`/`prefers-reduced-motion` | 六个 token 在 `:root`、`html[data-theme='dark']`、`@media (prefers-color-scheme: dark)` 三处逐项列值（`--mark-strong` 给出具体色值）；`--focus-ring` 明确 `var(--accent)` 在两档都成立；`.source-editor` 用 `outline`（或内阴影 `inset`）并只保留一种环，父级 `overflow` 用 `:focus-within` 包一层；reduced-motion 只覆盖 `animation/transition`，保留 `outline` 与 `opacity` 静态值 | T2 |
| H3 | blocker | T3 `:52` 去掉 toast 的 `aria-hidden`，`kind=error` 用 `role=alert`、其它 `role=status`；`:53` 的常驻 live region「只保留非错误文本」。非错误 toast 本身是 `role=status`，常驻区也放同一 `notice.text`，同一次 notice 会进两个 live region，读屏可能播两遍。错误 `role=alert` 与常驻区排除错误，方向对，但 toast 容器内按钮若仍在 `role=status` 子树，会随状态文本一起被读。 | `plan.md:52-54`；`findings-bug.md:121-140`；`App.tsx:4040-4056`（live region/toast） | 二选一：常驻 live region 只读文本，视觉 toast 设 `aria-hidden="true"` 且按钮放到独立可读容器；或 toast 作为唯一 `role=status/alert`，常驻区只保留空/上一次文本。错误只走 `role=alert`，普通只走一个 `role=status`；补「一次 notice 只更新一个 live region」断言 | T3 |
| H4 | major | T4 `:68-77` 的版本判定依赖 T2 的「真实落地」；但 T2 的深色 token/焦点环/源码框/`reduced-motion` 都是纯 CSS，`npm test` 与 `measure` 无法证明对比度/焦点可见，只有 `theme-acceptance` 的 48 组矩阵。计划把版本拍板交给 T4「按 diff」，没有把「T2 验收通过」作为 0.30.0 的前置；若 T2 只完成一半仍可能升 0.30.0。预算 `:4` 的 +250–400 B 是估算，T2 的 6 token + 5 硬编码 + 6 焦点 + 3 边框 + reduced-motion 可能超；P2 砍序在 T3 `:55`，T4 没有预算回退步骤。 | `plan.md:5,68-77,4`；`findings-ship.md` 的 1,174 B/250–400 B | T4 版本判定写死前置：`theme-acceptance 16/16` 且 48 组深色矩阵全过才 0.30.0，否则 0.29.1；`measure` 超 285,000 时按 P2→硬编码色→8 条死 CSS（−186 B）顺序砍，仍超写「未发布」；T4 验收加「T2 验收输出存在」 | T2/T4 |
| H5 | major | T3 `:55` 的 P2 只写「先记录」，`:56` 的键盘验收却要求 `role=alert`、`aria-hidden` 内可聚焦 0；P2 的 `DialogSkeleton role=dialog`/Tab 劫持删除被砍时，T3 验收仍按全量写，tester 会判缺项。T4 `:80` 又要求 README 不含 `283,826`、`SHA256SUMS-0.29.0`，但 T4 在 T2/T3 之后才写，若 T2/T3 超线砍 P2，文档需要同步「P2 延后」；计划没有把 T3 的砍项传给 T4 的步骤。 | `plan.md:55-60,80-82`；`findings-bug.md:148-189`（Tab 劫持/P2） | T3 验收拆「必过（正文名称/错误 alert/toast 可读/树隐藏）」与「P2 可选（骨架 dialog/Tab 劫持/批注卡）」；T4 读 `impl-a.md` 的砍项，README/CHANGELOG 写「P2 延后」而不是「已完成」；补「P2 被砍时 keyboard 验收仍过」 | T3/T4 |

---

## H1（blocker）`display:none` 会丢 `scrollTop`

T1 `:13`：

```css
[hidden] { display: none !important; }
```

T1 `:17`：

> 切回后 `display !== 'none'` 且行数不变；`scrollTop` 不变。

`display:none` 会移除元素的布局盒。Chromium 下对 overflow 容器重新显示时 `scrollTop` 通常回到 0（没有保存/恢复），而 T1 的验收明确要求 `scrollTop` 保持不变。现有 `tree-acceptance` 新断言只查 `display`/`height`/行数，抓不到这个回归。

**修**：

1. `FileTree` 的 `file-tree-list` 在 `hidden` 变 true 前把 `scrollTop` 存到 `scrollTopRef`；
2. `hidden` 变 false 后 `requestAnimationFrame(() => list.scrollTop = ref)`；
3. `tree-acceptance` 加「切走前 scrollTop=148 → 切回后仍 148」；
4. 全仓 `grep -n 'hidden' src/` 确认只有 FileTree 面板与 image input 使用 `hidden`；image input 被 `!important` 隐藏无副作用。

## H2（blocker）深色 token/焦点环的闭环

T2 `:30` 要求：

```
:root 加 --focus-ring/--focus-offset/--danger/--on-accent/--on-mark/--line-input/--mark-strong
深色块（两处都加）--danger/--on-accent/--on-mark/--line-input/--mark-strong
```

缺口：

- **`--mark-strong`** 只写「取更暗档」，没有具体值；`.accept:hover` 的背景与 `--on-mark` 的对比度无法在计划阶段算，48 组矩阵会漏。
- **`--focus-ring`** 只在 `:root` 定义，深色靠 `var(--accent)`；如果深色 `--accent` 与背景的对比不足，焦点环仍不达标。要么在深色块显式 `--focus-ring`，要么在验收中逐主题断言 accent 对比。
- **`.source-editor`** 用 `box-shadow` 做辅助，父级 `overflow:auto` 会裁外阴影；同时全局 `:focus-visible` 仍会给 outline，出现 outline+shadow 双环。改用 `outline` 或 `inset` 阴影二选一。
- **`reduced-motion`** 的 `transition-duration:.01ms!important` 会覆盖焦点/选中态的过渡；虽然 `outline` 本身不依赖 transition，但 `<button>` 的 `background/color` 过渡会被压掉，需确认没有依赖 transitionend 的逻辑（findings 说现有是纯视觉，可接受，但要写进验收）。

修：六个 token 在 `:root`、`html[data-theme='dark']`、`@media (prefers-color-scheme: dark)` 三处逐项列值；`--mark-strong` 给具体值；`source-editor` 只保留一种环；`theme-acceptance` 加「深色 accent/focus-ring 对比」与「source-editor 无双重 outline」。

## H3（blocker）toast 与 live region 双播

T3 `:52`：

```
toast 去掉 aria-hidden；kind=error 用 role=alert，其它 role=status
```

T3 `:53`：

```
常驻 sr-only 区只保留非错误文本
```

非错误时：

- toast 容器 `role=status`，文本是 `notice.text`；
- 常驻 live region 也是 `role=status`，文本也是 `notice.text`；
- 同一次 notice 两个 live region 更新，NVDA/讲述人可能播两遍。

错误时 toast `role=alert`，常驻区排除错误，方向对；但 toast 容器内 `.toast-action`/`.toast-close` 若仍在 `role=status` 子树，按钮名会随状态文本被读，需把按钮放到独立可读容器或给容器 `role=group`。

**修**：二选一：

1. 常驻 live region 只做文本副本，视觉 toast `aria-hidden=true`，按钮放独立 `role=group` 容器；
2. toast 作为唯一 `role=status/alert`，常驻区不重复 `notice.text`。

补「一次 notice 只更新一个 live region」「错误只进 role=alert」两条断言。

## H4（major）版本判定与预算回退

T4 `:72`：

> 若 T2 的 reduced-motion/焦点环/深色对比度真实生效 → 0.30.0；否则 0.29.1。

「真实生效」没有可执行前置。T2 是纯 CSS，`npm test`/`measure` 不能证明对比度/焦点可见；唯一证据是 `theme-acceptance` 的 48 组矩阵。计划把拍板交给 T4 看 diff，容易出现「T2 只改了一半仍写 0.30.0」。

预算：当前 283,826，余 1,174；T2 估算 +250–400 B，但 6 个 token + 5 处硬编码 + 6 类焦点 + 3 处边框 + reduced-motion 可能超。P2 砍序写在 T3 `:55`，T4 没有预算回退步骤。

**修**：

- T4 版本前置：`theme-acceptance 16/16` 且 48 组深色矩阵全过才 0.30.0；否则 0.29.1；
- `measure` 超 285,000 时按 P2→多余硬编码色→8 条死 CSS（−186 B）砍，仍超写「未发布」；
- T4 验收加「T2 验收输出存在」与「砍项记录」。

## H5（major）P2 的验收拆分

T3 `:55` 的 P2 只「先记录」：骨架 `role=dialog`/`aria-busy`、Tab 劫持、批注卡键盘化。T3 `:56` 的键盘验收却要求 `role=alert`、`aria-hidden` 内可聚焦 0；这些是必过项，不是 P2。P2 被砍时，T3 的验收仍按全量写，tester 会判缺项。

T4 `:80` 要求 README 不含 `283,826`、`SHA256SUMS-0.29.0`，但 T4 在 T2/T3 后才写；若 T2/T3 超线砍 P2，文档要同步「P2 延后」，计划没有把砍项从 T3 传到 T4 的步骤。

**修**：T3 验收拆「必过（正文名称/错误 alert/toast 可读/树隐藏）」与「P2 可选（骨架 dialog/Tab 劫持/批注卡）」；T4 读 `impl-a.md` 的砍项，README/CHANGELOG 写「P2 延后」；补「P2 被砍时 keyboard 验收仍过」。

## 逐项核对记录

### T1
- 全局 `[hidden]` 修 `.file-tree{display:flex}` 的方向对；`inert` 保留对。
- 全仓 `hidden` 只有 FileTree 面板与 image input 两类，`!important` 不会误伤其它自定义 display；但 `display:none` 丢 `scrollTop`，T1 验收要求保持（H1）。
- `tree-acceptance` 的 `display/height/行数` 断言能抓「display:flex 但 hidden」，抓不到 scrollTop；需补。

### T2
- 六 token、5 处硬编码、6 类焦点、3 处边框、reduced-motion 的方向对；`--mark-strong` 无具体值、`source-editor` outline+shadow 双环、`!important` 覆盖过渡是 H2 的主要点。
- `--danger` 在 `:root`/两处深色都定义，方向对；`--on-accent`/`--on-mark` 深色用深字，方向对。
- 48 组矩阵、`emulateMedia`、逐控件环断言，方向对；但「48 组深色全过」不能替代浅色 `--danger` 4.10 的检查（若本轮仍要求浅色错误 ≥4.5，要列入）。

### T3
- `.tiptap` 名称、错误 `role=alert`、toast 去 `aria-hidden`、三横幅 `role=region`，方向对。
- 非错误 toast 与常驻 live region 双播（H3）；P2 与必过项混在一起（H5）。

### T4
- 0.30.0/0.29.1、CHANGELOG `—`、README 旧数字、`package-lock`，方向对；版本前置与预算回退（H4）、P2 延后（H5）。
- `release.yml` preflight 按 `## <version> —` 匹配；CHANGELOG 破折号不能写错。

### 通用
- 文件归属：A T1/T2/T3 串行改 `src/styles.css`/`src/App.tsx` 与三个脚本；B T4 文档/版本；零重叠成立。
- 构建纪律：A `.tmp/build-a`+measure；B 唯一 `npm run build`；成立。
- 可独立复现：T1/T2/T3 的 tree/theme/keyboard 脚本可跑；真实读屏、高对比度、macOS 真机仍 UNVERIFIED。

## 做对的地方（别改过头）

1. T1 用全局 `[hidden]` 修 `.file-tree{display:flex}` 覆盖 UA 样式，选 `!important` 只在 display 上，方向正确；补 scrollTop 保存即可。
2. T2 把焦点环收成一个 `--focus-ring` token、深色两套主题都改、48 组矩阵复核，方向正确；`--mark-strong` 给具体值即可。
3. T3 错误走独立 `role=alert`、普通只走一个 status、toast 按钮移出 `aria-hidden`，方向正确；把「一个 live region」写死即可。

---

### 附：本次审查证据

- `plan.md:13-17`（hidden/scroll）、`:30-34`（token/焦点/reduced-motion）、`:52-55`（toast/live/P2）、`:68-82`（版本/预算）。
- `findings-bug.md:42-65`（B1 深色）、`:84-109`（B2 焦点）、`:121-140`（B3 toast）、`:148-189`（B4 Tab）、`:193-227`（B5 reduced-motion）。
- `App.tsx:3869-3870`（FileTree hidden/inert）、`:4040-4056`（live region/toast）、`:4254`（image input hidden）。
- `styles.css:271-279`（.file-tree display:flex）；全仓 `hidden` grep 只有 FileTree 与 image input。
- 未改产品文件、未 commit；未生成新截图。
