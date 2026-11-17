# 第 43 轮 · 计划审查（critic，只读）· 复审 revision 3

- 轮次：`round=43`、`nn=43`；轮前 `startSha=0f83e1f80f57d93e0860282a0d3b0bc2b7953750`。本次实测 `git rev-parse HEAD` = `0f83e1f80f57d93e0860282a0d3b0bc2b7953750`；`git status --porcelain` 只有 `?? docs/iteration/round-43/`、`?? shots/round-43/`。
- 开工前已读 `.tmp/iteration/common.md`（56 行）与 `.tmp/iteration/roles/critic.md`（25 行）全文。
- 输入：`docs/iteration/round-43/plan.md`（revision 3，**433 行全文读完**）、本文件上一版（revision 2，101 行）、`AGENTS.md` / `README.md` / `docs/typora-gap.md` / `packaging/README.md` / `docs/CHANGELOG.md` / `docs/iteration/STATE.md`，以及计划逐条点到的每个源码文件（下面给本次实测行号）。
- 只读：未改产品代码，未跑 E2E、未连 CDP 9222、未跑 `reset.mjs`、未启动/重启 dev server、未 push、未碰 `release/`。
- **结论：REVISE。** 上一版 3 条 P2（R43-5 / R43-6 / R43-7）**全部落实**（§一 逐条给实测证据）；新增 **5 条 P2**（§二），**没有 P0/P1**；五条都是「改一行 / 补一句 / 加一条断言」的修法，不扩大范围、不动任务划分与顺序。

---

## 一、上一版 3 条漏洞复核：全部修掉

| 上一版漏洞 | revision 3 的落点 | 本次实测（只读，未跑浏览器） | 结论 |
| :--- | :--- | :--- | :--- |
| **R43-5** `AGENTS.md:72` 的测试条数没有落点 | `plan.md:358`（§六.3：`:39` + **`:72`** 改测试条数；`:74` 只改首屏数字与 31/10）、`plan.md:362-372` 收尾验收（改前 2 条 → 改后 3 条 grep） | `AGENTS.md:39` = §3 门禁注释「第 42 轮记 29 个文件、372 条」；`:72` = §6 长段的「测试 29 个文件 372 条」；`:74` = 首屏「**291,766 B** / 余 **28,234 B**」与末句「当前 30 项有、11 项缺」，**:74 里没有测试条数**。基线 grep 本次实测：`git grep -n "372 条" -- AGENTS.md` = **2**（`:39`/`:72`）、`git grep -n "测试 29 个文件 372 条" -- AGENTS.md` = **1**（`:72`）、`git grep -n "377" -- AGENTS.md` = **0** | **已修**（落点与基线都对；只剩 `plan.md:370` 一处注释错误，见 **R43-10**） |
| **R43-6** §九 砍单与 §五 验收不自洽 | `plan.md:391`（§七「明确不砍」含搬行与三处标题计数）、`plan.md:422-425`（砍单重排为 4 项，#1 = T4 快捷键 e2e）、`plan.md:418`（T2 检查点改成「只砍 §九 #1；搬行与五处计数照做」）、`plan.md:421`（「搬行不在砍单里」）、`plan.md:429`（§九「这些不砍」含搬行） | 取修法 ① 已落地：搬行不再出现在任何砍单/检查点里，§五 验收的 31/10/2 口径与搬行后状态一致。实测底数：`README.md:87` =「当前已有 **29** 项，缺 **11** 项」、`typora-gap.md:7/:42/:44` =「已经有的（30）」「缺的（11）」「### 编辑与格式（3）」、`AGENTS.md:74` 末句 =「当前 30 项有、11 项缺」。gap 表行数实测：已经有的 `:11-40` = 30 行；缺的 = 3+3+1+1+1+2 = 11 → 搬 1 行后 31/10、编辑与格式 3→2，三条改后 grep 与 `README.md:87`（29→31）、`AGENTS.md:74`（30/11→31/10）同口径，**不会再挂验收** | **已修** |
| **R43-7** Windows 块漏「需要 WebView2 运行时」 | `plan.md:267`（Windows 块第一条）、`plan.md:269`（开始菜单/卸载改为指向 `packaging/README.md`，写明「尚未人工验」）、`plan.md:301`（改前基线 grep 0）、`plan.md:313`（改后 grep 1） | `packaging/README.md:18` 原文即有「**需要 Microsoft WebView2 运行时。** Windows 11 自带；没有的话安装器会弹提示并**中止安装**」；`git grep -n "WebView2 运行时" -- README.md` 本次实测 **0 命中（exit 1）**；`README.md:76` 的未验句含「开始菜单快捷方式、默认安装路径、真人双击与 SmartScreen…尚未人工验」，`plan.md:269` 的措辞与之一致，未写成已验证 | **已修** |

