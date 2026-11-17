# 第 40 轮 · 代码质量与性能（finder-code）

- 轮前 startSha：`504dedd22b1133c7629bc1a437ca24b8a8889322`（本轮只读产品代码，未改 `src/`）
- 环境：dev server `http://localhost:5175`（沿用，未重启）；CDP 9225（Edge 157）；每次 E2E 前跑过 `node .tmp/reset.mjs 9225`
- 结论：**1 条 P1、5 条 P2，共 6 条**。最重要的一条：把第 39 轮 UNVERIFIED U1 的「1 MB 多段落载入 220 s」归因完成——**98.6% 的时间在 `setMarkdown` 的 parse 阶段，dispatch/serialize/sync 合计只有 185 ms**
- 中途 CDP 9225 在跑完 1 MB 样本与一次 Profiler 之后无法再建连接（见 U1），导致「100 KB 保存/源码切换」这条路径本轮没跑完，如实记在 UNVERIFIED

---

## F1（P1）多段落长文载入 222 s 全部在 parse 阶段；parse 耗时随段数超线性增长（≈ n^2.2）

证据：`.tmp/e2e-r40-code-load.mjs`、`.tmp/r40-load.log`、`.tmp/perf-round40-load.json`

样本 6 个，全部真跑 dev server（reload 后等 `sl-sync-done` 埋点）。F 样本：**1,011,159 字符 / 2,883,671 B（UTF-8） / 37,450 段**，总墙钟 **222,472 ms**（与第 39 轮 `.tmp/r39-1mb-multi.log` 的 219,828 ms 一致）。

单遍分段（dev 埋点，取同 name 最后一条；StrictMode 跑两遍，见 F2）：

| 样本 | 段数 | 字符 | load-start→parse-done | parse→dispatch | dispatch→serialize | serialize→sync | 单遍合计 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | 1（软换行） | 102,400 | **4.8 ms** | 2.8 | 0.9 | 2.2 | 10.7 ms |
| B | 1,000 | 102,009 | **143.6 ms** | 7.8 | 5.2 | 3.0 | 159.6 ms |
| C | 10,000 | 100,009 | **5,396 ms** | 27.7 | 16.7 | 3.6 | 5,444 ms |
| D | 2,000 | 204,009 | **555.1 ms** | 10.5 | 4.7 | 5.2 | 575.5 ms |
| E | 4,000 | 408,009 | **2,181 ms** | 11.7 | 9.7 | 7.3 | 2,209.7 ms |
| F | 37,450 | 1,011,159 | **108,501 ms** | 98.9 | 59.4 | 27.3 | 108,686.9 ms |

- F 的第二遍（StrictMode 第二次 effect）：load-start→parse-done **109,750 ms**，单遍合计 111,718 ms；两遍相加 = 222,472 ms，与总墙钟对得上
- 段数翻倍、单遍 parse 涨 3.9 倍（B→D 143.6→555.1，D→E 555.1→2,181），F 相对 C 段数 ×3.7、parse ×20.1 → 约 **n^2.2**，不是线性
- **dispatch / serialize / sync 三段在 37,450 段上合计 185 ms**：排除「整篇替换」和「全文序列化」。第 39 轮 F4 的「载入两次序列化」已修（见本报告末「上轮 6 条现状」），serialize 只剩 59 ms 也侧证了这一点
- 代码路径：`src/App.tsx:984-986`
  `manager.parse(escapeHtmlForParse(protectMathPairs(body)))` → `splitTableCellBreaks` → `schema.nodeFromJSON`
