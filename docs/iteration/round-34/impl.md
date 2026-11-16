# 第 34 轮实现报告（executor）

- 基线：`main` @ `186dfeb`。执行前 `git status --porcelain` 只有 `docs/iteration/round-34/`、`shots/round-34/`（与本计划一致）。
- 本轮**不发版**：`package.json` 的 `version` 仍是 `0.32.1`。未 commit、未 push、未动 `release/`、未动 `host/`、`host-mac/`、`.github/workflows/*`。未改 `docs/CHANGELOG.md`（按计划由根代理写）。
- 三个任务全部完成：**T1 PASS、T2 PASS、T3 PASS**。门禁：`npx tsc --noEmit` 无输出、`npm test` 22 文件 **287** 条全绿、`npm run verify` PASS（gzip **285,937 B**，余 **63 B**）。

## 1. 逐任务状态

| # | 任务 | 状态 | 关键证据 |
| :-- | :--- | :--- | :--- |
| T1 | 脚注定义丢失不再静默落盘 | **PASS** | 6/6 e2e；单测 287 条；修复前日志 f/b FAIL |
| T2 | 查找关框与快速打开焦点、同一篇不弹框 | **PASS** | 6/6 e2e（含 f 回归） |
| T3 | 首屏体积门进 `npm run verify` + `headroom` | **PASS** | verify 退出码 0、反例退出码 1 |

## 2. 改动文件（`git diff --stat` 实测）

```
 AGENTS.md                        |  1 +
 README.md                        |  1 +
 package.json                     |  1 +
 scripts/measure-first-screen.mjs |  2 +-
 src/App.tsx                      | 27 ++++++++++++++++++++++-----
 src/components/FileTree.tsx      |  1 +
 src/components/SaveDialog.tsx    |  2 +-
 src/lib/diff.test.ts             | 16 +++++++++++++++-
 src/lib/risk.ts                  | 11 ++++++++---
 9 files changed, 51 insertions(+), 11 deletions(-)
```

### T1

1. `src/lib/risk.ts:366` 新增 `FOOTNOTE_DEFINITION`；`:375` 短路改成「基线为空但原文有脚注定义时仍要分类」；过滤条件加 `loss.kind === 'footnote-loss'`（只放过这一种）；`:368-373` 的 JSDoc 同步改（P2-3）。
2. `src/lib/diff.test.ts:96` 用例名改成「基线为空时，非脚注类损失不拦」（**断言 `:97-99` 一字未动**）；在 `:246` 后新增两条用例（共 **+2 条**）。
3. `src/components/SaveDialog.tsx:63` 删掉「在载入时就存在，」（新语义下不再成立；字节是负的）。
4. **未改 `src/App.tsx` 的保存门**：手动保存 `:2849` 与自动保存 `:3125` 都调 `activeLosses`，一处修完两处受益。

### T2

1. `src/App.tsx:327` 新增模块级 `focusEditor()`；`:2449`、`:2459`、`:2473` 三处逐字相同的 `requestAnimationFrame(... .ProseMirror ...)` 换成它（= 决策点 A 梯子第 2 级，先做）。
2. `src/App.tsx:3501-3505`：`Esc` 关查找后 `focusEditor()`。
3. `src/App.tsx:4587-4591`：查找条「关闭」按钮 `onClose` 同样还焦点。
4. `src/App.tsx:2125-2132`：`requestLoad` 的 `dirty` 分支先比句柄身份 `await file.handle.isSameEntry(activeFile.handle)`，同一篇直接 `focusEditor()` 返回、不弹切换框；依赖数组加 `activeFile`。句柄缺失（`handle: null` / 宿主文档的 `activeFile === null`）时 `same` 恒为 false，保持旧弹框。
5. `src/App.tsx:5083-5089`：快速打开 `onSelect` 里 `setQuickOpen(false)` 之后 `focusEditor()`。
6. `src/components/FileTree.tsx:107`：**计划外新增（按 `plan-review.md` 的 P1-1）**——`activePath` 变化时，若焦点已在正文就不要再聚焦树行。理由见第 4 节。

### T3

1. `package.json`：`build` 逐字未动，新增 `"verify": "npm run build && node scripts/measure-first-screen.mjs"`。
2. `scripts/measure-first-screen.mjs:56` 汇总行加 `headroom=${max - totalGzip}`（FAIL 分支与 `--max` 默认值未动）。
3. `AGENTS.md:38` 加一行 `npm run verify` 并写清分工；`README.md:120` 命令段加一行。

