# 第 129 轮计划审查（critic，复审 1）

**结论：REVISE**（1×P1、3×P2）。H1–H6 全部修掉；数字与锚点已独立复核；剩 1 个会静默影响宿主的 P1 与 3 个执行细节。

## 上一版 H1–H6（已修）
- H1 §4.1 双标记模块门 + 落 JSON + `exit 3` + 全新 goto + touch 重试 ✓
- H2 §3.2 同步登记 `const p=…(); ref.current=p; return p`，禁 async+void ✓
- H3 §3.1 pending 只存 `{host,space,path,name,store}`，FS 链只在 flush ✓
- H4 §4.3 ①②④ 写计数 `===1`；§4.5 改「按实测写」legacy ✓
- H5 §3.2 声明在 ref 区（早于 `:1383`/`:1459`/`:2512`/`:2565`/`:2127`）✓
- H6 §4.4 每窗口断 `editToLoadMs<600`，无效重跑 1 次后 UNVERIFIED ✓

## 独立复核
- `node scripts/measure-first-screen.mjs`：gzip **315,824**、raw 1,024,765、余 4,176（与 §1 同）；`.tmp/r129-planner-npmtest.log` 66 文件 **931 条 0 fail**（与 §1 同）。
- 抽核全对：effect `:2127-2154`（600 ms、`:2153` cleanup）、`applyHostPayload:1383` deps `:1459`、`loadIntoEditor:2565`（`:2567` 早退、deps `:2703`、`setAnnotations([]):2629`、`:2644` 水合置 false）、`restoreAnnotationsFor:2512`、`cacheDirFor:897`、`writeAnnotationStore` `backup=false` 恰 1 写；`annotations.test.ts` 的 `withoutComments:781`/`countOf:784` 存在（795 行）。

## 漏洞
1. **C-1 P1 flush 未 memo 化，deps 会污染宿主载入**：§3.2 只说「紧接 ref 区」，没写 `useCallback`；写成普通 const 后每渲染换身份，而 §3.4 要求把它加进 `applyHostPayload` deps（`:1459`）与 `loadIntoEditor` deps（`:2703`）。`:1716` 的宿主载入 effect 依赖 `applyHostPayload` → 每次渲染重跑 `loadHostDoc()`（`:1568` `fetch('/__doc')`）；宿主模式 fetch→applyHostPayload→setState→渲染→再 fetch 成环；dev 浏览器 `/__doc` 回 HTML 也会每渲染 `loadSession`。本轮宿主只静态核，会静默上线。修：写死 `const flushAnnotationWrite = useCallback(async () => {…}, [])`（pending 已存 host，不读 state 闭包），保留 H2 同步登记；静态门补「声明行含 `useCallback`」。
2. **C-2 P2 ①④ 的「立刻切」可能让 after 假 FAIL**：pending 由 passive effect 登记；`selectOption` 后同一命令立刻点树行（r123 原写法 `.tmp/r123-finder-code2.mjs`：`selectOption`→`treeRow('b.md').click()` 无等待）若早于 effect，flush 读不到 pending，修复正确也会红；§4.4 只处理了 before 的意外 PASS。修：selectOption 后等 1 帧 rAF + 40–50 ms（仍 <600）；after ①/④ 失败重试 1 次，两次 `editToLoadMs` 落 JSON；不许据此改产品。
3. **C-3 P2 写失败留 unhandled rejection**：`writeAnnotationStore` 末段 `createWritable/write/close` 无 catch（`src/lib/annotations.ts:558-562`）；flush 由 timer / 兜底 effect / 载入入口 `void` 调用，失败会 reject 并留在 `annotationsWriteRef`，`⑥ 0 pageerror` 与 H2/H3 的「不留 unhandled rejection」口径冲突。修：flush 内整体 try/catch 吞掉（沿用「磁盘错不打断用户」），或三个调用点统一 `.catch(()=>{})`。
4. **C-4 P2 环境与回滚**：§4 未写 `node .tmp/reset.mjs 57270`（common.md 每次 E2E 前固定要求）；`git stash pop` 无 try/finally，脚本中途抛错会把 App.tsx 留在 stash，后续 `npm test`/`verify` 全跑旧码。修：before 段包 try/finally，pop 后核 `git stash list` 空并重过模块门。

**备注**：`pendingAnnotationsRef` 类型 `path/name: string` 与捕获 `file?.path??null` 不一致，tsc 会拦，写 `string | null`。B-229 仍 open：门 315,824 + 常驻 chunk 7,866 = 323,690 已超硬线，本轮只记三数（门/净增/chunk+合计），不要把 316,500 当硬线；25 分钟偏紧，after 先跑的安排保留。
