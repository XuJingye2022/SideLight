# 第 40 轮 tester 独立验收（首次验收）

- 轮次：40 · 轮前 `startSha=504dedd22b1133c7629bc1a437ca24b8a8889322` · 报告目录 `docs/iteration/round-40/` · CDP 9222 · dev server `http://localhost:5175`（未重启）
- 输入：`docs/iteration/round-40/plan.md`（revision=2）、`findings-*.md` 未读（按角色只读 plan 与 diff；`impl.md` 未读）、`git diff` / `git status`、既有脚本。
- 结论：**PASS-WITH-UNVERIFIED**（门禁全绿、三条任务的验收标准逐条自跑通过；未测项见 §6）。三条任务全部交付，`[toc]` 余量项按计划 §5 第 1 步整条顺延。无回归。

## 1. 门禁（全部自跑，贴真实输出）

| 命令 | 输出 | 判定 |
| :--- | :--- | :--- |
| `npx tsc --noEmit` | `exit 0`（无输出） | PASS |
| `npm test` | **27 个文件 345 条，`fail 0`**（日志 `.tmp/tester-r40-npm-test.log`；`ℹ tests` 求和 345，`ℹ fail` 共 27 行全 0） | PASS |
| `node --experimental-strip-types src/lib/tilde.test.ts` | 13/13 pass | PASS |
| `… src/lib/html.test.ts` | 13/13 pass（既有 10 + 新增 3） | PASS |
| `… src/lib/blankParagraphs.test.ts` | 9/9 pass | PASS |
| `… src/lib/escapes.test.ts` | 6/6 pass（余量项 `[toc]` 未做，无新增） | PASS |
| `npm run roundtrip` | `rich: 5/7 完全保真`、`source: 7/7 等值`、`firstSaveBlocked: 1/7`、exit 0 | PASS |
| `npm run build` | tsc + `vite build` `✓ built in 483ms`，exit 0 | PASS |
| `node scripts/measure-first-screen.mjs` | `total raw=939993 gzip=290723 headroom=29277 files=3 max=320000`、`target=310000 gap=19277`、**PASS** | PASS |

- 版本：`package.json` 仍 `0.32.1`（本轮计划不发版，未 bump）。
- 首屏比第 39 轮 +702 B（290,021 → **290,723 B**），距内部 310,000 余 19,277 B、距硬线 320,000 余 29,277 B。
- `npm test` 新增 27 条：`tilde.test.ts` 13 + `blankParagraphs.test.ts` 9 + `html.test.ts` +3 + `escapes.test.ts` 0（余量项顺延）。320 + 27 = 345，与输出一致。

## 2. T1 单波浪号 + HTML 注释（P1）

### 2.1 单测（计划验收 1）

- `src/lib/tilde.test.ts` **13 条全过**（计划要求 ≥13）：单 `~` 不成删除线、`~~…~~` 仍是删除线、正文 `\~`→`~`、`~~~`/反引号围栏、行内代码、围栏里 `~2~`、未闭合 `~~abc`、链接文字、重复注册、引用块围栏（含嵌套）、行内公式 `\~` 与 `\~{n}`、`$$` 块、价格写法 `$5 到 $10` 不是公式。
- `src/lib/html.test.ts` **13 条全过**：既有 10 条（含 `a &lt; b` 不还原、往返断言）+ 新增 3 条（围栏里的字面实体、正文里的字面实体、真注释与 DOCTYPE）。
- `escapes.test.ts` 6/6（`repairToc` 未出现：`git grep -n -i repairToc -- src` → 0 命中，余量项整条未做，无半做状态）。

### 2.2 改前/改后对照（计划验收 2，有牙）

自写 `.tmp/tester-r40-chain.mjs`：改前 = `504dedd` 的链（旧 `repairHtml` 正则 + 无 `repairTildes` + 无 `collapseBlankParagraphs` + 无 marked 行内扩展），改后 = 当前 `src/lib/*.ts` 真实模块。输出：