## 3. 命令与结果（原始输出）

### 3.1 修复前证据

- `.tmp/e2e-r34-t1-before.log`（未改产品代码，自动保存**保持默认开启**）：
  - **f FAIL（自动保存路径，本轮 P0 的漏网关键）**：`{"bytesAtFStart":"# 脚注篇\n\n引用[^1]。\n\n[^1]: 定义文字。\n\n末尾段。\n","stillHasDef":false,"manualHint":false,"bytes":"# 脚注篇\n\n引用[^1](定义文字。)。\n\n末尾段。甲\n","dirty":false,"status":"10 字 · 阅读约 1 分钟 / 已自动保存 04:56"}` —— 用户只打了一个字，**2 秒后自动保存把定义静默改写成 `[^1](定义文字。)`**，状态栏还显示「已自动保存」。
  - **b FAIL（手动保存路径）**：`{"dialogSeen":false,"text":"","buttons":[],"dirtyBefore":false,"dirty":false}` → 不弹框、直接写盘。
  - **c FAIL（SKIP）**：b 没弹框，无从点取消。
  - a PASS、d PASS、e PASS（两条反例本来就不该拦）。
- `.tmp/e2e-r34-t2-before.log`（自动保存用 `addInitScript` 关掉）：
  - a/b/c FAIL：`active":"BODY."`、`landed:false`（Esc 后焦点在 body）。
  - d FAIL：`{"dialogCount":1,"dialog":"这篇还有没保存的改动|切到「甲.md」之前…","name":"甲.md","dirty":true}` —— 同一篇也弹框。
  - f PASS（修复前脏状态换篇本来就弹框），e FAIL：`{"switched":true,"landed":false,"activeBeforeType":"DIV.tree-file is-active","name":"乙.md"}`。

### 3.2 修复后

- `.tmp/e2e-r34-t1.log`（顺序 d → e → a → f → b → c，未关自动保存）：**6/6 PASS**。
  - f：`{"bytesAtFStart":"…# 脚注篇…[^1]: 定义文字。…末尾段。","stillHasDef":true,"manualHint":true,"bytes":"…[^1]: 定义文字。…","dirty":true,"status":"10 字 · 阅读约 1 分钟 / 需手动保存"}`。
  - b：`{"dialogSeen":true,"text":"保存后这些写法会被改写|下面这些结构在保存后会丢掉或重排。取消不会写入任何字节。|脚注 [^1] 的定义在保存后会消失（正文还在引用它）|影响 1 处|[^1]: …|在源码模式看原文|取消|仍然保存","dirty":true}`。
  - c：`{"sameBytes":true,"stillHasDef":true,"noDialog":true,"toastBefore":"已保存 脚注.md","toastAfter":"已保存 脚注.md","dirty":true,"bytesAfter":"…[^1]: 定义文字。…"}`（`dirty` 只进日志、未作断言，符合计划 P1-1）。
- `.tmp/e2e-r34-t2.log`（a → b → c → d → f → e）：**6/6 PASS**。
  - a：`active":"DIV.tiptap ProseMirror editor ProseMirror-focused","inEditor":true`（修复前 `BODY`）。
  - b：`"landed":true,"dirty":true,"editor":"甲|甲的正文。KEY"`（修复前字数不变）。
  - c：`inEditor:true, findOpen:false`。
  - d：`{"dialogCount":0,"name":"甲.md","editor":"甲|甲的正文。KEY脏","dirty":true,"active":"DIV.…ProseMirror…"}`（**没走「不保存」重载，脏字还在**）。
  - f：`{"dialogCount":1,"dialog":"这篇还有没保存的改动|切到「乙.md」之前…","activeInDialog":true}`（确认框焦点没被抢）。
  - e：`{"switched":true,"landed":true,"activeBeforeType":"DIV.…ProseMirror…","editor":"PALETTETYPED乙|乙的正文。"}`（修复前 `landed:false`、焦点在 `DIV.tree-file is-active`）。
  - 角色与脏标记判据都打进日志：`## d-dirty-guard {"active":"DIV.…ProseMirror…","dirty":true,"name":"甲.md"}` —— 两条 `dirty` 守卫都真的为 `true`，不是假通过。
