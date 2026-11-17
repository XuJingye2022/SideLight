# 第 38 轮验收报告（tester，独立复验）

- 轮次：round=38；轮前 `startSha=bb52c6a23045042c18a08748547ef796f2e4890f`。
- 只读输入：`round-38/plan.md`（revision=3）、`git diff`、`git status`、源码。**未读 `impl.md`**。
- 执行方式：门禁全部本机实跑；E2E **由 tester 自写三份脚本**（不复用实施期脚本的断言），种子与判据独立。
- 判定：**PASS-WITH-UNVERIFIED**（计划三项全部做完并按验收标准复验通过；未验的是环境测不了的真机项，见 §6）。

## 0. 一句话结论

计划里的 T1 / T2 / T3 三项都做完，且按计划验收标准复验通过：工作区相对路径图片在编辑视图与预览面板都能显示（含换目录、逆向回根、冷源码态），保存字节仍是 `assets/…`；智能标点不再改写含 `|` 的行，空行 `---` 仍出分隔线；列表项 / 引用块里的 mermaid 围栏都渲染。门禁全绿，无回归。

## 1. 门禁（真实命令与输出）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（无输出） |
| `npm test` | **24 个文件、311 条，pass 311 / fail 0**（逐文件条数 10+22+10+15+16+51+11+5+11+16+10+6+16+16+27+12+6+5+6+7+7+7+11+8=311；日志 `.tmp/test-r38.log`） |
| `npm run roundtrip` | `rich: 5/7`、`source: 7/7`（与第 37 轮同；本任务不碰序列化）、exit 0 |
| `npm run build` | exit 0，`✓ built in 460ms`；`dist/assets/index-Vy1SBkVu.js` 901.48 kB / gzip 285.13 kB |
| `node scripts/measure-first-screen.mjs` | `total raw=936669 gzip=289430 headroom=30570 files=3 max=320000` → **PASS**（内部预算 310,000 B，距硬线 320,000 B 余 **30,570 B**） |

首屏与第 37 轮基线 288,411 B 相比 **+1,019 B**，落在计划估算 +1.0～1.4 KB 内；首屏集合仍是 `files=3`，无 `mermaid` / `lazy` / `katex`。

## 2. 计划验收标准逐条复验

### 2.1 静态判据（plan §2 T1/T3 验收 + §5 对照表）

| 命令 | 计划期望 | 实测 | 结论 |
| :--- | :--- | :--- | :--- |
| `git grep -nE "[^A-Za-z]Image\.configure" -- src/App.tsx` | 0 | **0** | ✓ |
| `git grep -n "ResolvingImage.configure" -- src/App.tsx` | 1 | **1**（`App.tsx:768`） | ✓ |
| `git grep -n "ResolvingImage" -- src/` | ≥2 | **2**（`App.tsx:98`、`:768`；定义在未跟踪的 `assetImage.ts`，`git grep` 不搜未跟踪文件） | ✓ |
| `git grep -n "setAssetDocPath" -- src/` | ≥3 | **5**（`App.tsx:1030,1114,2014,4031,4034` + 定义在 `assetResolve.ts`） | ✓ |
| `git grep -n "getResolvedAsset" -- src/` | ≥2 | **2**（`PreviewPane.tsx:5,28,49` 同文件 3 处 + 定义） | ✓ |
| `git grep -n "subscribeResolved" -- src/` | ≥3 | **3**（`PreviewPane.tsx:5,41` + 定义 + `assetImage.ts`） | ✓ |
| `git grep -n "getAssetVersion" -- src/` | ≥2 | **2**（`PreviewPane.tsx:5,41` + 定义） | ✓ |
| `git grep -nE "resolveImage\|assetsVersion\|assetTick" -- src/` | 0 | **0** | ✓ |
| `git grep -nE "startsWith\(space\.name" -- src/` | 1（R2-2 来源校验） | **1**（`App.tsx:4004`） | ✓ |
| `git grep -n "hostModeRef.current" -- src/App.tsx` | 13（改前 12） | **13** | ✓ |
| `git grep -n "lineBefore" -- src/lib/smartTyping.ts` | ≥2 | **5**（`:28,35,59,108,109`） | ✓ |
| `git grep -n "doc.forEach" -- src/lib/mermaidLazy.ts` | 0 | **0** | ✓ |
| `git grep -n "descendants" -- src/lib/mermaidLazy.ts` | 1 | **1**（`:114`） | ✓ |
| `git grep -c "301 条" -- README.md AGENTS.md` | 0 | **0**（exit 1 无匹配） | ✓ |
| `git grep -nE "28 项有\|12 项缺\|已有 28 项\|缺 12 项" -- README.md AGENTS.md` | 0 | **0** | ✓ |
| `Select-String docs\typora-gap.md -Pattern '^## 已经有的（28）','^## 缺的（12）'` | 2 → 0 | **0**；新标题 `（29）` 在 `:7`、`（11）` 在 `:41` | ✓ |
| `Select-String docs\typora-gap.md -Pattern '^### 文件与工作区（2）'` | 1 → 0 | **0**；`（1）` 在 `:59` | ✓ |
| `Select-String docs\typora-gap.md -Pattern '^\d\. 行内 HTML 渲染'` | 1（不许变 2） | **1**（`:88`），下一批仍 3 条 | ✓ |
| `git grep -nE "50000000\|45000000" -- .` | 0（§0.1 本轮不改预算常量） | **0** | ✓ |