- 已排除的两个字符串前置：`protectMathPairs`（`src/lib/math.ts:18-22`）与 `escapeHtmlForParse`（`src/lib/html.ts:21-23`）都是单次 `String.replace`，线性；且 A 样本（同样 100 KB）只需 4.8 ms
- 剩余热区在 `@tiptap/markdown@3.34.0` 的 `parse`（`node_modules/@tiptap/markdown/dist/index.js:568-582`）：`marked` 的 `Lexer.lex` + `parseTokens`（同一文件 586-607）。可疑点：`isParagraphContinuation`（同一文件 466-477）**每行新建两个 Lexer**；但本轮 Profiler 没跑成（U2），所以只到「parse 阶段」为止，没有把 lexer 与 parseTokens 拆开
- 可达性：5.5 MiB 上限内（用户打开或粘贴一份 1 MB、三万多个自然段的长稿即可命中），期间窗口 ~1.8 分钟不响应（单遍 108.5 s），且 **0 反馈**（无进度、无 toast、无控制台错误）

提案（低风险、可度量）：
1. 在 `setMarkdown` 里补 3 行 dev 埋点，把 parse 阶段再拆成 `protectMathPairs+escapeHtmlForParse` / `manager.parse` / `nodeFromJSON` 三段（能直接判定要不要动第三方库），先量后改
2. 升级 `@tiptap/markdown` 前，在 Node 里用同一份样本比 `MarkdownManager.parse` 耗时（`scripts/roundtrip.mjs` 已有现成 `MarkdownManager` 装配），升级后跑 `npm run roundtrip` 对比 parse 毫秒
3. 低风险 UX：段数超过 2,000 时先显示「正在打开…」（当前 108 s 内 0 反馈）。不改解析路径，只加状态

## F2（P2）dev 下每次载入跑两遍：222 s 里 109 s 是重复工作，性能基线必须按「单遍」记

- 证据：F1 表；`performance.getEntriesByName` 每个 name 的 `count` 都是 2（A–F 全部）；两遍 parse 108,501 ms / 109,750 ms
- 机理：`src/main.tsx` 用 `<StrictMode>`，载入 effect（`src/App.tsx:1009-1030` 与 `2040-2095`）挂载时执行两遍。生产构建只跑一遍
- 影响：把 222 s 直接写进基线，会高估一倍；反过来只测单遍，又会低估真机首启。建议报告统一写「单遍 X ms，dev 两次 = 2X」
- 提案：`docs/iteration/STATE.md` 的性能基线注明口径；若要 dev 只跑一遍，可在载入 effect 里用 `import.meta.env.DEV` 的 once-ref 挡住第二次（会掩盖真实行为，不如只改口径）

## F3（P2）每键仍做一次全文序列化（第 39 轮 F3 未修）

- 代码：`src/App.tsx:880-888`
  `onUpdate` → `contentRef.current()`（`src/App.tsx:2777-2786` `currentMarkdown`）→ `serializeDocument`（`src/lib/serializeDocument.ts:48-61`：`getMarkdown` + 4 个 repair 正则 + `reuseTables` + 脚注/frontmatter 拼接）→ 与 `baselineRef.current` 做字符串全等
- 计时：100 KB 文档同步 `input` 处理第 39 轮实测 p50 **14 ms** / p95 20.2 / max 36.9；1 MB（文首）55–250 ms。本轮 100 KB 复测没跑成（U1）
- 提案（低风险）：脏判断别字符串化整篇。保存成功时记 `editor.state.doc` 的版本（`contentVersionRef` 已有，`src/App.tsx:626`），撤销回原样用版本/结构比较；只在实际保存时序列化一次。风险：口径从「字节相等」换成「结构相等」，必须补一条单测（撤销回原样 → `dirty:false`）

## F4（P2）一次保存周期最多 3 次整篇 localStorage 写；有文件句柄时仍在写

- 代码：
  - `src/App.tsx:897-910`：300 ms 派生计时器，每次暂停打一次 `persistDocKey(draft)`（全文，≤256 KiB）
  - `src/App.tsx:2624-2628`：`finishSaved` 成功后再 `persistDocKey(withEol)`（又一份全文）
  - `src/App.tsx:3140-3141`：草稿兜底路径再写一次
  - `persistDocKey` 本体：`src/App.tsx:633-640`，`localStorage.setItem(DOC_KEY, JSON.stringify({text,...}))`