- `npx tsc --noEmit`：无输出，退出码 0。
- `node --experimental-strip-types src/lib/diff.test.ts`：**51 pass / 0 fail**（改前 49，+2）。`src/lib/footnotes.test.ts` 复跑也全绿。
- `npm test`：退出码 0，**22 个文件、287 条**（逐文件：10+22+10+15+16+51+11+11+16+10+6+16+16+27+12+6+5+6+3+3+7+8=287）。
- `npm run verify`（`.tmp/t3-verify.log`，退出码 0）：
  ```
     896224   278909  /assets/index-O0GdPjrm.js
      33784     7028  /assets/index-BLxN31Mr.css
  total raw=930008 gzip=285937 headroom=63 files=2 max=286000
  gzip 省下 644071 B（69.3%）
  PASS
  ```
- 反例（`.tmp/t3-negative.log`，退出码 **1**）：
  ```
  total raw=930008 gzip=285937 headroom=-937 files=2 max=285000
  FAIL 首屏 gzip 285937 超过上限 285000
  ```
- `node -e "const s=require('./package.json').scripts; …"` → `tsc --noEmit && vite build | npm run build && node scripts/measure-first-screen.mjs`（`build` 逐字未动）。

### 3.3 体积（只记实测，不解释原因）

- 基线 `M_0`：finder 实测 raw=929,933 / gzip=**285,891 B**（本轮未重跑修复前构建）。
- T1+T2+T3 落地后 `npm run verify` 实测：raw=930,008 / gzip=**285,937 B** → **+46 B gzip，余 63 B**（上限 286,000 未动）。
- 余量已低于 100 B：按全轮硬约束 3，`impl.md` 在此写明「下一轮第一件事必须是省字节任务」。本轮**未**执行梯子第 1 级（删 `App.tsx:2471-2472` 两行逐字重复的 `show()`，实测仍在），因为实测未超线；根代理若在 `M_A` 看到超线可按梯子回改。

## 4. 偏离计划、以及为什么（请根代理复核）

1. **T2 多改一个文件 `src/components/FileTree.tsx`（+1 行）**：按 `plan-review.md` 的 **P1-1**。审查用探针实测：`focusEditor` 的 rAF 在 Enter 后 ~6 ms 把焦点送进正文，但 `FileTree.tsx` 的 `[activePath]` effect 在 ~23 ms 又把焦点抢回 `DIV.tree-file is-active`（单向闩 `wasFocusedRef` 一旦置 true 永不复位），所以只改 `App.tsx` 时 e 断言必然红。守卫写成「焦点已在 `.ProseMirror` 里就跳过」，只影响「焦点已交还正文」这一种新情况。
2. **e 的写法按 `plan-review.md` P2-1 改**：Enter 后先等 `window.__slState.name === '乙.md'`（最多 3000 ms）再等 250 ms 才打字，**不点正文、不以 activeElement 为等待条件**（否则断言自证）。已实测修复前仍为 `landed:false`，说明等待没有把断言变成假通过。
3. **T1 的执行顺序改成 d → e → a → f → b → c（计划的 f 被前移到 b 之前）**：计划原顺序是 a → b → c → f。实测发现修复前 **b 的 `Ctrl+S` 会先把坏字节静默写上盘**，f 再跑时文件里已经没有 `[^1]: 定义文字。`，f 的失败就无法归因到「自动保存写坏」。前移后 f 从 a 留下的干净状态起跑，修复前日志才拿到「自动保存把定义写没」的**直接证据**（第 3.1 节 f 段）。**不减少任何断言**；`f` 与 `c` 现在互不依赖。
4. **T1 的 e2e 也不再用「复原字节 + 重载」造 f 的起点**（试过一次，已删）：富文本重载时 `loadIntoEditor` 会把「载入即坏」算进基线，修复前也会拦（这正是 findings 的 probe4），会把 f 变成假 PASS。
5. **T3 的 `npm run verify` 会写 `dist/`**：按计划只在 T3 收尾跑一次，未并发构建。T3 之前全程未跑 `npm run build` / `vite build`。

## 5. 截图

- `shots/round-34/t1-footnote-gate.png`：b 那一步的确认框（已核看图内文字：「保存后这些写法会被改写」「脚注 [^1] 的定义在保存后会消失（正文还在引用它）」「影响 1 处」「取消」「仍然保存」）。
- `shots/round-34/t2-find-esc-typing.png`：b 那一步之后，正文里能看到 `KEY`（Esc 后打字落进正文）。