---

## 二、新增漏洞（5 条，全 P2）

### R43-8（P2）T1 的「可见变化」只落进 CHANGELOG，README 的「能做什么 / 不能做什么」两节没有落点

**证据**
- `plan.md:104`（§二 风险）明确写「源码模式里点格式按钮不再改隐藏文档（这是修复，不是回归；**写进 README/CHANGELOG 的「可见变化」**）」，但：
  - `plan.md:265-276`（§五.1 README 清单）只有 Windows 块、`:22` 校验行、`:49` 粘贴句、`:87` 差距计数、`:124`/`:162` 测试计数；
  - `plan.md:357`（§六.2 README 收尾）只有 `:105` 首屏数字、`:124`、`:162`、`:87`；
  - 全计划**没有一处**点到 `README.md:75`（「现在不能做什么」的「键盘与查找的三条边界（第 42 轮实测）」），也没点到 `README.md:58`（Esc / 工具条按下态）。
- `AGENTS.md:80`（§7 交接）写死「收工改三处：README 的「现在能做什么」与「现在不能做什么」、CHANGELOG 当次条目…」。本轮 T1 是用户可见的行为收紧：预览与源码里 `Ctrl+K`/`Ctrl+M`、工具条格式 / 插入命令、表格条**一律不可用**，用户按下去只会得到一条 toast；README 仍只说「预览里查找替换锁住」（`:49`、`:75`），不写这条，用户会以为「预览里还能插公式」。

**修法**（2 行 + 1 条 grep）
1. `plan.md:273` 后加一条 README 改动：「`README.md:75` 补第四条边界：预览 / 源码里工具条格式、插入命令与表格条都不可用（第 43 轮，与查找替换同一条只读口径）；要改正文先按 `Ctrl+Shift+P` / `Ctrl+/` 回编辑。」
2. `plan.md:357`（§六.2）的复核清单补 `:75`：「`:75` 的 T1 可见变化（§五.1）收尾复核，不许与 CHANGELOG 措辞相反。」
3. §五 验收加一条（改前 0 → 改后 1）：`git grep -n "表格条都不可用" -- README.md`。

### R43-9（P2）§九 时间表六行相加 = 42 min，合计却写 ≈41 min；revision 3 声称的「省 1 min」没有落到任何一行

**证据**
- `plan.md:3`：「时间预算由 ≈42 min 减为 **≈41 min**（`keyboard-acceptance` 少跑 1 次）」；`plan.md:23`：「合计约 **41 min**（revision 3 比 revision 2 少 1 min）」；`plan.md:416`：「比 35 min 多出的约 **6 min**」。
- 但 `plan.md:406-414` 表内六行实测相加：T1 **12**（`plan.md:408`）+ T2 8 + T3 7 + T4 7 + 收尾 3 + 门禁 5 = **42**，不是 41。revision 3 声称只把 `keyboard-acceptance` 少跑一次（`plan.md:3`），表行里没有任何一行体现出这 1 min 的去向（T1 仍是「自测 6 min」）。
- 被省掉的那 1 min 只能落在 T1 自测：`plan.md:76` 已把 `keyboard-acceptance` 从 T1 第 5 步推迟到 T2 结束（`plan.md:154` 跑一次、`plan.md:349` 串跑一次），而 T2 的 4 min 现在已经包含这一次跑。

**影响**：计划反复用「41 min / 多出 6 min」（`plan.md:23`/`:414`/`:416`）做砍单判据；表行相加仍是 42，说明 revision 3 声称省下的 1 min **没有从任何一行里省出来**，执行代理按检查点记账得到的仍是 42 的量级（砍满 4 项 ≈37–38 min），「41」只是让超时看起来小 1 min，预算口径与实际对不上。

**修法**（1 行）：`plan.md:408` 的 T1 自测 **6 min → 5 min**（T1 小计 12 → **11 min**），六行合计 = 41，与 `plan.md:23`/`:414`/`:416` 自洽；或反向把三处 41 改回 42 并删 `plan.md:3` 的「少 1 min」。