- 量：第 39 轮 `.tmp/r39-save.log` 实测 100 KB 文档每次 `setItem` 写 **109,778 B**（约 1.07 倍文档），`Ctrl+S` 周期内 2 次、合计约 219 KB
- 提案：`finishSaved` 里已经落盘成功、且 `saveTargetRef/activeFile.handle` 有值时不写 `DOC_KEY`（浏览器兜底只对「没有磁盘落点」的文档有意义）；派生路径写前比长度+指纹，未变则跳过。风险：要保住「关窗能恢复」这条，属于产品行为，改前跟根代理确认

## F5（P2）`App.tsx` 仍是万能模块：4,837 行 / 205,942 B，33 useState + 50 useEffect + 94 useCallback + 33 useRef

- 证据：`src/App.tsx` 4,837 行、205,942 B（`Get-ChildItem`/`Measure-Object -Line` 口径；`read` 工具显示 5,282 行，差异来自 CRLF 计数，取 4,837 为准）；hooks 计数 `Select-String` 命中数
- 单文件覆盖职责：文档载入与身份、保存/自动保存/草稿、宿主写回桥、文件树与工作区、批注与 AI 请求、查找、快捷键、导出、设置、视图模式
- 影响：本轮 F3/F4 两处「保存路径又要动」都要在这一个文件里改；`noUnusedLocals` 关着，死代码也藏在里面（见末节）
- 提案：分三步抽 hook，一次一步、每步跑 `npm test` + `npm run roundtrip`：① 自动保存+草稿（`runAutoSave`/`writeDraftFallback`/`persistDocKey`，约 120 行）② 宿主写回（`sendHostSave`/`pendingIds`/`finishSaved` 的宿主分支）③ 文件树动作。不许一次大重构

## F6（P2）默认门禁测不到保存与落盘的核心：`risk.ts`（355 行）等 5 个模块没有单测

- `npm test` 跑 25 个文件（`package.json` scripts.test 逐条列出），不含：`src/lib/risk.ts`（355 行，决定是否拦保存）、`src/lib/serializeDocument.ts`、`src/lib/tableReuse.ts`、`src/lib/workspace.ts`（256 行）、`src/lib/rename.ts`
- 现有覆盖是间接的：`scripts/roundtrip.mjs` import 了 `baselineLosses` 与 `serializeDocument`（fixture 级）；`scripts/data-safety-acceptance.mjs` 用 e2e 走拦截。这两条都不在 `npm test` 里，CI 之外没人默认跑
- 提案：把 roundtrip 里最关键的 3 条断言搬进 `npm test`（表格复用、脚注定义、frontmatter 末尾换行），再给 `risk.ts` 补 3 条单测（丢脚注定义、丢引用式链接定义、丢公式块各 1 条）。低风险，只加测试

---

## 上轮（第 39 轮）6 条现状

| 上轮 | 现状 | 依据 |
| --- | --- | --- |
| F1 多段落 1 MB 载入 220 s | **仍在**，本轮完成归因（本报告 F1） | 222,472 ms，parse 占 108,501/108,687 |
| F2 1 MB 单段落文末每键 28 s | **未复测**（本轮没跑单段落文末逐键）；代码无相关改动 | 本轮 git 只读，见 UNVERIFIED U3 |
| F3 每键全文序列化 | **仍在**（本报告 F3） | `src/App.tsx:885` |
| F4 载入两次全文序列化 | **已修**：`src/App.tsx:2047-2056` 改为 `const serialized = serializeDocument(...)` 一份两用 | `git diff 59a4f93..HEAD -- src/App.tsx` |
| F5 每 300 ms 整篇写 localStorage | **仍在**（本报告 F4） | `src/App.tsx:897-910`、`633-640` |
| F6 40 个脚本默认 5173 / 死代码 / App.tsx 行数 | **仍在**：`scripts/*.mjs` 41 处 `localhost:5173`（40 个文件）；`serializeBody`（`src/App.tsx:186`）全仓只出现 2 次（import + 定义）；`clearSession`（`src/lib/session.ts:55`）0 引用；`tsconfig.json` 无 `noUnusedLocals` | `Select-String` 命中数 |