### 2.2 T1 端到端（tester 自写 `.tmp/e2e-r38-verify-t1.mjs`，日志 `.tmp/e2e-r38-verify-t1.log`）

独立种子（与实施期脚本不同）：`报告.md`（`assets/main.png`）、`章节/一.md`（`章节/assets/pic.png`，**不同字节的 PNG**）、`内联.md`（data URL）、`缺图.md`、`引用稿.md`（含引用式定义，载入即源码；用一张从未出现过的 `assets/only.png` 保证缓存冷）、`打字.md`。

**37 项断言全过（`failed:0`）**，关键段：

| 段 | 实测 | 判定 |
| :--- | :--- | :--- |
| `V1-root` 先开根文档 | `name:报告.md`、`heading:报告`、`imgCount:1`、`naturalWidth:1`、`srcKind:blob:http://`、`dirty:false` | 编辑视图真的显示出图，且解析不让文档变脏 |
| `V2-cross-dir` 换目录（P1-1 硬判据） | `name:一.md`、`heading:一`、`alt:子图`、`naturalWidth:1`、`srcKind:blob:http://`、`dirty:false` | 换目录后仍显示；`pic.png` 与 `main.png` 字节不同，排除「查错目录也命中缓存」的假绿 |
| `V3-back-root` 切回根 | `name:报告.md`、`heading:报告`、`naturalWidth:1`、`srcKind:blob:http://` | 反向也验；旧 URL 没串到这篇 |
| `V4-bytes` 数据安全 | `报告.md` 保存后 `=== "# 报告\n\n![主图](assets/main.png)\n"`、0 处 `blob:`；`章节/一.md` 同样逐字节等于种子、0 处 `blob:` | 正文与磁盘字节都没被 blob 污染 |
| `V5-single-file` R2-2 锁 | 工作区同开时 `Ctrl+Alt+O` 打开同名独立文件 → `name:报告.md`、`heading:独立`、`naturalWidth:0`、`srcKind:assets/main.`、`errors:[]` | **没有**显示工作区那张图（要求 0，实测 0） |
| `V6-inline` | `内联.md` `naturalWidth:1`、`srcKind:data:image/p` | data URL 图未受影响 |
| `V7-missing` | `缺图.md` `naturalWidth:0`、`errors:[]`、随后键入「续」成功 | 缺文件不抛错、不刷控制台错误 |
| `V8-preview` | 编辑 → `Ctrl+Shift+P` → `previewCount:1`、`naturalWidth:1`、`srcBlob:true` | 预览面板也能显示 |
| `V9-preview-from-source`（R2-3） | 开 `引用稿.md` → `viewMode:source`、`editorMounted:false` → `Ctrl+Shift+P` → `previewCount:1`、`naturalWidth:1`、`srcBlob:true`、`heading:引用稿` | 源码态没有 NodeView，预览靠自己解析也显示 |
| `errors` | `[]`（console error 与 pageerror 都 0） | ✓ |

补充脚本 `.tmp/e2e-r38-verify-imgops.mjs`（NodeView 不破坏图片操作）：`draggable="true"` 由 PM 写在 NodeView 的 DOM 上；点一下 `ProseMirror-selectednode` = 1；`Delete` 后图片 0 张；`Ctrl+Z` 恢复 `imgs:1 / naturalWidth:1 / blob:true`。
**该脚本第 4 条断言是 tester 自己写错**：它读 `.ProseMirror` 的 `innerHTML` 找 `blob:`，而 NodeView 本来就是换 DOM 的 `src`，所以 `innerHTML` 里当然有 `blob:`。这不是产品缺陷——节点属性与落盘字节的正确性由 `V4-bytes`（逐字节等于种子、0 处 `blob:`）判定。记在此处，避免下一个人误读。

