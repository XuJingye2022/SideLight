# 第 131 轮计划审查（critic，只读）

**REVISE**。范围、落点、机制都对；两条 P1 都在「验收怎么跑」，修 1 次即可，**不要改 A1 的修法**。

## 核过的（不占漏洞名额）
- 范围合规：只做 B-262 一条 P1，只改 `src/App.tsx` + 静态门 + docs；不碰 B-229/B-135/z/inert。
- 行号对：`src/App.tsx:4516-4533`（`dialogOpen`/`productCombo`）、`:4629-4633`（吞键）；`.rail-diff-overlay` 两个面板都命中（`MarginRail.tsx:913`、`:972`），`appDialogOpen` 时确已卸载（`:279`、`:343`），不会误判。
- 机制已实测（`.tmp/r131-critic-undo.mjs`，ego CDP 57270）：焦点在 `.rail-diff-sheet` 按 Ctrl+Z，`.ProseMirror` keydown 计数 **0**、窗口捕获/冒泡 `defaultPrevented:false` → 撤销走浏览器原生默认动作；在窗口冒泡装同形 `preventDefault` 后正文不再变（`CCCBBB` 保留）。A1 的阶段与写法够用，不必 capture。
- Ctrl+B 在面板开着时不动正文（strong/em 0/0）、Ctrl+A 选中的是面板文本 → 只吞 z/y 不漏别的改动面。
- 体积：312,423 是第 93 轮旧值；计划按第 130 轮实测 316,056 起算，对（B-229 合并口径已超硬线 3,936，只记）。

## P1-1 体积门那条命令跑不通，也拦不住 316,400
`npm run verify -- --max 316400` 的参数追加在整条 `&&` 链**最后一条**命令上（本机探针：`npm run chain -- --max X` → args 落链尾），A3 链尾是 `node scripts/host-www.mjs`，它对未知参数 `process.exit(2)`（`scripts/host-www.mjs:54-57`；实测该命令 exit 2「未知参数：--max」）。→ 这行验收 exit 2、measure 根本不跑。第 119–130 轮同写法（第 126 轮「`--max 315900` exit 0」）不能照抄（第 121 轮另跑了 measure）。
修：拆两条 —— `npm run build`，再 `node scripts/measure-first-screen.mjs --max 316400`；用后者 exit code 判门，抄它打印的 gzip/raw/headroom。

## P1-2 before 相缺「交付的就是旧码」身份门
A2 临时换回 HEAD 版 `App.tsx` 做 before，而 AGENTS §8 多次记 Vite 交付旧/混合模块；无身份门时 before 可能仍跑新码（表现为 ① 不红、误判「复现不了」）。
修：照第 127/129/130 轮，每相开跑前 `fetch('/src/App.tsx')` 数 `.rail-diff-overlay`（before 0 / after 1）与 `undoCombo`（after 1），不符即停；换码用 `git stash push -- src/App.tsx` + `stash pop`，还原后核 SHA256；收尾 `git status --porcelain` 只允许 A3 列的路径。

## P2-1 ⑦ 的 Ctrl+Z 打在面板按钮上
Esc 后 `useDialogFocus` 把焦点还原给 `.rail-diff-open`（`src/components/useDialogFocus.ts:86-98`，第 4 参 true）；原生撤销是文档级（探针：焦点在 sheet 也撤正文），所以 ⑦ 会在焦点不在正文时碰巧变绿，证不了关面板后恢复正常。
修：⑦ 先点 `.ProseMirror p` 再按 Ctrl+Z；再挂一次 window 冒泡探针读 `defaultPrevented`（关面板后应为 false）。

## P2-2 ⑤ 无信息量、A2 超过 25 分钟
Ctrl+B 两相都不改正文（探针 strong/em 0/0），⑤ 恒绿。A2 现是 8 场景×2 相 + 两个整脚本（r100 43 条、r101 57 条），时间紧。
修：删 ⑤；空出的时间跑 `keyboard-acceptance` **52/52**（A1 动的是 keydown 路由，这条才对口；跑后 `git checkout -- shots/round-05/`）。

## P2-3 吞键副作用没记
新分支在 `?` 之前 return：面板开着时 `?` 从「开快捷键面板（B-249 会收起面板）」变「什么都不发生」；`Ctrl+S` 静默吞掉（与 `dialogOpen` 一致，计划已断言 write 0）。
修：impl.md 记这两条为有意行为；体积段把「合并口径仍 3,9xx」改成本批实测（+≤300 B → 约 4,2xx）。

证据：`.tmp/r131-critic-undo.mjs`、`.tmp/r131-critic-native.mjs`、`.tmp/r131-critic-probe.json`
