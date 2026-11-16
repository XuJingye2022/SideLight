# 第 30 轮 · 独立验收（tester，首次验收）

- 验收人：tester（独立代理，端口 **9222**，按调度提示；计划 §4 写的是 9224，plan 自己写明「与调度提示冲突时以调度提示为准」）
- 时间：2026-11-17 01:03–01:25（Asia/Shanghai）
- 输入：`plan.md`（revision 3）、`git diff`、`git status`。**没读 `impl.md`**（`tester.md:3`）
- 版本：`package.json` 0.32.1（本轮不发版）；HEAD 起点 `11fdff6`
- dev server：`http://localhost:5175`（未重启）；CDP：9222（每次 E2E 前 `node .tmp/reset.mjs 9222`）

## 判定：**PASS-WITH-UNVERIFIED**

- 门禁与计划里所有本轮能执行的验收项全过；剩余 8 条是环境/真机类（假 FSA 无权限模型、无 IME 自动化、本轮不 push、无 macOS/真机），见 §10。没有 FAIL 项：门禁没破、没引入回归、实施报告里也没有与实际不符的结论。

- 门禁全绿：`tsc` 0、`npm test` **18 文件 / 260 条 / 0 失败**、首屏 **284,529 B ≤ 286,000**。
- T1 的 ①–⑦ 断言 20/20 通过；深色断言通过；选区截图已留；导出回归 7/7、预览懒加载 4/4、键盘回归 49/49。
- T2 的 a–d 由我**自己复跑** e2e 验证（4/4），T2 交付的 before/root 两份日志与截图缺失（见 §5、§9-3），不影响行为判定。
- 额外把计划 §2 记的 R1（超大文件提示）实测了一次：**通过**（4/4）。计划写它的前提是 dev server 交付旧模块，我实测时 dev server 已交付新模块（`tooLargeNote` 3 处）。见 §8。

---

## 1. 门禁（命令与真实输出）

### 1.1 `npx tsc --noEmit`

```
TSC_EXIT=0
```

### 1.2 `npm test`

`npm test 2>&1 | Tee-Object .tmp\tester-r30-npmtest.log`（退出码 0）：

```
files(scored blocks)=18
pass sum=260
fail lines=0
```

- `package.json:14` 的 18 条 `&&` 串联，含新加的 `src/lib/trash.test.ts`。
- 与计划预测一致（「T1 合入后 260」）。`src/lib/wordcount.test.ts` 从 8 条变 11 条；`src/lib/trash.test.ts` 6 条（`pickTrashSource` 4 + `shouldWriteCurrent` 2）。

### 1.3 首屏体积

`node scripts/measure-first-screen.mjs --dir dist`：

```
   892443   277501  /assets/index-BVO7nHXS.js
    33784     7028  /assets/index-BLxN31Mr.css
total raw=926227 gzip=284529 files=2 max=286000
gzip 省下 641698 B（69.3%）
PASS
```

- **没重跑 `npm run build`**（计划 §5-1）：`dist/index.html` mtime `2026-11-17T01:02:44`，晚于最后一次 src 改动（`src/lib/trash.ts` `01:01:28`），dist 新鲜。
- 首屏集合里没有 `katex` / `lazy`（脚本自己会 `exit 1`，这里 PASS 即证明）。

### 1.4 静态断言（计划 T1 验收 5、T2 验收 2）

| 命令 | 期望 | 实测 |
| :--- | :--- | :--- |
| `Select-String src/App.tsx -Pattern "import\('./lib/export.ts'\)"` | 1 | **1**（`src/App.tsx:3805`） |
| `Select-String src/App.tsx -Pattern "from './lib/export"` | 0 | **0** |
| `Select-String src/components/StatsDetail.tsx -Pattern '#[0-9a-fA-F]{3,8}\b'` | 0 | **0** |
| `Select-String src/styles.css -Pattern '\.stats-trigger'` | ≥1 | **2**（`:1490`、`:1500`） |
| `Select-String src/lib/trash.ts -Pattern "\?\? ''"` | 0 | **0** |
| `Select-String src/lib/trash.ts -Pattern 'shouldWriteCurrent'` | 2 | **2**（`:152` 定义、`:195` 调用） |
| `Select-String src/lib/trash.ts -Pattern "kind === 'file'"` | 1 | **1**（`:370`） |