### R43-10（P2）§六 收尾验收第 3 条「改前 1」不成立：`测试 29 个文件 377 条` 改前是 0 命中

**证据**
- `plan.md:370` 原样写：`git grep -n "测试 29 个文件 377 条" -- AGENTS.md     # 1（改前 1；数字按本轮 npm test 实测替换）`。
- 本次实测：`git grep -n "377" -- AGENTS.md` = **0 命中**（`AGENTS.md:39`/`:72` 现在都是 372）；`AGENTS.md` 里 `372 条` 只有 `:39`/`:72` 两处。所以这一行的「改前 1」无法复现，而它上一行（`plan.md:367`）的「测试 29 个文件 372 条 # 1」才是这条基线的正确出处。
- 同一块的开头（`plan.md:362`）写着「先贴改前 >0，AGENTS §8」——一条自称「改前 1」却抓不到的断言，正是 AGENTS §8 要防的假阴。同理 `plan.md:371` 的 `377 条 # 2` 也是改后值（改前 0），注释里没有标「改后」。

**修法**（1 行）：`plan.md:370` 的注释改成「# 1（改后；改前 **0**，改前基线见上面 `372 条` 那条）」；`plan.md:371` 的注释补「改后」（改前 0）。若想守住「不预设数字」，可把模式收成 `测试 29 个文件`（改前 1 → 改后 1），再靠 `377 条 # 2` 那行锁同值。

### R43-11（P2）T3 的 5 条新单测**改前也全绿**，§四 没写这个口径——impl.md 很可能写成「新增单测证明快路径」

**证据**
- `plan.md:205` 新增 4 条相等样例 + 1 条正对照，`plan.md:236` 验收写「新 5 条全过」，`plan.md:245` 风险只论证「短路是精确的」。
- 本次实测（`.tmp/risk-check.mjs`，`node --experimental-strip-types` 直接调 `classify`）：计划要的四类相等样例在**未改代码**时已经全 `[]`（表格+标题 `[]`、脚注 `[]`、公式+注释 `[]`、`classify('a\r\nb','a\nb')` `[]`），正对照在**未改代码**时已经报 `blank-lines`（`blocking:false`）。原因：`src/lib/risk.test.ts:14-17` 现有测试就断言过 `classify(x, x)` 为 `[]`（`assert.deepEqual` 在 `:16`）。
- 也就是说这 5 条只锁「等价输入不报损失」的语义，**不能证明快路径落地**；唯一正向证据是 `plan.md:235` 的 `git grep -n "if (beforeText === afterText) return" -- src/lib/risk.ts # 1`。

**影响**：与 R43-3（PreviewPane 防御性修复不得写「修好了」）、R43-4（6a 改前也绿）是同一类；本轮已经在两处定了「改前亦绿必须明写」的规矩，T3 这条漏了，impl.md / CHANGELOG 容易把「5 条单测」当成性能修复的证据。

**修法**（1 句）：§四 风险（`plan.md:245` 后）加一条：「这 5 条单测**改前亦绿**（`src/lib/risk.test.ts:14-17` 已有同型断言）；它们只锁语义，快路径的唯一正向证据是验收里的那条 grep。impl.md 按此口径写，不许写成『新增单测证明快路径生效』。」

### R43-12（P2）§九 的「按顺序砍、不跳着砍」与 T1 检查点矛盾：15 min 检查点第一刀砍的是顺序表第 3 项

**证据**
- `plan.md:421`：砍单「**按此顺序砍**（每项只砍一次，**不跳着砍**）」，顺序是 1 快捷键 e2e、2 T3 的 1 MB 复测、3 T2 图片拖入断言、4 measure 头注释（`plan.md:422-425`）。
- 但 `plan.md:417` 的 T1 检查点写：「**T1 结束 >15 min**：T2 的图片拖入回归断言降级为「记录 + 代码复核」」——这是顺序表第 **3** 项，第 1、2 项都还没到触发点。`plan.md:418` 的 T2 检查点又只砍第 1 项，形成「先砍 #3、再砍 #1」的逆序。
- 「不跳着砍」的本意是防止把用户可见的断言先砍掉；现在第一条检查点就跳了，规则形同失效。

**修法**（1 行）：把 `plan.md:422-425` 的顺序改成与检查点一致：**1 T2 图片拖入断言（15 min 触发）、2 T4 快捷键 e2e（25 min）、3 T3 的 1 MB 复测（33 min）、4 measure 头注释**；或删掉「不跳着砍」四字，改写成「按检查点触发的先后砍，每项只砍一次」。