```
## T1-a 单波浪号（H~2~O 保存后不改成 ~~2~~）
    H~2~O: 改前=DIFF 改后=PASS
    改前实际 "# 标题\n\nH~~2~~O 与 ~~删除线~~。\n"
## T1-b HTML 注释（<!-- --> 保存后不被转义）
    注释: 改前=DIFF 改后=PASS
    改前实际 "# 标题\n\n&lt;!-- 给编辑看的备注 --&gt;\n\n正文。\n"
## T1-c 字面实体三条 SAME
  围栏里的字面实体: SAME
  正文里的字面实体: SAME
  行内代码里的字面实体: SAME
```

**两条 DIFF → 两条 PASS + 三条 SAME**，与计划验收 2 一致；不只贴改后。

### 2.3 应用内 E2E（计划验收 3）

自写 `.tmp/tester-r40-t1.mjs`（假工作区 `installFakeWorkspace`，真 `Ctrl+S`）。种子逐字节 = `# 标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。\n`。输出：

```
## t1-dom {"strikeCount":1,"strikeText":["删除线"],"body":"标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 删除线 与 X^2^。\n\n末尾段。","sub":null,"title":"样张.md — Sidelight"}
## t1-dirty {"dirty":true}
## t1-source "# 标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。改\n"
## t1-saved  "# 标题\n\n<!-- 给编辑看的备注 -->\n\nH~2~O 与 ~~删除线~~ 与 X^2^。\n\n末尾段。改\n"
## t1-saved-equal-want true
## t1-assert {"hasSingleTilde":true,"hasComment":true,"escapedCommentCount":0,"doubledTildeCount":0,"strikeInSource":true}
## t1-errors {"errors":[],"failed":[]}
```

- 用 `.ProseMirror s` 不是 `del`（计划 H4）：`strikeCount = 1`、`textContent = 删除线`，`H~2~O` 的 `2` 不在 `<s>` 里。
- 源码态（富文本 `dirty:true` 后）显示序列化结果，含 `H~2~O`、`<!-- 给编辑看的备注 -->`，**0 处** `&lt;!--`、**0 处** `~~2~~`。
- 真保存字节**逐字节等于**「种子把 `末尾段。` 换成 `末尾段。改`」；控制台 0 error、0 requestfailed。
- 截图：`shots/round-40/p1-tilde-comment.png`、`p1-source-bytes.png`。
- `[toc]` 可选断言未加（余量项顺延，按 H10）。

### 2.4 计划偏差（不影响判定，需记 STATE）

- **`disableSingleTildeStrike` 的实现机制与 plan revision=2 不同**：计划写「覆盖 marked 的 `del` tokenizer、`return false`」，实现是 `manager.instance.use({ extensions: [{ name:'loneTildeText', level:'inline', start, tokenizer }] })`，把「不成对的单个 `~`」当 `text` token（`src/lib/tilde.ts:13-33`），注释解释「`use()` 是包装不是覆盖，`return false` 会落回基础规则」。
- 我按行为复验了这套机制：13 条单测 + 自写边界探针（`.tmp/tester-r40-tilde-edge.mjs`）：
  - `a~b~c` / `温度 25~ 度。` / `**粗 ~1~ 体**` / 引用块 `~~删~~` 均无假删除线且字节不变；`~~a~~ 与 ~~b~~` = 2 个删除线；`a~~~b~~~c` 原样；`` `~` `` 原样；公式 `$a ~ b$` 的 `~` 仍被序列化器转义（计划已声明不修）。
  - **同一进程里第二个 `MarkdownManager` 再装一次不抛错**（`## 第二个 manager 错误: null`），输出与 strike 数正确——`WeakSet` 去重只按 manager，但 marked 侧重复 `use` 未报错。
  - 计划风险①的「代码里仿围栏造成提前闭合」未复测（不在本轮范围）。
- 判定：行为验收全过；机制差异本身不是缺陷，但**与计划 H3 的写法说明不符**，建议根代理在 STATE 下一轮记一句，决定是否把计划文档订正为「行内扩展」写法。

## 3. T2 只读预览排版 + 字数明细面板（P1）

自写 `.tmp/tester-r40-t2.mjs`（样式文档：h1 / p / 引用 / 表格 / 列表；1440×900 与 1024×700 两档），`##` 原始输出（截关键字段）：