### 2.3 T2 端到端（同一份脚本 `.tmp/e2e-r38-verify-t2t3.mjs`）

在 `打字.md` 末尾真实键入 `| 甲 | 乙 |` → Enter → `| --- | --- |`：

| 断言 | 实测 | 判定 |
| :--- | :--- | :--- |
| 分隔行原样保留 | 段落文本 `| 甲 | 乙 |\n| --- | --- |`，`text.includes('| --- | --- |')` = true | ✓（改前会变成 `| —- | —- |`） |
| 0 处 `—-` | 全文 `!text.includes('—-')` = true | ✓ |
| 空行打 `---` 仍出分隔线 | `hrCount` 由 `0` → `1` | ✓（新分支返回 `null`，HR 输入规则照常收到输入） |
| 分隔行仍在 | `| --- | --- |` 仍在 | ✓ |

单测侧：`smartTyping.test.ts` 新增 3 条（含 `|` 不改写 / 普通行仍换破折号 / 第三根 dash 不连吞），现有 8 条未改，`npm test` 该文件 11 条全过。

### 2.4 T3 端到端（同一份脚本）

| 段 | 文档 | 实测 | 判定 |
| :--- | :--- | :--- | :--- |
| `T3-nested-list` | `清单.md`（列表项内两个空格缩进围栏） | `previewCount:1`、`readyCount:1`、`svgCount:1`、`errorCount:0`；`pre.textContent` = `graph LR\n  P --> Q` | ✓ |
| `T3-nested-quote` | `摘录.md`（引用块内围栏） | `previewCount:1`、`readyCount:1`、`svgCount:1`、`errorCount:0`；代码原文 `graph TD\n  M --> N` | ✓ |
| `T3-top-level` | `直围栏.md`（顶层围栏，P2-3 回归） | `previewCount:1`、`readyCount:1`、`svgCount:1`、`errorCount:0`；代码原文 `graph TD\n  U --> V` | ✓ |

三篇代码块原文逐字不变（widget 是装饰）；`errors:[]`。

### 2.5 单测（新文件 `src/lib/assetResolve.test.ts`）

5 条 `test()`，与计划 §2 T1 的单测要求逐条对上：① `isRelativeAsset` 正反例（含 `./assets`、`data:`/`blob:`/`https:`/`http:`/`file:`/空串/`null`）；② 无 resolver 返回 null 不抛；③ 失败不缓存（连调两次 resolver 被调 2 次）；④ 同 src 并发只解析一次 + 换文档后旧在飞结果不写进新缓存（epoch）；⑤ 版本号只在成功/清缓存时 +1、缓存命中不通知不涨版本。

## 3. 回归（与本轮相关的既有脚本）

| 脚本 | 结果 | 说明 |
| :--- | :--- | :--- |
| `scripts/keyboard-acceptance.mjs` | **52/52 PASS**（exit 0） | 打字/快捷键/预览/Esc/保存失败 alert 全过；改过智能标点，这条最相关 |
| `scripts/session-acceptance.mjs` | **18/18 PASS**（exit 0） | 宿主重开、工作区恢复、Ctrl+S 落根目录都不受影响 |
| `scripts/tree-acceptance.mjs` | **54/56 PASS**（exit 1） | 2 条失败与第 34 轮 `test.md:100-101` 记录的同两条完全一致：`外部删除后 Ctrl+S 不写原路径`、`大纲顶与页签底对齐`（`outlineTop:133.5 / tabsBottom:120`）。**都是旧脚本断言过期，本轮未碰文件树与布局**，不记回归 |

跑完已把脚本覆盖的历史截图还原：`git checkout -- shots/round-05 shots/round-16`（`keyboard-acceptance` 覆盖 `shots/round-05/t1-shortcuts.png`，`tree-acceptance` 覆盖 `shots/round-16/` 4 张）。

## 4. 与计划的偏差（都不构成失败，如实记录）

1. `src/App.tsx` 的预热 effect 多了一行计划里没有的 `if (viewMode !== 'edit') return`（非编辑视图不预热）。影响：源码/预览态下缓存靠 `PreviewPane` 自己发起解析。已由 `V9-preview-from-source` 证明冷源码 → 预览仍显示（`naturalWidth:1`），不构成缺陷。
2. 实施期 `## img-preview-from-source` 用的是另一篇同型文档（`引用2.md`）。tester 用自建的 `引用稿.md` + 从未出现过的 `assets/only.png` 复验，同样在 `editorMounted:false` 的冷态下显示成功，说明不是靠「这本篇图早被解析过」蒙过的。
3. `package.json` 只改了 `test` 脚本（新增 `assetResolve.test.ts`），版本仍是 0.32.1，符合计划「不 bump」。