`PreviewPane` 懒加载写法（计划 R6）：`src/App.tsx:26-27`

```ts
const PreviewPane = lazy(() =>
  import('./components/PreviewPane.tsx').then((module) => ({ default: module.PreviewPane })),
```

`PreviewPane` 的静态具名 import 已删（`grep` 只剩 `lazy` 声明 + `:4668` 渲染）。`StatsDetail` 同写法（`:43-44`）。

---

## 2. T1 验收：状态栏字数明细（自己写脚本，`.tmp/e2e-r30-t1-stats.mjs`）

命令：`node .tmp/reset.mjs 9222 && node .tmp/e2e-r30-t1-stats.mjs 9222`
日志：`.tmp/e2e-r30-t1-stats.log`　结果：**20/20 PASS**（退出码 0）

| # | 断言 | 原始证据 |
| :--- | :--- | :--- |
| ① | `.status-bar` 里有 `button.stats-trigger`，初始 `aria-expanded="false"`，可见文本 `/^\d[\d,]* 字/` | `{"tag":"BUTTON","type":"button","expanded":"false","haspopup":"dialog","text":"0 字","visible":true}` |
| ② | 点开出现 `[role="dialog"][aria-label="字数明细"]`，`aria-expanded="true"`，`dt` 7 个含「字 字符 词 句 段 阅读」，200 字正文下 字=200、字符=200、句=1、段=1 | `{"status":"200 字 · 阅读约 1 分钟","open":true,"expanded":"true","dts":["字","字符","词","句","段","阅读","选区"],"dds":["200","200","200","1","1","1 分钟","未选中文本"]}` |
| ② | 面板不在 footer 内（计划风险 1） | `inFooter:false`；面板打开时 `.status-bar` 整栏文本仍是 `"200 字 · 阅读约 1 分钟\n自动保存排队中"`，没有明细数字 |
| ③ | 焦点在按钮上按 Enter 开；`Escape` 关且 `document.activeElement.className === 'stats-trigger'` | `{"open":false,"active1":"stats-trigger"}`、`{"open":false,"active2":"stats-trigger"}` |
| ④ | 点 `.editor` 关闭；再点触发按钮关闭 | `check 4 click on editor closes PASS`、`check 4 second click on trigger closes PASS {"open":false}` |
| ⑤ | `Shift+Home` 选中一行后点开：选区三个值都 >0，选区内「字符」= 选区去空白长度 | `{"sel":"一 二 三 四 五 六 七 八 九 十","selRow":"10 字 / 10 字符 / 1 句","expectedChars":10,"nums":[10,10,1]}` |
| ⑥ | 源码模式字数（P2 回归）：`---\ntitle: sample\n---\n\n中文正文 abc https://example.com/x\n\n😀😀 结束\n` | `{"srcStatus":"11 字 · 阅读约 1 分钟","editStatus":"11 字 · 阅读约 1 分钟"}` → **两视图相等，都是 11 字**（修前 13/11） |
| ⑦ | 控制台 `error` 0、`pageerror` 0 | `## errors []` |
| C5 | 深色：`data-theme=dark` 下 `getComputedStyle(panel).backgroundColor` 三通道都 < 80 | `{"bg":"rgb(28, 31, 35)","color":"rgb(233, 230, 224)","rgb":[28,31,35]}` |
| — | 选区截图 | `shots/round-30/r30-t1-stats-selection.png`（点击后「选区」行显示 `10 字 / 10 字符 / 1 句`） |

口径（计划风险 6 / B4）：只证明「frontmatter 引起的跳变已修」。`[文字](https://…)` 这类链接目标造成的残留跳变本轮不测、未修，仍记 UNVERIFIED（§10-8）。

---