- 1440 预览：`docLayouts:1`；`.preview-layout .preview-column` **width 576**；`.preview-pane h1` `fontFamily` = `"Source Han Serif SC", "Noto Serif SC", …`、`fontSize 31.45px`、`lineHeight 42.4575px`（比值 **1.35**）；`.preview-pane p` **17px / 33.15px**（与编辑态同值）；`table` **width 576**；`th` `borderWidth 1px`、`backgroundColor rgb(232, 240, 237)`；`blockquote` `borderLeftWidth 2px`、`paddingLeft 16px`。
- 编辑态对照：`editorClass` = `tiptap ProseMirror editor doc-body ProseMirror-focused`（`.editor` 保留）、`editorCount 1`、h1 31.45/42.4575、p 17/33.15 —— 与 findings 的 `TYPO` 一致，未回归。
- 1024 预览：`.preview-column` **576**；`scrollWidth 1024 === clientWidth 1024`（无横向溢出）；`scrollHeight 700 === clientHeight 700`（`padding-bottom:0` 未撑出多余滚动）。
- 字数明细：1440 下 `.stats-detail` **360×325.31**（findings 是 941×285）；1024 下 **360×325.31**；`role="dialog"`、`aria-label="字数明细"`；Esc 关闭后焦点回 `.stats-trigger`（`## t2-stats-esc {"open":false,"focusClass":"stats-trigger"}`）。
- 模式切换不回归：`Ctrl+F` 打开查找 → 一个 Esc 关闭且焦点回正文（`{"findOpen":false,"inEditor":true}`）；`Ctrl+/` 进源码 → Esc 退出且焦点回正文（`{"source":false,"inEditor":true}`）。
- 控制台 0 error。
- 截图：`p2-preview-light.png`、`p2-preview-1024.png`、`p2-edit-unchanged.png`（3 张，按 H6）。
- 深色预览未量测（计划 §6 已声明 UNVERIFIED）。

## 4. T3 `&nbsp;` 空段落 + 标题跟随当前文档（P2）

### 4.1 单测与形状对照

- `blankParagraphs.test.ts` **9 条全过**（计划要求 ≥8；含开头/中间 x2/x3、末尾 3 个换行、无 `&nbsp;` 多空行原样、反引号与 `~~~` 围栏、围栏内字面 `&nbsp;`、用户手写 `&nbsp;` 段落、脚注块、普通文档）。
- 自写 `.tmp/tester-r40-chain.mjs` 的改前/改后（同 §2.2 的改前链，只是不 collapse）：
  - `start x2/x3`：改前 DIFF（`"\n\n&nbsp;\n\n# 标题…"`）→ 改后 PASS（`"\n\n# 标题\n\n正文。\n"`）；`middle x2/x3`：改前 DIFF（`"# 标题\n\n\n\n&nbsp;\n\n正文。\n"`）→ 改后 PASS（`"# 标题\n\n\n\n正文。\n"`）。
  - `start/middle x1` 与 `end x1/x2/x3`：改前=改后（尾部空段落本来由 `applyTrailingNewlines` 收，非本轮变化）。
  - 改后三种位置 x1–x3 **二次保存全部 stable**。
  - 不该动的字节：无 `&nbsp;` 的 `# 标题\n\n\n\n正文。`、围栏内 4 空行、脚注块内 `\n\n\n` **改前=改后=SAME**；用户手写 `&nbsp;` 段落的整链往返改前=改后都 DIFF（第 22 轮起既有行为，非本轮回归；纯函数单测锁住「不删」）。

### 4.2 应用内 E2E（假工作区，真 `Ctrl+S`）

自写 `.tmp/tester-r40-t3.mjs`，输出：

