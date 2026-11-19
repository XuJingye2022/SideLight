# 第 100 轮计划审查（critic，revision 1）

结论：**REVISE**（2 条 P1）。上一版 2 P1 + 3 P2 已落地（打开时基线、⑧ 只记录 + maxLine、体积账与门命令、A3 归 tester、标签与限制）；红线未破、范围未变。

## 已核对
- HEAD `537c633`、工作树干净（仅 round-100 目录未跟踪）；实测 gzip **314,726** / 余 **5,274** / PASS。简报的 312,423 / 7,577 是第 93 轮旧值，计划用现值是对的。
- `baselineRef.current =` 全仓 6 处（1351/1394/1465/2594 写、3303/4261 不写），与 §0 一致；`contentRef` 在 `:666`/`:3546`；源码态它返回 `sourceText`（`:3540`），但入口不可达（`:5981`、`:5964-5978`）。
- Esc：App 只挂 `window`（`:4673`），document 级 + `stopPropagation` 有效；`useDialogFocus` 四参签名与 `useDialogFocus.ts:22-27` 一致。
- `diff.ts` 归一 CRLF 与末尾空行（`:12-16`）、>4,000 行退粗粒度（`:9`），A1 规则①⑦可做；`npm test` 是显式文件链（`package.json:15`）。
- ④ 可复现：`openWorkspaceFile`（`:2766-2779`）不按同路径短路 → `loadIntoEditor:2594` 重写基线，保存后 dirty=false 不弹切换框。

## 漏洞与修法

**P1-1 宿主文档的「打开时正文」会取成文件原文。** `:1394` 的 `baselineRef = data.text` 是 `/__doc` 原文，而 `after` 走 `serializeBodyNow()` 的 `serializeDocument`。两者对部分文档不等：`docs/roundtrip-report.md` 的 `06-task-list.md` rich `-0 +1`（列表项之间多 1 个空行，在文档中部，`diff.ts:12-16` 只归一末尾空行，吃不掉）。宿主双击任务列表文档 → 一开面板就多 1 条 `.is-added`；A3 用假 FSA 工作区，覆盖不到。修：把 `:1403-1407` 已有的 `serializeDocument(...)` 提成局部常量，`openedBaselineRef` 用它 `.replace(/\r\n/g,'\n')`；`baselineRef` 保持原样；A3 或 B-227 注明「宿主路径未验」。

**P1-2 门 ⑥ 的「chrome 底 ≤55.5，HEAD 55」没有测量口径，三种口径没有一种等于 55。** 实测（HEAD、ego CDP 57270、1440×900、`.tmp/r100-critic-rail.mjs`）：`.rail-head` 高 **15**、`.rail-tabs` 底 − `.rail-head` 底 **39**、head 底（相对栏顶）**19**、tabs 底（相对栏顶）**58**、head 顶 → tabs 底 **54**；注入 A2 的 16px 按钮后为 **16 / 39 / 20 / 59 / 55**。按仓库 `flowBottom` 口径（`App.tsx:2442-2446` 就是 `bottom - railTop`）HEAD 已是 58，按计划字面 ≤55.5 会假红；按「头顶→页签底」是 54 而计划写 55。修：只留两条可复现门——`.rail-head` 高 ≤16.5 与 `.rail-tabs` 底 − `.rail-head` 底 = 39±1；要留绝对底就写「相对 `.margin-rail` 顶 ≤59.5（HEAD 58）」。

**P2-3「3 卡时 `.rail-count` 16px、按钮不增高」不成立。** 1440 下 `.rail-count` 只有 `styles.css:1259-1262`（无高度），实测 **15**；带 16px 的那条在 `@media (max-width:1119px)`（`:3476-3489`），宽窗不生效。按钮把 head 由 15 抬到 **16**（+1px，仍 ≤16.5）：改风险 1 的措辞，不改门。

**P2-4 面板缺 `aria-labelledby`。** A2 只写了 `role="dialog"`/`aria-modal`/`tabIndex`，标题「改动对比」没绑定；`useDialogFocus` 只补 Tab 环、不补名字。加 `aria-labelledby` 指向标题 id。

## 备注
A3 归 tester 15 分钟可行，但 1 MB 夹具 + 两条回归脚本偏紧；超时先记 UNVERIFIED，不改判据。