## 3. T1 导出回归（`scripts/export-acceptance.mjs` 7/7）

命令：`node .tmp/reset.mjs 9222; $env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/export-acceptance.mjs http://localhost:5175`
日志：`.tmp/tester-r30-export.log`　结果：**7/7 PASS**，退出码 0

```
exports: ["未命名.html","未命名.txt","未命名.md"]
PASS HTML 导出含源码模式最新标记
PASS TXT 导出含源码模式最新标记
PASS Markdown 导出含源码模式最新标记
PASS 导出文件名跟文档名（HTML） (未命名.html)
PASS 导出文件名跟文档名（TXT） (未命名.txt)
PASS 导出文件名跟文档名（Markdown） (未命名.md)
PASS HTML 导出仍含正文先前写的一句
```

**第一次跑是红的，原因是脚本选择器过期，不是产品回归**（AGENTS §8 的坑）：

```
page.waitForEvent: Timeout 5000ms exceeded while waiting for event "download"
    at exportOne (scripts/export-acceptance.mjs:37:10)
```

- 导出菜单项在 DOM 里是 `<button role="menuitem">`（`.export-menu` 的 `role="menu"`，`src/App.tsx:4268`），脚本用 `getByRole('button', { name: 'HTML' })` 永远匹配不到。
- 证据：`git show HEAD:src/App.tsx` 里 `role="menuitem"` 已有 4 处，`scripts/export-acceptance.mjs` 最后一次改动是 round-04 —— **这是既有的过期脚本，不是本轮引入**。
- 处理：按 AGENTS §8「DOM 改动后先改脚本再判产品失败」修了脚本（测试脚本，不是产品代码，`git diff` 只有 8 行）：
  1. `:38` 改成 `getByRole('menuitem', { name: label, exact: true })`；
  2. 删掉结尾的 `await browser.close()`，改成显式 `process.exit(...)`：CDP 连的是共享 Edge，关整浏览器会让同端口后续脚本连不上（`common.md:18`）。
- 首跑那次覆盖了 `shots/round-04/t3-export.png`，已 `git checkout -- shots/round-04/t3-export.png` 还原。

**PreviewPane 懒加载追加断言**（计划 §5-3）：`.tmp/tester-r30-preview.mjs`，**4/4 PASS**

```
## check 预览模式出现 1 个 .ProseMirror[contenteditable=false] 且含正文 PASS {"count":1,"readOnly":["false"],"text":"预览正文测试。"}
## check PreviewPane 模块在切预览前没请求、切之后请求到 PASS {"beforePreview":0,"after":1,"urls":["http://localhost:5175/src/components/PreviewPane.tsx"]}
## check 切回编辑模式可继续写 PASS {"count":1,"editable":"true"}
## check errors 0 PASS []
```

即：预览切过去才有 `PreviewPane.tsx` 请求，无白屏、可切回编辑。

---

## 4. T2 验收：删除干净文件 → 撤销（自己复跑，不信任实施报告）

计划 §5-5 只读三份日志（不重跑），但 T2 交付的日志不全（见 §5），按计划该条的兜底「缺一份 → 自己补跑」执行。

命令：`node .tmp/reset.mjs 9222 && node .tmp/tester-r30-t2-trash.mjs 9222`（我自己写的裁剪版，复制 `.tmp/e2e-r30-verify.mjs` 第 1–2 节的断言逻辑）
日志：`.tmp/tester-r30-t2-trash.log`　结果：**4/4 PASS**，退出码 0

（为让截图能看出「正文恢复」，脚本跑了第二次，时间戳 `011438`；截图就取自这次，日志同为 4/4。）

```
## after delete clean {"trash":[".sidelight/trash/20261117-011438-571st2-干净.md"],"trashBackup":"# 干净\n\n干净的正文。\n","trashCurrent":null,"notice":"已移到回收站：干净.md"}
## after undo clean {"restored":"# 干净\n\n干净的正文。\n","trash":[],"notice":"已恢复 干净.md"}
## open restored clean {"editor":"干净\n\n干净的正文。","status":"7 字 · 阅读约 1 分钟"}
## after delete dirty {"trash":[".sidelight/trash/20261117-011444-3k56r3-脏的.md",".sidelight/trash/20261117-011444-3k56r3-脏的.md.current.md"]}
## after undo dirty {"restored":"# 脏的\n\n原文。未保存的补充。\n","trash":[]}
## errors []
```