```
## t3-dom-start {"children":["P:","P:","H1:标题","P:正文。"],"dirty":true}
## t3-saved-start "\n\n# 标题\n\n正文。\n"
## t3-start-assert {"equalsOnlyEnterShape":true,"noNbsp":true}
## t3-source-start "\n\n# 标题\n\n正文。\n"
## t3-saved-start2 {"text":"\n\n# 标题\n\n正文。\n","stable":true}
## t3-dom-middle {"name":"丙.md","children":["H1:标题","P:","P:","P:正文。"]}
## t3-saved-middle "# 标题\n\n\n\n正文。\n"
## t3-middle-assert {"equalsShape":true,"noNbsp":true}
## t3-fence {"same":true,"saved":"```\nA\n\n\n\n\nB\n```\n"}
## t3-footnote {"same":true,"saved":"正文[^1]。\n\n[^1]: 第一段\n\n\n    第二段\n"}
## t3-title-before-rename "键.md — Sidelight"
## t3-title-after-rename "键改.md — Sidelight"
## t3-title-switch {"title":"乙.md — Sidelight","docName":"乙.md"}
## t3-title-new {"title":"未命名.md — Sidelight","docName":"未命名.md"}
## t3-errors {"errors":[],"failed":[]}
```

- 文首双击 Enter：DOM 有 2 个空段落（`P:`×2），保存后 **0 处 `&nbsp;`**、字节 = 只按一次 Enter 的形状；从磁盘重开再保存**字节相同**（二次保存 stable）。
- 中间（标题与正文之间）：字节 = `"# 标题\n\n\n\n正文。\n"`（计划验收 2 的期望值），0 处 `&nbsp;`。
- 围栏 4 空行、脚注块 `\n\n\n` **整篇逐字节等于种子**。
- 标题：`键.md` → 改名 `键改.md` → 打开 `乙.md` 后 `乙.md — Sidelight`（改前是 `键改.md — Sidelight`，findings `## d22-switch-title`）；`Ctrl+N` 在 CDP 下被浏览器吞掉，改走「文件」菜单「新建」（同一 handler）→ `未命名.md — Sidelight`，`.doc-name` 与标题前缀一致。
- 控制台 0 error、0 requestfailed。截图：`p3-empty-paragraph-fixed.png`（源码态无 `&nbsp;`）、`p3-title-follows-doc.png`。

### 4.3 死代码（计划验收 4）

- `git grep -n 'document\.title' -- src` → **1 处**（`src/App.tsx:721` 新 effect）；改前 `504dedd:src/App.tsx` **5 处**（`.tmp/tester-old-App.tsx` 的 `Select-String` 计数 = 5）。
- `Select-String -Path src/App.tsx -Pattern 'show\(.已新建 \$\{name\}'` → **1 行**（`src/App.tsx:2518`）；改前同口径 **2 行**（`.tmp/tester-old-App.tsx:2512`、`:2513`）。
- `host-save-acceptance.mjs` 三条断言已改成 `${docName} — Sidelight`（diff 已核，`stateOf` 同时返回 `title` 与 `docName`），实跑全部 PASS（见 §5）。

## 5. 回归（既有脚本，自跑）

| 脚本 | 结果 | 判定 |
| :--- | :--- | :--- |
| `draft-acceptance.mjs` | **57/57 PASS** | 无回归（App.tsx 300 ms 草稿链改动覆盖） |
| `rename-acceptance.mjs` | **22/22 PASS** | 无回归（标题单源后仍与 `__slState`/顶栏同步） |
| `keyboard-acceptance.mjs` | **52/52 PASS** | 无回归（跑完已 `git checkout -- shots/round-05/`） |
| `fidelity-acceptance.mjs` | **19/19 PASS** | 无回归（跑完已 `git checkout -- shots/round-10/`） |
| `tree-acceptance.mjs` | 54/56（exit 1） | **2 条已知过期断言**（与第 34 轮 `test.md:100-101` 完全相同）：`外部删除后 Ctrl+S 不写原路径`、`大纲顶与页签底对齐 (outlineTop:133.5 / tabsBottom:120)`。本轮未碰文件树与布局，不记回归；跑完已还原 `shots/round-16/` |
| `save-acceptance.mjs` | 24/25（exit 1） | **1 条过期断言**：`提示含「已保存」与文件名` 期望 `示例 · 未命名.md`，实际 `已保存 未命名.md`。脚本写于第 4 轮（`git log -S '示例 · 未命名'` → `11c3348` round-04），首启示例文档后来被移除（AGENTS §8「首次启动不要加载示例文档」），属脚本前提过期；断言的意图（含「已保存」+ 文件名）成立，不记回归 |
| `host-save-acceptance.mjs http://localhost:5175 browser` | 49/50（exit 1） | **1 条过期断言 + 本轮 3 条新断言全过**：失败项 `不改 Ctrl+S：没有发 save 消息 (1)`，日志 `.tmp/tester-r40-hostsave-probe.mjs` 打印到的唯一消息是 `{"type":"annotations-save","text":"{\"v\":2,\"annotations\":[],\"notes\":[]}"}`（载入时写空批注 store），**没有 `save` 消息**（同一脚本的 `不改 Ctrl+S：提示「没有改动，未写入」` PASS）。该检查按 `messages.length` 计数、未用脚本自带的 `saves()` 过滤，属脚本口径问题；`404/超过 6 MB/保存中切文档：标题跟随当前文档名` 3 条新断言全部 PASS。跑完已 `git checkout -- shots/round-06/` |

