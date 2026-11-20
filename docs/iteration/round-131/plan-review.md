# 第 131 轮计划复审（critic，只读 · revision 1）

**REVISE**。上一版 5 条已全部修掉；只剩 1 条新 P1，落在 A2 的 ④（本轮核心证据），不动 A1 修法。

## 上一版核对（全部修掉）
- **P1-1 ✅** A3 拆成 `npm run build` + `node scripts/measure-first-screen.mjs --max 316400`。实核 `package.json` 的 verify = `npm run build && node scripts/measure-first-screen.mjs`，链尾本就是 measure（`scripts/measure-first-screen.mjs:19-21` 认 `--max`、`:63` 打印 raw/gzip/headroom）；上一版把 build 链尾 `host-www.mjs` 当成了 verify 链尾。拆两条仍对，且不再依赖 npm 的参数追加行为。
- **P1-2 ✅** A2 每相先跑身份门（before 0/0、after 1/1），stash push/pop + SHA256 + `git stash list` 0 + `git status` 白名单。HEAD `39f15cf` 实测 `src/App.tsx` 里 `.rail-diff-overlay` 0、`undoCombo` 0；`MarginRail.tsx:913`、`:972` 两处 overlay 类都在，谓词可分辨。
- **P2-1 ✅** ⑦ 拆 a/b + window 冒泡探针；⑦a 的焦点确由 `useDialogFocus` 还原给 opener（`MarginRail.tsx:280` 第 4 参 true）。
- **P2-2 ✅** 删 ⑤、补 `keyboard-acceptance`；`scripts/keyboard-acceptance.mjs` 读 `SIDELIGHT_CDP`，A3 的写法可用。
- **P2-3 ✅** 两条有意行为进 impl.md、体积改实测。

## P1-1（新）A2 ④ 的「Ctrl+S 写 0」不能证明吞键，且有双错向
顺序是 ① `Ctrl+Z`（撤掉 AAA）→ ② ③ → ④ `Ctrl+S`。① 把正文撤回打开时的基线，300 ms 后脏标记自动翻干净（`src/App.tsx:1293-1302`）；`requestSave` 的脏门于是走「没有改动，未写入。」（`:3708-3728`）→ ④ 在 before/after 都写 0，after 的 `write op 0` 与「Ctrl+S 被吞」不可区分。反向：若 ④ 落在 ① 后 300 ms 内（脏仍 true），默认 `autoSave: true`（`src/lib/settings.ts:67`）的 2 s 自动保存在同一窗口可能落一次写，把 0 变 1。
修：④ 挪到 ① 之前（或 ④ 前另造一次真实改动），断言 `write op 0` **且** doc 仍 dirty；开跑前写 `localStorage.sidelight.settings.v1 = '{"autoSave":false}'` 再 reload（`loadSettings` 合并默认，false 生效），消掉自动保存窗口；before 相 ④ 期望 ≥1 写。impl.md 记这条夹具设置。

## P2-1 A2 漏记本轮另两条新 P1
`findings-bug.md` F2（对话输入框 Ctrl+K/Ctrl+F 抢焦点）、`findings-ui.md` F1（点「发送」焦点掉 BODY）都是本轮新 P1，A3 只加 B-262。BACKLOG 是唯一发现池、停止条件看它 → A3 同时加两行 `open`，否则下一轮从 BACKLOG 拿不到。

## P2-2 ⑦a 判据超出已证范围
探针只证过焦点在 `.rail-diff-sheet`（div）时原生撤销生效；`.rail-diff-open` 是 `<button>`，非可编辑控件上是否仍有撤销目标未测。修：⑦a 只判 dp **false**，撤销效果记观察值，恢复能力由 ⑦b 证；⑦a 红不改产品。

## 核过（不占名额）
- A1 落点：`src/App.tsx:4516-4522`（keydown 内 `dialogOpen` 六态）、`:4629-4633`（吞键，在 Esc 之后）；Esc 关面板由 `MarginRail.tsx:309-318`/`:370-379` 的 document 级 `stopPropagation` 负责，A1 早退吃不到 Esc。
- 加 `railModal` 后 `?`（`:4640`）不再开面板 = P2-3 记的行为；面板未开时早退不生效，无回归面；每键一次 `querySelector`，量级可忽略。
- 体积：基线 316,056 + 约 6 行 ≈ 100–150 B，`--max 316400` 够；A1 不碰 `MarginRail.tsx`，chunk 7,880 不变。
- 门禁：`npm test` 67 文件 938 条与 railModalGate 现有 6 条（+5=943）自洽；`node --experimental-strip-types src/lib/railModalGate.test.ts` 可单跑。
- 工作树：HEAD = `39f15cf` = 轮前 startSha，只有 `docs/iteration/round-131/`、`shots/round-131/` 未跟踪 → before 相 stash 干净。

证据：`plan.md`、`src/App.tsx:1273-1303`、`:3708-3728`、`src/lib/settings.ts:56-67`、`src/components/MarginRail.tsx:279-379`、`scripts/measure-first-screen.mjs:19-21,63`、`package.json` 的 scripts。上一版原文存 `plan-review-r0.md`。