## 5. 文档一致性（PASS 后收尾时已核对）

- `docs/typora-gap.md`：`## 已经有的（29）` / `## 缺的（11）` / `### 文件与工作区（1）`；「工作区相对路径图片显示」已从缺表移进已有表并写明限制（单文件打开与 HTML 导出仍显示不了）；`:88-91` 下一批重排成 3 条，`：84` 标题与 `:86` 引导句未动。
- `README.md`：`:46` 能力句、`:76` 限制句、`:78` 智能标点限制、`:82` 29/11、`:119` `24 个文件、311 条断言`；`:100` 首屏数字由 tester 更新为 **289,430 B / 余 30,570 B**（并补第 38 轮 +1,019 B 那一句）。
- `AGENTS.md`：§3 测试条数注释与 §6「测试 24 个文件 311 条」「29 项有、11 项缺」；§6 首屏 `289,430 B / 余 30,570 B`。
- `docs/CHANGELOG.md`：`## Unreleased（第 29–38 轮）` + 「第 38 轮（同一未发版区间）」小节，写 T1/T2/T3 与 UNVERIFIED。
- `docs/adr/0017-mermaid-lazy-loading.md`：已知限制补一行（嵌套围栏已渲染，只剩 b 半）。

## 6. UNVERIFIED（本轮仍测不了，别当回归）

| 项 | 为什么测不了 | 怎么补 |
| :--- | :--- | :--- |
| 真实文件夹句柄与权限三态 | CDP 里跑的是 `.tmp/r30-fsa.mjs` 假 FSA，`queryPermission` 恒 `granted` | 真人打开一个真文件夹，放一张 `assets/` 图，看 `blob:` 与 `naturalWidth` |
| 宿主（WebView2）单文件打开时的相对路径图片 | 宿主只给 `/__doc`，没有目录句柄；本轮只做浏览器/FSA 路径（按设计返回 null，不显示错图） | 宿主轮加 `/__asset` 路由 + `host-smoke` 一条显示断言 |
| 宿主内 NodeView 的图片选中/拖拽 | 只在浏览器里验（`draggable="true"`、点选、Delete、Ctrl+Z） | 宿主轮 `host-smoke` 加一条 |
| **插入图片后立刻显示** | 假盘 `createWritable().write()` 把 `Blob` 当 UTF-8 文本写，真 PNG 一落盘就坏，读回必假失败（假盘问题，不是产品） | 真人拖一张图进工作区文档；或把假盘 `write()` 改成按 `image/*` 存 `Uint8Array`（约 +8–10 分钟） |
| 真实中文输入法下含 `|` 行的 `--` 处理 | 无真人输入法自动化；只用 `keyboard.type` 造键 | 真输入法里打一行 `| --- | --- |` 复核 |
| 打字 → 保存 → 重开是否被解析成表格 | 本轮只锁「输入不被改写」 | 单独一条 E2E：保存后重开看 `.ProseMirror table` 数量 |
| 大量图片（>50 张）的 blob 内存与切文档 revoke | 假盘只放 1–2 张 | 真人放 50 张来回切文档，看 `performance.memory` 与破图 |
| 暗色主题、150%/200% 缩放下的图片与预览面板 | 只在当前主题/100% 下测 | 主题回归时同批 |
| 真实盘/网络盘读 `assets/` 的失败路径 | 假盘不外抛（只测到「文件不存在 → null 不报错」） | 与既有网络盘项同批 |
| T3 在正式包（非 dev server）里的首次下载与叠加 | 只在 dev server 里验（首次加载 mermaid 会触发 Vite 依赖重优化 + 整页 reload，dev-only） | `npm run build` 后打开含嵌套图的文档看一次 |
| Mermaid b 半：两段相同代码的 SVG id 按实例唯一 | 计划 §7 第 1 条明确本轮不做 | 下一轮第一件事，规格见 round-37 `plan.md` §T2 |

## 7. 证据文件

- E2E（tester 自写）：`.tmp/e2e-r38-verify-t1.mjs` / `.log`、`.tmp/e2e-r38-verify-t2t3.mjs` / `.log`、`.tmp/e2e-r38-verify-imgops.mjs` / `.log`
- 回归日志：`.tmp/reg-r38-tree.log`、`.tmp/test-r38.log`
- 截图：`shots/round-38/`（本轮实施期 6 张 + tester 的 `verify-t2-t3.png`、`verify-image-editor.png`）