---

## 三、复核过、判无问题的点（给执行代理的「别再查」清单）

- **T1 落点在本轮 revision 中一字未动，全部仍成立**：`run()` `App.tsx:3822-3829`；keydown `Ctrl+K` `:3700-3704`、`Ctrl+M`/`Ctrl+Shift+M` `:3705-3709`（分支不判 shift，两种都进）、`Ctrl+1–6` `:3715-3719`、`Ctrl+0` `:3720-3724`；依赖数组 `:3770-3789` 已含 `sourceMode` `:3782` 与 `previewMode` `:3783`——`viewMode` 三态任一变化必翻其中一个布尔，闭包不会陈旧，**不补 `viewMode` 也安全**（补 `show` 仅为一致性）；`disabled={viewMode !== 'edit'}` 现 **2** 处（`:4717`/`:4726`），T1 加 7 处 = 9，验收 `≥ 9` 成立；表格条条件 `:4801`；`openLinkAtCursorRef` `:4123`、`openMathAtCursorRef` `:4225`；`show` `:396` 是 `useCallback(..., [])`。
- **T1 不会误伤编辑态**：`run(` 只被插入菜单（`:4619-4631`）、格式按钮（`:4679-4706`）、表格条（`:4804-4823`）调用；`keyboard-acceptance` 走 window keydown，不经 `run()`。
- **T2 计数与路径成立**：`stopPropagation` 现 `MathInlineEditor` **1**（`:78`，Esc 在 `:56-60` 共享 handler，加 1 = 2）、`LinkEditor` **1**（`:48`；两个输入框各加 1 = 3），验收 2/3 正确；`handleDrop` `App.tsx:861-868` 只接 `image/*` 且 `:865` 先 `preventDefault()`，窗口层判 `event.defaultPrevented` 不会抢图片；`git grep "addEventListener('drop'"` 现 0 → 改后 1。
- **T2 断言 4 可行**：`LinkEditor` 与 `MathInlineEditor` 都在 App 顶层渲染（`App.tsx:5303`、`:5323`），不在三视图分支内，切到预览不会卸载；切换视图不调 `setLinkEdit(null)`（清空只发生在提交/取消，`:4436`/`:4453`/`:5313`），所以「弹层开着 → Ctrl+Shift+P → Esc」场景成立。window keydown 的 `typing`（`:3652-3655`）只挡 `?` 一个分支，输入框里按 Ctrl+Shift+P 仍能切预览。
- **T3 的 `syncDocInfo` 挪动仍可行且 6a 成立**：`setMarkdown` 是**同步** dispatch（`App.tsx:1006-1010` 的 `replaceWith` + `dispatch`），所以把它移到 `if (!skipReparse)` 块内之后，`:3865` 看到的仍是新文档；`setDirty` `:3867` 留在块外不动。`syncDocInfo(editor)` 现 4 处（`:1044`/`:1115`/`:2112`/`:3865`），验收「4 处」成立。
- **T3 删 `serializeBody` 安全（新查）**：`serializeBodyNow`（`App.tsx:2798-2806`）调的是 `serializeDocument`，**不经过** `serializeBody`；全仓 `git grep -nw "serializeBody"` 只有定义 `:187`。`serializeDocumentBody` 现 6 行命中（`App.tsx:74` import 项、`:188` 调用、`serializeDocument.ts:41`、`fidelity-acceptance.mjs:14/43/144`），删 `:186-189` 与 `:74` 的 import 项后 = **4**，与验收一致。`clearSession` `session.ts:55`、悬空注释 `App.tsx:178` 实测都在。
- **T3 单测可加**：`risk.test.ts` 用 `node:test` + `assert/strict`（现 3 条），`package.json:15` 的 `scripts.test` 已挂 `risk.test.ts`（第 28 项），只叠加不新增文件 → 文件数仍 29、条数 372+5=377。`classify` 的短路插在 `risk.ts:321` 之后（`beforeText`/`afterText` 两行已在），六个损失族与 `:332` 尾部换行、`:344` 空行判定都不受相等短路影响（相等时必不触发）。
- **T3 首屏口径数字可复现**：`dist/assets/MarginRail-Cg8xK19i.js` raw **6,088 B**，`zlib.gzipSync` level 9 = **2,327 B**（默认 level 6 = 2,328 B，差 1 B，不影响结论）；`measure-first-screen.mjs` 实测只数 `index.html` 的 3 个引用（`index-*.js`、`rolldown-runtime-*.js`、`index-*.css`），注释与 README 的「口径不含运行时动态 chunk」写法与实际一致；`MarginRail` 在编辑视图无条件渲染（`App.tsx:4989-4990`），冷启动确实会请求它。
- **T4 落点与计数全部命中**：`README.md:13`/`:22`/`:49`/`:76`/`:87`/`:124`/`:162`；`typora-gap.md:31`/`:49`/`:56`/`:64`；`AGENTS.md:39`/`:72`/`:74`；`ShortcutsDialog.tsx:23`（组标题「编辑与批注」）、`:38`（`['Ctrl+E', '行内代码'],` 是组内最后一项）、`:51-54`（「清单只写真实绑定的键位…」注释）、`:65`（`className="dialog shortcuts-dialog"`，e2e 的 `.dialog` 选择器成立）、顶栏按钮 `App.tsx:4583` 有 `aria-label="快捷键"`；`CHANGELOG.md:130` 的「**第 42 轮（同一未发版区间）**」块在。
- **T4 基线与改后 grep 算术成立**：`README.md` 实测「29 项」（`:87`）+「28 个测试文件」（`:162`）= 2；「已有 29 项，缺 11 项」= 1；`AGENTS.md` 的「30 项有|11 项缺」= 1；`WebView2 运行时` = 0；`Ctrl+Shift+V` 在 README/src/gap 现 0；`浏览器原生键` 现 0。改后 31/10/2、3 处「浏览器原生键」、3 处 `Ctrl+Shift+V`、`Get-FileHash` / `仍要运行` / `SmartScreen` 等期望都自洽（搬行后的两列重排也写了）。
- **首屏与依赖**：T1/T2 都落在主 chunk（估计几百字节），T3 删死码还能回收；余量 18,234 B 足够；无新运行时依赖；`package.json` 版本、`release/`、不 push 都写死。
- **`keyboard-acceptance` 配额自洽**：T1 第 5 步推迟（`plan.md:76`）→ T2 第 4 步跑一次（`:154`）→ §六 串跑一次（`:349`），合计 2 次；「跑完 `git checkout -- shots/round-05/`」三处都写了。

