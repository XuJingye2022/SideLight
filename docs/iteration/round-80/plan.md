# 第 80 轮 A 轮计划（P2 清账第 2 批：3 条）· revision 1

> 按 `plan-review.md`（4×P1+2×P2）修订；不加任务/范围；仍单轮 A；3 条均 P2，25 分钟内可做。
> 队列 10 条（`.tmp/answers/p2-sweep-draft.md:23`）：B-109/B-111/B-134 已清，B-110 部分，本批 B-122，余 5；B-136、B-150 不在 10 条内。

- startSha `556e7ff…900d8`（=HEAD）；0.32.1；不 push/不改 `release/`/不加依赖；报告 `docs/iteration/round-80/`。
- 序 A1→A2→A3。每任务 `npm test`（基线 45/579→580）+ `npm run verify`（gzip，基线 303,914 / 内部 310,000）。
- CDP 9222–9226 大概率不可用：真机只试 54280 1 次，连不上改单测/构建/静态记 UNVERIFIED；E2E 前 `node .tmp/reset.mjs <端口>`，结尾 `browser.close(); process.exit(0)`。
- 其余 P2 留后续批次；不发版/不 push；截图 ≤2。

## A1（B-122）暖纸 Mermaid：真机颜色 + 主题竞态

`mermaidLazy.ts:56-107` 已有 `sepia`，单测 19；残竞态 `:144`。

1. `:144` → `loading.then(() => { if (mermaid) configure(mermaid, theme) })`。
2. 单测 +1（→20）：挂起 Promise 假 loader，先 `sepia` 后 `default`，release 后 `inits` 2 且末次为后设主题（`default` 无 `themeVariables`）；反序末次 `base`。
3. 播种（`.tmp/e2e-r80-a1-mermaid.mjs`）：`localStorage.clear()`+reload→点 `.ProseMirror p`→`keyboard.type('```mermaid')`+`Enter`（输入规则 `^```([a-z]+)?[\s\n]$` 写 `attrs.language`）→`graph TD`/`Enter`/`A-->B`。15 s 无 `.mermaid-preview` 则退 `Ctrl+/` 源码 `fill` 围栏（`e2e-r46-impl-t3-mermaid.mjs:55-75`），记 `path`；任一成立即算块成立，不判红。
4. 只改 `documentElement.dataset.theme`（`mermaidPreview.ts:152-158` 监听）：light(`default|`)→dark→sepia→dark→light；首等 `.mermaid-preview.is-ready svg`（≤20 s），每档等 `[data-render-key^="<theme>|"]` 且 `is-ready`。
5. 全用 `getComputedStyle`（照 r46 `:83-91`）：`g.node rect` 的 `fill`/`stroke`、`g.node foreignObject div|text|tspan` 首个非空 `color`、`path|line` 首个非 `none` 的 `stroke`；有 `null`/`''`/`'none'` 即 FAIL。

验收（`.tmp/r80-a1-mermaid-sepia.json`）：单测 20/20+gzip。硬门①sepia `fill` ≠ light `rgb(236,236,255)` 且 ≠ dark；②sepia 标签对 `fill` ≥4.5:1（内联 WCAG，α<1 按 `fill` 合成）；③第二次 dark/light 的 `fill`/`stroke`/`color` 逐值等于第一次（只比三字段，SVG id 递增）；④0 pageerror。附加：sepia `fill` 与 `--paper-raised` 换算值比通道差，≤3 记命中，否则记实测（不写死 `rgb(251,243,227)`）。截图 `shots/round-80/mermaid-sepia.png`（1/2）。收口：B-122 留 `fixed`，过硬门交 tester 判 `verified`；无浏览器只交单测+静态。

## A2（B-136）只读查找条：补「正文 0 高亮」与源码视图

1. 夹具写死：`installFakeWorkspace(page,{ 'find.md': '# 查找锁\n\n丁节只出现一次。\n\n字数也只出现一次。\n' })`+`openFolder`+点树内 `find.md`（照 `.tmp/e2e-r79-a1-eq-delim.mjs:28-38`）；无 `==`/`<mark>`，两词各 1 次。
2. 预览：`Ctrl+Shift+P`→等 `.preview-pane`→`Ctrl+F`→两 `.find-input` `readOnly===true`、Aa/ab 各 1 disabled、`.find-note` 含「预览是只读视图」且 `id===find-locked-note`、两输入 `aria-describedby` 同值；`focus('.find-bar .find-input')` 后 `keyboard.type('丁节')`（不可编辑则改 ASCII `abc` 记 `typed`）→两 `value===''`、`.find-count` 空、`.preview-pane .find-hit` 0、`mark` 0。Aa 只断 `disabled===true` 且 `aria-pressed==='false'`，不点（`findBarState.ts:36`；见 plan-review R80-3）。Esc→条关、`__slState.viewMode==='preview'`。
3. 源码：`Ctrl+/`→先 `waitForSelector('textarea.source-editor',{state:'visible'})`→`Ctrl+F`→同锁、note 含「源码模式下不支持」；键入无效；Esc→焦点回 `textarea.source-editor`。
4. 回编辑：`Ctrl+/`→`Ctrl+F`→`readOnly` 0、Aa 可用、键入「字数」得 `1 / 1`。

验收 `.tmp/r80-a2-find-locked.json` 全 PASS；失败先修 `FindBar.tsx`/`findBarState.ts` 复跑；`npm test` 0 fail。收口：两半过交 tester 判 `verified`，否则回写剩余留 `fixed`。

## A3（B-150）设置面板分节折叠

`.dialog` 可滚动（`styles.css:1449-1458`）、`.dialog-actions` sticky（`:1501-1512`）、13 字段平铺（`SettingsDialog.tsx:74-233`）；改前溢出 **152/352/432 px**（第 70 轮）。

1. 两个原生**非受控** `<details className="settings-group">`（不传 `open`，重渲染不复位）：①「接口与模型」= 接口地址/API Key/模型/联网核对（含搜索 Key 与计费）；②「批注提示词」= textarea/提示/恢复默认。
2. DOM 序：主题→自动保存→智能标点→快捷行内语法→正文字号（上移，始终可见）→①→②→两条 `.dialog-note`→`.dialog-actions`；首焦点仍首个 theme radio（`FOCUSABLE` 不含 `summary`）。
3. `styles.css` 加 `.settings-group summary`（`cursor:pointer`、`var(--text-xs)`、`var(--ink-soft)`、`padding:6px 0`）与 `[open] > summary` 末距；不动 `.dialog` 的 `max-height`/`overflow`。
4. 验收（真机 54280，`.tmp/r80-a3-settings.json`）先量后判：三档 `scrollHeight-clientHeight`（1024×700/1000×620/1440×900）≤64 达标；任一档 65–120→做一次间距压缩（`.field` margin-bottom 12→10、`.field-hint` margin-top 4→3）复测；仍 >120→记实测与对 152/352/432 的差值、剩余属内容量，B-150 留 `deferred`，不判未完成；1440×900 档 `0 或 ≤8`。另断 `.dialog-actions` 在框内与视口内、「保存」`elementFromPoint` 命中；`<details>` 恰 2 初始 `open=false`、点开①出「接口地址」input；改字号保存生效；`[role=radio]` 4、`tabIndex=0` 1。截图 `shots/round-80/settings-1024x700.png`（2/2）；`npm test` ≥579 条 0 fail；`npm run verify` gzip ≤310,000；不跑 roundtrip。

收口：达标→`fixed`；仍 >120→留 `deferred`+实测。风险：默认藏 Key 是授权取舍；旧脚本 `fill('.field input')` 需先展开。