| 计划 T2 验收 3 | 判定 | 证据 |
| :--- | :--- | :--- |
| a) 干净文件删除后 trash 只有 1 个条目、无 `.current.md` | PASS | `trash` 长度 1，`trashCurrent:null` |
| b) 撤销后正文逐字节等于原文且非空，trash 清空 | PASS | `restored:"# 干净\n\n干净的正文。\n"`、`trash:[]` |
| c) 脏文件删除后 `.current.md` 存在且非空；撤销后含未保存补充 | PASS | `after delete dirty` 有 `.current.md`；`restored` 含「未保存的补充。」 |
| d) 控制台 error 0 / pageerror 0 | PASS | `## errors []` |

截图：`shots/round-30/r30-t2-trash-undo.png`（撤销后根文件正文可见；T2 交付物里缺这张，我复跑时补拍）。

代码对照（`git diff src/lib/trash.ts`，72 行）：

- `shouldWriteCurrent(text: string | null)`（`:152`），`deleteFileWithText` 的入参改 `string | null`（`:180`），`.current.md` 整段写进 `if (text !== null && shouldWriteCurrent(text))`（`:195`），块内重新取 `const current = text`；删原文件那一步留在块外。
- `pickTrashSource(entries, trashNameValue)`（`:160`）：`.current.md` 存在且 `size > 0` 才优先，否则整份备份，都没有返回 `null`。
- `deleteDocumentToTrash` 透传 `currentText`（`:326`），`?? ''` 已删。
- `restoreFromTrash`：`for await (const [name, handle] of trashDir.entries())` + `handle.kind === 'file'`（`:370`）收集 `{name,size}`，用 `pickTrashSource` 选源（`:379`），copy 分支删实际选中的 `sourceName`（`:407`）。
- `restoreDocumentFromTrash`（`:336-360`）：**没有二次读回**；两条 `removeEntry` 和缓存搬回都在 `if (restored.ok)` 内 —— 满足计划 T2 验收 5「清理只在 `restored.ok` 之后」。

已知取舍（计划 T2 验收 4，不判 FAIL）：整篇删空（正文空但 dirty）删除再撤销会恢复磁盘原文而不是空文件 —— 选源只看 `.current.md` 是否非空，保数据不保「空」。

---

## 5. T2 交付物核对（缺件记录）

| 文件 | 计划要求 | 实测 |
| :--- | :--- | :--- |
| `.tmp/e2e-r30-t2-before.log` | 修前证据 | **缺失** |
| `.tmp/e2e-r30-t2-after.log` | 修后验收 | 在（2,334 B，含四段 JSON，`## errors []`） |
| `.tmp/e2e-r30-t2-root.log`（根代理批次间复跑） | 在 | **缺失** |
| `.tmp/e2e-r30-t2-trash.mjs`（新脚本） | 在 | **缺失** |
| `shots/round-30/r30-t2-trash-undo.png` | 在 | **缺失** → 我已复跑补拍 |

- `.tmp/e2e-r30-t2-after.log` 的内容其实是**整份** `.tmp/e2e-r30-verify.mjs` 的输出（含 bold/outline/bigfile 段），不是计划要的「只裁剪第 1–2 节」的脚本 —— 说明 T2 最后一步没有按计划裁剪脚本。
- 缺件的兜底已执行：我自己写了 `.tmp/tester-r30-t2-trash.mjs` 并跑出 a–d 全过（§4），所以**行为本身不判 FAIL**。缺件不影响结论，但 T2 的「交付物完整性」这一项没达标，写进下一轮注意项（§11）。

---

## 6. 回归脚本