---

## 四、本轮 UNVERIFIED（critic 侧，静态判定）

- **改前红/绿的实读数**：未连 CDP 9222、未跑 `reset.mjs`；T1 的 5 条红、断言 9 改前绿、T3 6a 的 DOM 读数、T2 的合成拖放事件全部未真跑。计划已把「先跑改前基线并留日志」写进 T1/T2（`plan.md:71-72`、`:151`），按它做即可。
- **portal 里 `stopPropagation()` 是否挡住 window 监听**：按 React 监听落在 portal 容器（`document.body`）判断成立，未真跑；计划已给兜底（`plan.md:179`）与判定断言（T2 第 4 条）。
- **`npm test` 本轮实测条数**：预计 372+5=**377**，以输出为准（`README.md:124`/`:162`、`AGENTS.md:39`/`:72`、`plan.md:370-371` 都按它写）。
- **首屏实际增量**：T1/T2 未构建；`npm run verify` 是门。

---

## 五、时间预算（不进编号，残余风险）

- 修完 **R43-9** 后计划仍是 **41 min** > 35 min 门口；§九 四项砍满只有 ≈4 min（`plan.md:427`），理论上仍 ≈**37 min**。计划已明确「全砍完仍超 35 不再砍文档与五处计数」（`plan.md:427`）并在收尾要求「把实际用时写进 impl.md」——按这个口径执行即可，不要再靠压缩验收来换预算。
- T1 的 12 min 仍偏乐观（7 处代码 + 10 条断言 + 改前/改后两份日志 + 2 张截图）；R43-9 把它改成 11 min 也只能算「省了 keyboard 那一次」的账，不改变 T1 本身量级。若 T1 超 15 min，按 `plan.md:417` 砍图片拖入断言是唯一不碰数据安全的刀（R43-12 修好后顺序才自洽）。
- 真正要守的还是文档一致性：R43-6 的搬行已经移出砍单，收尾时 `README.md:87` / `typora-gap.md` 三标题 / `AGENTS.md:74` 与 `README.md:124`/`:162`/`AGENTS.md:39`/`:72` 两组数字必须同值（§六 收尾验收已写，基线 372=2、`测试 29 个文件 372 条`=1 实测可复现）。