## 试过、判断没有问题的路径

- **100 KB 单段落载入**：parse 4.8 ms、总计 10.7 ms（A 样本），控制台错误 0。小文档快，问题只在段数上
- **dispatch / serialize / sync**：37,450 段样本上分别 98.9 / 59.4 / 27.3 ms；第 39 轮 F4 的修复有效，不是这些阶段导致卡死
- **正文完整性**：F 样本输入 1,011,159 字符，载入后 `.textContent` 936,256，差额 74,903 ≈ 37,449 个段间空行（每段 2 字符），没有丢字
- **控制台**：A–F 六个样本 console error 均为 0
- **`@tiptap/markdown` 版本**：3.34.0；`MarkdownManager.parse` 内部是 `marked` 的 Lexer（`dist/index.js:568-582`），不是本项目代码，改造前必须先量再升级

## UNVERIFIED

- **U1 100 KB 保存 / 自动保存 / 源码切换的实测（本轮缺口）**：跑完 1 MB 样本和一次 CDP Profiler 之后，9225 无法再建 Playwright 连接（报 `connectOverCDP: Timeout 20000ms exceeded`，日志停在 `<ws connected>` 之后）。用 `/json/close/<id>` 关掉全部 localhost 标签页后成功连上一次，但 `.tmp/e2e-r40-code-save.mjs` 跑了 160 s 没结束（被移到后台后无输出）。**没有重启浏览器、没有 kill msedge**，按规则停手。补测：换一个空闲端口（9226）或请根代理重启该 profile 的 Edge 后，先跑 `.tmp/e2e-r40-code-save.mjs`（约 30 s）
- **U2 parse 阶段内部三段没拆**：`.tmp/e2e-r40-code-profile.mjs 10000` 在 500 µs 采样下 2 分钟没跑完（采样本身把 13.7 s 的载入放大到数分钟），无 profile 结果。补测：把采样间隔放到 2 ms、样本降到 5,000 段，或按 F1 提案 1 直接加埋点
- **U3 1 MB 单段落文末逐键（第 39 轮 F2）**：本轮没复测。补测：`.tmp/e2e-r39-code-caret.mjs` 仍然可用
- **U4 内存**：本轮只拿到「载入后」一个点（U1 的脚本没跑完），没有足够的点判断泄漏。第 39 轮取过 2 个点（45,910 KB / 34,732 KB JSHeap）
- **U5 截图**：本轮没有截图。`scripts/shot.mjs` 固定连 9222（不能改端口），自写的 `.tmp/e2e-r40-code-shots.mjs` 同样卡在 U1 的 CDP 连接。路径证据是日志与 JSON，不是图

## 复现脚本（都在 `.tmp/`，未提交）

| 脚本 | 用途 | 产出 |
| --- | --- | --- |
| `.tmp/e2e-r40-code-load.mjs` | A–F 六个样本的载入分段与缩放曲线 | `.tmp/r40-load.log`、`.tmp/perf-round40-load.json` |
| `.tmp/e2e-r40-code-save.mjs` | 100 KB 保存墙钟（`write`/`close` 内打时间戳）、localStorage 写放大、源码进出、内存三点 | 未跑完（U1） |
| `.tmp/e2e-r40-code-profile.mjs` | 10,000 段载入的 CDP Profiler 自时间聚合 | 未跑完（U2） |
| `.tmp/e2e-r40-code-shots.mjs` | 用 9225 截图（`scripts/shot.mjs` 写死 9222） | 未跑完（U5） |

## 环境动作（需知会）

- 为解除 U1 的卡死，用 CDP 的 HTTP 端点 `http://127.0.0.1:9225/json/close/<targetId>` 关闭了 localhost:5175 的页面（等价于 `reset.mjs` 做的事）。**没有启动浏览器，没有 kill msedge**。
- **9225 现在对 Playwright 不可用**（`connectOverCDP` 超时）。下一位用 9225 的角色要么先重启该 profile 的 Edge，要么改用 9226。