| 命令 | 结果 |
| :--- | :--- |
| `$env:SIDELIGHT_CDP='http://127.0.0.1:9222'; node scripts/keyboard-acceptance.mjs http://localhost:5175` | **49/49 PASS**（日志 `.tmp/tester-r30-keyboard.log`） |
| `scripts/export-acceptance.mjs`（见 §3） | **7/7 PASS** |
| 预览懒加载（见 §3） | **4/4 PASS** |

- `keyboard-acceptance.mjs` 覆盖 Tab 顺序（`:109-140`）：状态栏新增的 `button.stats-trigger` 没有破坏 Tab 链路（`PASS Tab 后输入 XYZ 正文含 XYZ`、表格 Tab 两条都过）。
- 该脚本结尾有 `await browser.close()`（`:466`），会关掉 9222 这个 Edge 实例；按「先跑回归、最后再跑它」的顺序放在最后，跑完本端口不再用浏览器。
- 跑完 `git checkout -- shots/round-05/` 已还原三张历史截图（`git status --short -- shots/` 只剩 `?? shots/round-30/`）。

---

## 7. 文档与版本核对（计划 §5-8）

| 项 | README / CHANGELOG 写的 | 我实测 | 判定 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip | 284,529 B | 284,529 B | 一致 |
| 相对 364,960 | −22.0% | (364,960−284,529)/364,960 = 22.04% | 一致 |
| 286,000 余量 | 1,471 B | 286,000−284,529 = 1,471 | 一致 |
| 主 chunk | 892,443 B | 892,443 B | 一致 |
| 测试 | 18 个文件、260 条 | 18 / 260 | 一致 |
| `package.json` version | 0.32.1 | 0.32.1 | 一致 |
| `release/`、`dist/` | 不该有改动 | `git status --short -- release/ dist/` 空 | 一致 |

- README「现在能做什么」已包含两条新增能力（`README.md:51` 字数明细、`:56` 删除后可撤销恢复原内容）；`README.md:79` 的「21 项有 / 18 项缺」按计划**未改**（与 `docs/typora-gap.md` 一起推迟）。
- **只改了一处非数字事实**：`docs/CHANGELOG.md:17` 的 UNVERIFIED 原句写着「超大文件新提示的复验仍被 dev server 的陈旧模块挡住」，本轮实测已经能验且通过（§8），这句是错的。改成「超大文件新提示本轮已按文件树入口实测通过」，其余条目一字未动。

---

## 8. 计划 §2（R1）前提失效：超大文件提示已实测通过

- 计划 §2 的结论是 UNVERIFIED，理由是「dev server 交付的模块仍是旧的（`tooLargeNote` 2 处 vs 磁盘 3 处）」。
- 我实测（01:09 左右）：`Invoke-WebRequest http://localhost:5175/src/App.tsx` → 590,451 B、`tooLargeNote` **3 处**，与磁盘一致；说明 plan 写完之后 dev server 已换成新模块（T2 的 after 日志 01:02 也已经是新文案，`shots/round-30/p6-bigfile.png` 是 01:02:31）。
- 于是按计划 §2 的补测方法补测：`.tmp/tester-r30-bigfile.mjs`（假工作区，6 MiB `大.md`），**4/4 PASS**：

```
## bigfile {"notice":"「大.md」超过 5.5 MiB，仍在「普通.md」","before":"普通\n\n普通正文。","active":"示例文集/普通.md","status":"6 字 · 阅读约 1 分钟"}
## check 提示文案包含「超过 5.5 MiB」 PASS
## check 提示文案说清「仍在」哪一篇 PASS
## check 没有切走：当前仍是打开前的文档 PASS
## check errors 0 PASS
```

- 结论：R1 本项从 UNVERIFIED **升为已验证**；计划 §3 待办池第 1 项可以划掉。口径仍按计划：这是文件树入口的自动化实测，5.5–6 MB 之间的边界与真人交互仍未验（README:77 已如实写）。

---

## 9. 偏离计划 / 本轮发现（不影响 PASS）