## 6. CHANGELOG 建议条目（根代理写）

```
## Unreleased（第 29–34 轮，未发版）
### 第 34 轮
- 脚注定义被挤出文末块后不再静默写盘：手动保存与自动保存都会拦住，确认框可取消（不写任何字节）
- 查找条关闭后焦点回到正文（`Esc` 与「关闭」按钮）；快速打开选中后焦点落回正文；脏文档里选中「当前这一篇」不再弹切换框
- 新增 `npm run verify`（build + 首屏 gzip 字节门），measure 汇总行打印 `headroom`
```

不要写「修好图片」「链接可打开」——两条都没做。

## 7. 新踩坑（写进 AGENTS §8 的候选）

1. **Vite 的模块转换缓存会让 dev server 持续交付旧 `App.tsx`，`curl` 无 `?t=` 参数时也读到旧版本**：本轮 T2 改完第一次复跑，e 断言稳定 FAIL，时间线探针显示 `onSelect` 里的 `focusEditor()` **根本没被调用**；把 `/src/App.tsx` 抓下来数 `focusEditor` 只有 7 处（磁盘 8 处），而 `?t=<任意值>` 抓到的是 8 处。**修法：`(Get-Item src/App.tsx).LastWriteTime = Get-Date` 触发 watcher，再抓一次确认 8 处**，之后 e 6/6 PASS。判「产品没修」前先数一个 ASCII 标记的出现次数，并用 `?t=` 做对照；不要为此改产品代码，也不要重启 dev server（本轮禁）。
2. **`Invoke-WebRequest` 在本会话非交互模式直接失败**（`Windows PowerShell 处于非交互模式`），抓本地模块改用 `curl.exe -s`，中文不要用 `-match`（ASCII 标记照旧）。
3. **`.ProseMirror` 在切换文档的 rAF 窗口里是存在的**（探针里 4 个 rAF 都是 `pm:true`），所以「rAF 里 querySelector 为 null」不是 T2-d 失败的原因，别沿这条线查。
4. **T1 的 f 断言必须先读「打字前」的文件字节**：修复前 b 会先写坏盘，f 的失败原因会被误归因。顺序与归因写进脚本注释。

## 8. UNVERIFIED（本轮测不了）

1. **真实磁盘上的 T1 复现/拦截**：只有假 FSA（`window.__fsState`）。真实 Chrome/宿主同走 `performCommit`，但未在真盘手测。补测：`npm run dev` 打开真目录，按 4 步做一次，比对 `.md` 字节，确认弹框且「取消」不写盘。
2. **`activeLosses` 新语义对自动保存路径的性能**：本机无 1 MB 带脚注样本。补测：造 1 MB、文末 3 条脚注定义的文档，改一个字，量自动保存周期里 `activeLosses` 的耗时。其余（无脚注文档）仍走 `FOOTNOTE_DEFINITION` 的 O(1) 短路。
3. **真实中文输入法下 `Esc` 后打字**：e2e 是合成键盘，无组合事件。补测：微软拼音 `Ctrl+F` → `Esc` → 打中文，看是否落进正文。
4. **宿主（WebView2）/ macOS 里的 T2 三处焦点修复**：只跑了 `localhost:5175` + CDP 9222。补测：`host-smoke` 加一步「`Ctrl+P` 选中后直接打字」。
5. **`npm run verify` 在 CI 上的表现**：本轮 `.github/workflows/*` 零改动，`verify` 只在本地验证；Windows/macOS runner 上 measure 的 gzip 字节一致性仍未知（这也是不把 measure 塞进 `build` 的理由）。
6. **真人点击文件树上「当前这一篇」**：与快速打开同走 `requestLoad`，但本轮只把快速打开写进 e2e。
7. **源码模式（`textarea`）下 `Ctrl+F`/`Esc` 的落点**：T2 的 e2e 未覆盖，未猜结论。

## 9. 其他

- 未跑 `npm run roundtrip`：本轮未改编辑器内核与 markdown 序列化（`risk.ts` 是保存前的损失分类，不参与序列化）。
- `.tmp/e2e-r34-t2-etrace.mjs` 是 T2 失败定位用的只读探针（焦点/rAF 时间线），留档备查；不改产品代码。
