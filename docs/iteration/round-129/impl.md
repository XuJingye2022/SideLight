# 第 129 轮实现（executor，A 轮 2 任务）

轮前 HEAD `a8985f6`；dev 5175 不重启；9222–9226 无监听，真机 ego 57270；未 push。

## A1 批注写盘改 flush 机制（B-255）：DONE
`git diff --stat` 恰 2 个 src 文件。

- `src/App.tsx`：ref 区（`annotationsHydratedRef` 后）加 `annotationsTimerRef`、`pendingAnnotationsRef{host,space,path,name,store}`、`annotationsWriteRef`；紧接 `flushAnnotationWrite = useCallback(…, [])`——同步取 pending 置 null + 清计时器，无 pending 回 `Promise.resolve()`，有则 `const promise = (async()=>{…})()` 后**同步**登记 `annotationsWriteRef.current = promise` 再 return；体内 try/catch（不留 unhandled rejection）；宿主只 postMessage，工作区 `parentDirectory` → 空档 `removeCache`、非空 `writeAnnotationStore(…,false)` + legacy 清理；兜底 `useEffect(()=>()=>void flushAnnotationWrite(),[…])`。
- 写盘 effect 改「调度时捕获身份」（host 取 `hostModeRef.current ? host : null`，space/path/name 取此刻 ref；未水合或身份不全不调度；重排前 clearTimeout），**删旧 cleanup**，deps `[annotations, docNotes, flushAnnotationWrite]`。
- `loadIntoEditor` 首行 `void flushAnnotationWrite()`（早于 `setMarkdown`/`setAnnotations([])`）+ deps；`applyHostPayload` 首行同 + deps；`restoreAnnotationsFor` 第一句 `await annotationsWriteRef.current?.catch(() => undefined)`。导入 `type AnnotationStore`、`type HostTransport`；pending 的 path/name 为 `string | null`。
- `annotations.test.ts` +2 条静态门（`loadIntoEditor` 切片含调用且早于清空；三枚新名各 ≥2，声明在 ref 区后、`applyHostPayload` 前）。

门禁：`tsc --noEmit` / `npm run build` exit 0；`npm test` **66 文件 933 条 0 fail**（931→933，`.tmp/r129-exec-npmtest-final.log`）。

## A2 真机 before/after 六项（B-255）：DONE
新脚本 `.tmp/e2e-r129-ann-flush.mjs`（改自 r123 探针：假 FSA ops、ego 57270、1440×900；每阶段先 `node .tmp/reset.mjs 57270`）。

- 模块门：after 双标记在（`.tmp/r129-devmod-after.json`）、before 都不在（`-before.json`）；随后全新 goto。
- after **①–⑥ 6/6 PASS**（`r129-ann-flush-after.json`）：① status→resolved 立刻切 b.md，`editToLoadMs` **152**、窗口 `write:.sidelight/annotations/a.json` **1 次**、盘 resolved；② 重开 a.md 仍 resolved；③ 0 条 b.json 写、b.md `.note` 0；④ priority→urgent **150 ms**、写计数 **1**、盘 urgent；⑤ 对照等 1,000 ms 再切：盘/重开 wont-fix；⑥ 0 pageerror。截图 `shots/round-129/ann-flush.png`（重开后卡头「紧急 / 不修复」）。
- before（stash src/App.tsx → pop，try/finally；pop 后 stash 空）：**①②④ FAIL**（① 141/152 ms、窗口写 **0**、盘仍 open；④ 149/151 ms、写 0）、③⑤⑥ PASS，`asExpected=true`。各窗口 editToLoadMs 全 <600，无 UNVERIFIED。
- 载入后落定写：两阶段打开 a.md 后 600 ms 都写 a.json **1 次**；短名无 legacy 键，冗余写不是清 legacy。

门禁：`npm run verify -- --max 316500` **exit 0** —— gate gzip **316,033**（raw 1,025,343、余 467）、chunk gzip9 **7,869**、合计 **323,902**（B-229 仍 `open`，已记 BACKLOG）；`npm test` 66 文件 **933** 条 0 fail；回归 `.tmp/e2e-r97-a1-status.mjs` **44/44** PASS。

## CHANGELOG 一行建议
`- 修复：改完批注紧急度或状态后 600 ms 内切换文档会静默丢掉这次改动（现在切篇前先落盘）。`

## 新踩坑
1. `restoreAnnotationsFor` 的 `.finally` 是微任务，早于 React 的 passive effect：「未水合不调度」挡不住切篇时 `setAnnotations([])` 的调度，b.md 仍会 600 ms 后 `remove` 不存在的 b.json（`remove:` op、非写）。
2. 假 FSA 的 op 是 `write:.sidelight/…`（`write:` 后无 `/`）：按 `includes('/.sidelight/…')` 数写计数恒 0，会把「写了」判成「没写」。
3. 真机 before/after 覆盖同一张截图：before 段也写 `shots/round-129/ann-flush.png`，跑完 before 必须重跑 after。