- 所有跑的脚本都在每次前 `node .tmp/reset.mjs 9222`，结束后 `git status --porcelain | Select-String 'shots/'` 只剩 `?? shots/round-40/`。
- `draft` 与 `host-save` 的宿主段按脚本自身 `SKIP`（CDP 下不开宿主），与本轮无关。

## 6. UNVERIFIED（本轮测不了 / 未测）

1. **宿主窗口标题**：`host/Program.cs` 没有 `document.title → Form.Text` 同步，本轮只验浏览器标签。
2. **真机写回（BOM/CRLF/文件占用/网络盘）**：E2E 用假 FSA 句柄 + 源码态字节；未在宿主/真磁盘上验。
3. **多行 HTML 注释**（`<!--\n…\n-->`）、**注释内含 `&`**：计划声明不修，未验证修复。
4. **同一段文字既写真注释又用同一段文字讲转义**：`original` 是全篇 `includes`，计划已声明该边界仍 DIFF，未复测。
5. **列表项里的围栏、代码内容含仿围栏行、4 空格缩进代码块**：不在本轮范围。
6. **1 MB 文档的 `mapOutsideCode` 耗时**：未测。
7. **公式里的 `~` 仍被序列化器转义成 `\~`**：计划声明不修；自写探针复现（`$a ~ b$` → `$a \~ b$`）。
8. **深色主题下的预览排版**：只截浅色 1440 与 1024，深色未量测。
9. **真机 125%/150%/200% 缩放、真实 IME 组合输入、屏幕阅读器实录、macOS 真机**：与第 38/39 轮一致。
10. **生产包口径运行**：只验 `vite build` 的 gzip 门与 dev server E2E。
11. **`disableSingleTildeStrike` 的机制与计划不同**（见 §2.4）：行为已复验；未在 1 MB 文档、频繁切换文档等压力路径下量重复 `use()` 的累积开销。

## 7. 交付物与状态

- 未提交前 `git status --porcelain`：10 个已跟踪文件改动（`docs/CHANGELOG.md`、`package.json`、`scripts/host-save-acceptance.mjs`、`src/App.tsx`、`src/components/PreviewPane.tsx`、`src/components/StatsDetail.tsx`、`src/lib/html.test.ts`、`src/lib/html.ts`、`src/lib/serializeDocument.ts`、`src/styles.css`）+ 6 项未跟踪（`docs/iteration/round-40/`、`shots/round-40/`、`src/lib/{blankParagraphs,blankParagraphs.test,codeScan,tilde,tilde.test}.ts`）。
- 截图（计划 7 张，均已由本轮 tester 脚本重拍）：`p1-tilde-comment.png`、`p1-source-bytes.png`、`p2-preview-light.png`、`p2-preview-1024.png`、`p2-edit-unchanged.png`、`p3-empty-paragraph-fixed.png`、`p3-title-follows-doc.png`；`p1-toc.png` 未生成（`[toc]` 顺延）。
- 顺延项（写进 STATE 下一轮）：`[toc]` 整行还原；T2 的深色预览量测；§2.4 的机制差异订正；`repairHtml` 的多行注释/`&`/同文碰撞；`code#1` 1 MB parse 归因（第 39 轮遗留）；`tree-acceptance` 两条、`save-acceptance` 一条、`host-save-acceptance` 一条过期断言的修法（本轮只判定不修）。