1. **`scripts/export-acceptance.mjs` 选择器过期**（既有问题，非本轮回归）：导出菜单项是 `role="menuitem"`，脚本按 `button` 找，5 秒后下载事件超时。已按 AGENTS §8 修脚本（menuitem + 不关整浏览器 + 显式退出），修后 7/7。
2. **`npm run build` 未重跑**：按计划 §5-1 只核 dist 新鲜度（`dist/index.html` 01:02:44 > 最后 src 改动 01:01:28）。
3. **T2 交付物缺 4 件**（§5）：before/root 日志、裁剪后的 e2e 脚本、撤销截图。行为已由我复跑证明；缺件记入下一轮注意项。
4. **端口用 9222 而非计划 §4 的 9224**：调度提示指定 9222，plan §4 自己写「与调度提示冲突时以调度提示为准」。本轮 T1/T2/T3 都已收工，9222 没有别的代理在用（reset 时 `closed:0/1`，没有关掉别人的页面）。
5. **R1 提前可验**（§8）：计划把它整项移出本轮，实际已能测且通过；这是「dev server 换了新模块」带来的，不是我在计划外扩了范围。

---

## 10. UNVERIFIED（写清哪条、为什么、怎么补）

1. **真实目录句柄下的删除 + 撤销**：假 FSA 没有权限模型，`move()` 总存在 → e2e 永远走 move 分支。补测：真实文件夹里手测一次删除 + 撤销，并在 DevTools 里打印 `typeof handle.move`。
2. **`restoreFromTrash` 的 copy 分支**：同上，本轮 e2e 走不到；`pickTrashSource` 的 4 条单测只覆盖选源，不覆盖替换写入。补测同 1。
3. **真实中文输入法下的面板交互 / `Esc` / IME**：本轮无 IME 自动化。
4. **135% / 150% / 200% 缩放屏上的面板位置**：面板是 `position: fixed; left:16px; bottom:40px`，本机只验 100%。
5. **`release.yml` 新增的 `npm test` / `measure-first-screen` 在 GitHub runner 上的真实执行**：本轮不 push，只静态核对了行位置（3 行、在 `npm run build` 之后）。
6. **已发布的 0.32.1 setup 的 FileVersion 是否同样错**：需要下载二进制；修复只对下一个版本生效。
7. **NSIS 对新增懒 chunk 的真实安装包增量**：首屏外的 chunk 也进 `dist`，只能下次打包量。
8. **源码模式字数对 Markdown 链接目标的残留跳变**：只修了 frontmatter 引起的跳变；`[文字](https://…)` 仍会跳。补测：写入带链接的文档切两次视图比字数；修法要动 `countText` 口径。

---

## 11. 下一轮建议（给根代理写 STATE 用）

1. 把计划 §2 / §3-1 的 R1 项划掉：本轮已实测通过（§8）。
2. T2 交付物纪律：`.tmp/e2e-r30-t2-before.log`、`.tmp/e2e-r30-t2-root.log`、裁剪版 e2e 脚本、撤销截图都缺；下一轮要求实施代理在报告里贴文件清单 + `Test-Path`，避免「说不清有没有证据」。
3. 真实盘句柄下的删除 + 撤销、copy 分支：需要真人手测，登记进待办池。
4. 链接目标导致的字数跳变（B4 残留）单独评估。

---

## 12. 收尾动作

- 改 `AGENTS.md` §3 测试条数注释（17/251 → 18/260）与 §6 当前状态（首屏 285,838 → 284,529、余 162 → 1,471 B、测试 18/260、新增两条能力）。
- 改 `docs/CHANGELOG.md:17` 一处 UNVERIFIED 事实（§7）。
- 截图：`shots/round-30/r30-t1-stats-selection.png`（新）、`shots/round-30/r30-t2-trash-undo.png`（补拍）。
- `git status --short`：除本轮改动与 `shots/round-30/`、`docs/iteration/round-30/` 外无残留；`release/`、`dist/` 未动；历史截图已还原。
- commit：`round-30: …`（见根代理回复的短哈希）。不 push、不改 `release/`、不写 `STATE.md`。
