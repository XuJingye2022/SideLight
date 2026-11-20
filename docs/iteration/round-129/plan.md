# 第 129 轮计划（planner-revision-1，单轮 · B-255 / 2 任务）

轮前 HEAD `a8985f6`（=startSha）、工作树净；dev 5175 不重启；CDP 9222–9226 不可用，真机 ego 57270。

## 0 修订（H1–H6；范围不变、不新增任务）
- H1→§4.1 模块门；H2→§3.2 ref 登记形状；H3→§3.1/3 pending 只存身份；H4→§4.3 ①④ 写计数===1；H5→§3.2 声明在 ref 区（早于 `:1383`）；H6→§4.4 断 `editToLoadMs<600`。

## 1 体积
- gate gzip **315,824 B**（raw 1,024,765、余 4,176）；chunk gzip9 **7,866**；合计 **323,690**（B-229 `open`，超线 3,690）。旧值 312,423/余 7,577。
- 预算：gate 净增 ≤600、chunk +0；**316,500 只是 gate 上限、非硬线**（硬线 320,000）；`verify -- --max 316500` 必须 exit 0；超了按 §3.5→§3.4→注释顺序缩，不抬 max。
- 基线：66 文件 931 条 0 fail（`.tmp/r129-planner-npmtest.log`）。

## 2 机制（已核）
- effect `App.tsx:2127-2154`（600 ms、`:2153` cleanup 无条件 clear）；切篇 `openWorkspaceFile:2784`→`requestLoad:2709`→`loadIntoEditor:2565`，`:2629-2630` 的 `setAnnotations([])`/`setDocNotes([])` 触 deps 清旧计时器 → 旧篇不落盘。故要「调度捕身份 + 切篇前 flush」。
- 点位：`annotationsHydratedRef:767`、`restoreAnnotationsFor:2512`、`applyHostPayload:1383`（deps `:1459`）、`loadIntoEditor` deps `:2703`、`host:452`、`AnnotationStore` 需补 type 导入（`:66`）、`writeAnnotationStore`（`annotations.ts:536`，`backup=false` 只 1 写）、`parentDirectory`（`workspace.ts:143`）。

## 3 A1 实现（`src/App.tsx` + `src/lib/annotations.test.ts`）
1. ref 紧贴 `:767` 后（须在 flush 前，否则 TDZ）：`annotationsTimerRef`；`pendingAnnotationsRef`（`{host; space: Workspace; path: string; name: string; store: AnnotationStore} | null`）；`annotationsWriteRef`（`Promise<void>|null`）；`:66` 补 `type AnnotationStore`。
2. `flushAnnotationWrite` 紧接 ref 区（H5：早于 `:1383`/`:2512`/`:2565`/`:2127`）。形状（H2）：`const p=(async()=>{…})(); annotationsWriteRef.current=p; return p`，前段同步取 pending 置 null + 清计时器；禁止 `async` 函数配 `void flush()` 或 await 后登记。体内：无 pending return；host → 同 `:2132` payload；否则 `dir=await parentDirectory(space,path).catch(()=>null)`（H3：FS 链仅此），无 dir return；空档 `removeCache(dir,'annotations',cacheKey(name))`；否则 `writeAnnotationStore(dir,key,store,false)` + 有 `legacyKeyFor(name)` 再 `removeCache`。
3. 改写 `:2127-2154`：同步捕获 `{host: hostModeRef.current?host:null, space, path: file?.path??null, name: file?.name??null, store:{v:2,annotations,notes:docNotes}}`；host 分支只需 host 非空、否则 space/path/name 缺一不调度；未水合不调度；重排前 `clearTimeout`；deps → `[annotations,docNotes]`；删 `:2153` cleanup。
4. `loadIntoEditor` 首行 `void flushAnnotationWrite()`（早于 `if(!editor)return`）+ deps `:2703`；`applyHostPayload` 首行同 + deps `:1459`（H5）；宿主换篇只静态核。
5. `restoreAnnotationsFor` 第一句 `await annotationsWriteRef.current?.catch(()=>undefined)`（deps 不加）。
6. 兜底 `useEffect(()=>()=>{void flushAnnotationWrite()},[flushAnnotationWrite])`。
7. `annotations.test.ts` 尾部（复用 `:781`/`:784`）+2 静态门：`loadIntoEditor` 切片含 `flushAnnotationWrite(`；`App.tsx` 三枚新名各 ≥2。不写 `clearTimeout(timer)` 计数门（他处同形行恒红）
- 验收：build 过、`npm test` 931→933 条 0 fail、`git diff --stat` 恰 2 个 src 文件。

## 4 A2 真机 before/after + 门禁
文件：新 `.tmp/e2e-r129-ann-flush.mjs`（改自 `.tmp/r123-finder-code2.mjs`，留假 FSA/`__vfs`/`SEED`/`storeA`，种子 `a.json` 1 条 open）；`impl.md`；`BACKLOG.md` 只改 B-229 行末。
1. 模块门（H1）：脚本开头 fetch `/src/App.tsx`（5175），before 断 `flushAnnotationWrite`+`annotationsWriteRef` 都不在、after 都在（单标记挡不住混合版本）；落 `.tmp/r129-devmod-<stage>.json`，不符 `exit 3`；随后全新 `page.goto`（不吃长开页面旧模块）。不符先 touch 再跑一次；仍不符停、记 UNVERIFIED、不改产品。
2. 顺序先 after 再 before（25 分钟偏紧）；stash 窗口只跑 E2E、不跑 `npm test`。
3. after（ego 57270、1440×900）：① status→`resolved` 立刻切 b.md，记 `editToLoadMs`（selectOption→title 含 b.md）；1,600 ms 后 a.json `reviewStatus==='resolved'` 且窗口写计数===1（H4）；② 重开 a.md 为 `resolved`；③ 0 条 b.json 写、b.md 无 `.note`；④ priority→`urgent`，`editToLoadMs≤550` 切走 → a.json `priority==='urgent'` 且窗口写计数===1；⑤ 对照等 1,000 ms 再切 → 磁盘/重开 `wont-fix`；⑥ 0 pageerror。各计数窗口前先等 1,000 ms 再取 ops 基线；`annWrites` 原样记 JSON（口径不符按实际改断言）；另记 `loadSettleWrites`。
4. before：`git stash push -- src/App.tsx` → 跑 ①–⑥（期望 ①②④ FAIL、③⑤ PASS）→ 落 `.tmp/r129-ann-flush-before.json` → `git stash pop` 核对。采样有效性（H6）：每窗口断 `editToLoadMs<600`（目标 ≤550），FAIL 带该值；≥600 判该轮无效、记数值后重跑 1 次；仍 ≥600 记 UNVERIFIED。①② 意外 PASS 而模块门说标记不在 → 当采样/模块问题，不许据此改产品。
5. `impl.md` 按实测写：加载后 600 ms 写次数、legacy key 是否被清（改前靠这次冗余写）；若 after 已延后到首次改动，写「清理延后到首次改动」+ 证据。
6. 门禁：`npm run verify -- --max 316500` exit 0（记三数）；`npm test` 0 fail；回归 `.tmp/e2e-r97-a1-status.mjs` **44/44**；不跑 roundtrip。证据 `shots/round-129/ann-flush.png` 1 张、`impl.md` ≤4 KB；B-255 交 tester/lead。
- 验收：after ①–⑥ 全 PASS（两处写计数 ===1）；before ①②④ FAIL 且各窗口 <600；三数齐；r97 44/44。

## 5 残余
宿主换篇只静态核（UNVERIFIED）；真 FSA/IME 未验；关窗兜底 best-effort；B-229 口径待 lead。
