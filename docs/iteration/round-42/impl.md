# 第 42 轮 · 实现报告（executor）

- 轮次：round=42，nn=42；轮前 `startSha=5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（开工前 `git log -1 --format=%H` 实测相同；工作树只有 `docs/iteration/round-42/` 与 `shots/round-42/` 两个未跟踪目录）。
- 输入：`.tmp/iteration/common.md`（56 行全文）、`.tmp/iteration/roles/executor.md`（33 行全文）、`docs/iteration/round-42/plan.md`（396 行全文，revision 2）、`docs/iteration/round-42/plan-review.md`（124 行全文，复审 revision 2）、`AGENTS.md` §3/§4/§8、涉及源码。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；E2E 固定 CDP 9222，每个脚本前 `node .tmp/reset.mjs 9222`；未启动 Edge、未 kill `msedge`、未 `browser.close()`。未 commit、未 push、未改 `package.json` 版本、未碰 `release/`。

## 耗时（plan §五 的两个检查点）

- T1 结束约 **4 min**（15:55），T2 结束约 **7 min**（15:58），T3 结束约 **9 min**（16:00）；收尾与门禁到 16:00 之后。按会话内工具时间戳估算，**两个检查点都在 22 min 硬线内**，未触发 §五 的砍单。
- 结果：§五「仍可砍」的 3 条**都没砍**（6 张 T2 截图、长文中段断言、`C-1MB-4k` 都做了）。

## 逐任务状态

| 任务 | 状态 | 关键证据 |
| :--- | :--- | :--- |
| T1 预览锁替换（P1 数据安全） | **DONE** | `## c1`–`## c6` 全绿 + `## edit-handler-control` / `## edit-replace-click` 正向对照；8 张截图里 2 张 |
| T2 Esc 正向出口 + 工具栏按下态 + 表格条 + 焦点指示线（P1/P2） | **DONE** | `## t2-esc` / `## t2-toolbar` / `## t2-tablebar` / `## t2-empty-focus` / `## t2-long-focus`；`keyboard-acceptance` 52/52 |
| T3 退出源码不重解析 + 3 个守卫 + 保存链单测（P1/P2） | **DONE** | `## c-noedit-exit`（marks 3→3）、`## a-save-roundtrip`（seedSame）、`## b-source-edit`（marks 3→4 + 正文含改动）；perf 三档；10 条单测 |
| T3 第 5 步死符号清理 | **按计划预砍**（不执行） | 见 plan §四；证据口径留在 plan T3 第 5 步，下一轮照做 |

## 改动文件（文件:行号）

**T1**

- `src/App.tsx:4779-4784`：`FindBar` 的 `unavailableReason` 加第三态（预览），文案含「预览」两字供断言。
- `src/App.tsx:1836-1837`（`replaceCurrent` 首行守卫）、`:1845`（`replaceEvery` 首行守卫），两个 `useCallback` 依赖数组补 `previewMode`（`:1842`、`:1862`）。

**T2**

- `src/App.tsx:3623-3638`：window `Escape` 分支末尾新增「正文焦点 → 正向出口」，含 `event.isComposing || event.keyCode === 229` 守卫与 `closest('.ProseMirror')` 守卫；落点 `.status-bar .stats-trigger`。位置在所有对话框/查找/菜单/源码/预览分支之后、函数末尾 `return` 之前；`useEffect` 依赖数组未动（新分支只读 `document`）。
- `src/styles.css:253-259`：`.doc-body:focus-visible { outline: none }` + `.doc-scroll:has(.doc-body:focus-visible) { box-shadow: inset … }`。
- `src/App.tsx:3831-3838`：6 个 `isActive` 布尔量（紧跟 `run` 的 `useCallback` 之后、`return (` 之前）。
- `src/App.tsx:4673-4709`：H1/H2/B 整串 `is-on` + `aria-pressed`；I/S/`</>` 组合类名（`italic${…} `）+ `aria-pressed`。
- `src/App.tsx:4799-4827`：表格条 7 个 `title`、三个删除按钮 `className="is-danger"`、插入组与删除组之间 `<span className="table-bar-sep" aria-hidden="true" />`。
- `src/styles.css:1921-1933`：`.table-bar button.is-danger`（`var(--danger)`）、`:hover` 危险底、`.table-bar-sep`。

**T3**

- `src/App.tsx:2793-2811`：抽出 `serializeBodyNow()`（不看视图），`currentMarkdown()` 退化成 `sourceMode ? sourceText : serializeBodyNow()`。
- `src/App.tsx:3839-3868`：`applySource` 加 `skipReparse`（`sourceText === sourceBaselineRef.current && normalizedSource === serializeBodyNow()`），`setMarkdown` 与批注重定位整段移进 `!skipReparse`；`setFrontmatter`/`setFootnotes` 与结尾 `setDirty` 留在分支外；依赖数组补 `serializeBodyNow`；注释写明「不能用 currentMarkdown()」的原因。
- `src/lib/tilde.ts:38`、`src/lib/escapes.ts:7`、`src/lib/html.ts:23`：三条精确守卫（都是必要条件）。
- `src/lib/serializeDocument.test.ts`（新文件，10 条）；`package.json` 的 `scripts.test` **末尾**追加该文件（28 → 29 个）。

## 偏差记录（与 plan / plan-review 不同，共 5 处）

1. **`keyboard-acceptance` 改到「全部改动做完后」跑**（plan 原写 T2 验收 7 跑一次、T3 复用；plan-review R42-12 指出那样取的是改前代码的证，且 `Esc 退出源码` 正好走 T3 改过的 `applySource`）。本轮按 review 修法：T2 阶段不跑，T3 门禁后跑**唯一一次** `node scripts/keyboard-acceptance.mjs http://localhost:5175` → **52/52 PASS**。仍只跑一次。
2. **T3 验收 2(c) 挪到 (b) 之前**（plan-review R42-11：`(b)` 之后 `dirty` 必为 true，按原文顺序写 `dirty === false` 必然假红）。实际顺序：(c) 不改源码进出 → (a) 往返 + 保存 → (b) 改源码 → 保存。仍覆盖三条路径，且解析计数物证在同一次运行里（review R42-10）。
3. **T3 单测 ③ 口径按 R42-13 改**：断言「original 是 CRLF 时**结尾换行**是 `\r\n`、正文仍是 `\n`」，并断言正文段里无 `\r`；没有断言整篇 CRLF（整篇转换在 `prepareSave` 的 `withEol`，不在 `serializeDocument`）。
4. **`repairHtml` 实测优于门槛**：0.1 ms（plan 允许 0.4–0.6，门槛 ≤0.6）。原因是 1 MB 性能样本里三个实体子串都不存在，三条 `includes` 全跑仍只有 0.1 ms（`guardsIncludes` 对照 0.4 ms）。未为提高「贴合预测」改守卫。
5. **T2 E2E 中途加了一次 `page.reload()`**：长文里按过 `Tab`（dirty），直接点别的文件会弹「切换文档」确认框，切换不生效。刷新拿干净状态后重新打开文件夹；这是脚本问题，不是产品缺陷。

## 命令与原始结果

### T1（`.tmp/e2e-r42-impl-t1.mjs`，CDP 9222）

```
## t1-mode {"mode":"preview","dirty":false,"title":"甲.md — Sidelight"}
## c1-findbar {"note":"预览是只读视图，不支持查找与替换：切回编辑（Ctrl+Shift+P）再查","count":"","buttons":[{"t":"Aa","d":false},{"t":"ab","d":false},{"t":"↑","d":true},{"t":"↓","d":true},{"t":"✕","d":false},{"t":"替换","d":true},{"t":"全部替换","d":true}]}
## c2-locked {"dirty0":false,"pane":"甲|第一句在正文里。第二句也在正文里。","hasSeed":true,"hasReplacement":false,"dirty":false,"count":""}
## c3-locked {"pane":"甲|第一句在正文里。第二句也在正文里。","hasSeed":true,"hasReplacement":false,"dirty":false,"count":""}
## c4-saved {"seedSame":true,"dialog":null}
## c5-source-locked {"note":"源码模式下不支持查找定位与替换：切回富文本（Ctrl+/）再查","count":"","buttons":[…]}
## edit-handler-control {"text":"甲|第一句在段落里。第二句也在正文里。","hasReplacement":true,"dirty":true}
## edit-replace-click {"text":"甲|第一句在段落里。第二句也在段落里。","dirty":true}
## edit-saved {"bytes":"# 甲\n\n第一句在段落里。第二句也在段落里。\n","hasReplacement":true}
## c6-乙.md {"same":false,"bytes":"> 引用行\n> <p>html 段</p>\n"}   ← 与计划要的 /^> 引用行\n> <p>html 段<\/p>\n$/ 完全一致，bug 第 2 条本轮不做，行为不变
## c6-丙.md {"same":true,"bytes":"> [!NOTE]\n> 注释行\n\n<p>隔一行 html</p>\n"}
## z-errors {"errors":[]}
```

- c2/c3 用的是 `Object.keys(btn).find(k => k.startsWith('__reactProps$'))` 取 props 再调 `onClick()`（plan R42-9；不用 `page.click`，也不用「DOM 上把 disabled 改回 false」）。
- `## edit-handler-control` 是这条链的正向对照：同一招在编辑态确实改到正文并置脏，证明 c2/c3 的绿不是「回调没调到」。

### T2（`.tmp/e2e-r42-impl-t2.mjs`，CDP 9222）

```
## t2-empty-focus {"tabsEmpty":1,"focusVisibleHit":true,"outlineStyle":"none","outlineWidth":"3px","boxShadow":"rgb(43, 109, 100) 0px 2px 0px 0px inset","bodyTop":136,"scrollRectTop":84,"scrollRectBottom":872}
## t2-long-focus {"tabsLong":1,"scrolled":{"scrollTop":75377,"scrollHeight":150754},"before":{…"bodyTop":136},"after":{"focusVisibleHit":true,"outlineStyle":"none","outlineWidth":"3px","boxShadow":"rgb(43, 109, 100) 0px 2px 0px 0px inset","bodyTop":-75241,"scrollRectTop":84,"scrollRectBottom":872}}
## t2-esc {"tabsDeltaText":4,"tabsDeltaInner":4,"afterTabs":{"tag":"DIV","inProseMirror":true},"escFocus":{"tag":"BUTTON","cls":"stats-trigger","inStatusBar":true,"statsBtn":true},"orderOk":true,"afterTabOut":{"tag":"BODY","statsBtn":false},"zDelta":0}
## t2-toolbar {"on":{"bold":{"pressed":"true","cls":"is-on","bg":"rgb(232, 240, 237)"},"italic":{"pressed":"true","cls":"italic is-on","fontStyle":"italic"},"strike":{"pressed":"true","cls":"strike is-on","decoration":"line-through"},"mono":{"pressed":"true","cls":"mono is-on","fontFamily":"ui-monospace, \"Cascadia Code\", Consolas, monospace"}},"off":{"bold":{"pressed":"false","cls":"","bg":"rgba(0, 0, 0, 0)"},"italic":{"pressed":"false","cls":"italic","fontStyle":"italic"},"strike":{"pressed":"false","cls":"strike","decoration":"line-through"},"mono":{"pressed":"false","cls":"mono","fontFamily":"ui-monospace, …"}},"headings":[{"t":"H1","pressed":"true","cls":"is-on"},{"t":"H2","pressed":"false","cls":""}]}
## t2-tablebar {"buttons":[{"t":"上插入","title":"在当前行上方插入行","color":"rgb(35, 84, 77)","danger":false},…,{"t":"删行","title":"删除当前行","color":"rgb(180, 69, 58)","danger":true},{"t":"删列","title":"删除当前列","color":"rgb(180, 69, 58)","danger":true},{"t":"删表","title":"删除整张表格","color":"rgb(180, 69, 58)","danger":true}],"sep":1}
## t2-dark {"theme":"dark","darkColors":[{"t":"上插入","color":"rgb(156, 203, 194)"},{"t":"删行","color":"rgb(232, 145, 127)"}]}
## z-errors {"errors":[]}
```

对照验收标准逐条：

1. `Tab` ×2 后 `innerText`/`textContent` 都 **+4**，`activeElement` 仍是 `.ProseMirror`；`Escape` 后 `BUTTON.stats-trigger`、属于 `.status-bar`、`compareDocumentPosition` 含 `FOLLOWING`（**正向**）；再 `Tab` 已离开该按钮。
2. `Esc` 后按 `z`：正文长度 25,898 → 25,898（Δ0）。
3. 首启空文档与长文中段两条都命中 `:focus-visible`（`tabs*` = 1 次 Tab 就回到正文）：`.doc-body` 的 `outline-style` = `none`（`outline-width` 仍是 3px，按计划允许的写法断言 style）、`.doc-scroll` 的 `box-shadow` 含 `inset`；长文 `scrollTop` 到一半后 `.doc-body` 的 `rect.top = -75,241 < 0`，`.doc-scroll` 仍在视口内（84…872）——旧写法（内阴影画在 `.doc-body` 上）这条必然失败。
4. B/I/S/`</>` 各 1 组「按下/未按下」共 8 条断言 + 3 条计算样式（I `fontStyle|italic`、S `line-through`、`</>` `mono`）在**两种状态**下都成立；H1/H2 只记录（H1 `true`、H2 `false`）。
5. 7 个 `title` 全非空；删除三项 `rgb(180, 69, 58)` = `--danger`，插入四项 `rgb(35, 84, 77)` = `--accent-ink`；`.table-bar-sep` 1 个。
6. 深色只截图不断言；计算色：插入 `rgb(156, 203, 194)`、删除 `rgb(232, 145, 127)`，供人工看。

### T3 正确性（`.tmp/e2e-r42-impl-t3.mjs`，CDP 9222）

```
## t3-open {"mode":"edit","dirty":false,"title":"甲.md — Sidelight","text":"甲|甲的正文。"}
## c-noedit-exit {"entered":{"mode":"source","valueSame":true},"after":{"mode":"edit","dirty":false,"title":"甲.md — Sidelight"},"marksBefore":3,"marksAfter":3,"noReparse":true}
## a-save-roundtrip {"bytes":"# 甲\n\n甲的正文。\n","seedSame":true,"marks":3,"dialog":null,"mode":"edit","dirty":false}
## b-source-edit {"editedValueLen":15,"mode":"edit","dirty":true,"text":"甲|甲的正文。|源码改动","bodyHasEdit":true,"marksAfter":4,"parsedAgain":true,"savedHasEdit":true,"saved":"# 甲\n\n甲的正文。\n源码改动\n"}
## z-errors {"errors":[]}
```

- `sl-parse-done` 物证：不改源码进出一次 **3 → 3**（相等）；改一个字再退出 **3 → 4**（对照成立，该跑时还跑）。
- (a) 往返后 `Ctrl+S` 盘上字节逐字节等于种子；(b) 源码编辑被应用且写回；(c) 未编辑退出不置脏、标题无 `•`。
- 假设（plan T3 风险 ③）：跳过重解析时批注重定位一并跳过——正文没变，位置仍有效。另一处偏差收益（review §四）：不再执行 `setMarkdown` 里的 `setTextSelection(0)`，光标不再被重置到文首，未改代码。

### T3 性能

`node .tmp/e2e-r42-impl-steps.mjs 9222`（1 MB 样本，5 次取中位，ms）：

| 步骤 | 改前（finder 基线） | 改后 | 门槛 |
| :--- | ---: | ---: | ---: |
| `repairTildes` | 2.8 | **0** | ≤0.3 |
| `repairCalloutMarkers` | 0.9 | **0** | ≤0.3 |
| `repairHtml` | 1.6 | **0.1** | ≤0.6 |
| `serializeDocument` | 8.5 | **3.2** | ≤5.5 |
| `guardsIncludes` | 0.4 | **0.4** | ≤0.6 |

`node .tmp/e2e-r42-impl-perf.mjs 9222`（`sourceToggle.outMs`，墙钟）：

| case | 改前 | 改后 | 门槛 |
| :--- | ---: | ---: | ---: |
| `A-100KB-1k` | 242 ms | **88 ms** | ≤140 |
| `B-1MB-1k` | 1,323 ms | **333 ms** | ≤650 |
| `C-1MB-4k` | 5,537 ms | **477 ms** | 只记录、不判 |

- 输出写到 `.tmp/perf-round42-impl.json` / `.tmp/perf-round42-impl-steps.json`，finder 的 `-code.json` / `-steps.json` 基线未覆盖。
- 4k 段 case 剩余 477 ms 主要是 76k 节点的 DOM 重建（findings-code F1 的原判据）。

### 门禁（全部串跑）

```
npx tsc --noEmit                    → exit 0
npm test                            → 29 个文件 372 条 0 fail（基线 28/362；新增 serializeDocument.test.ts 10 条）
npm run roundtrip                   → rich 5/7 完全保真（04 -4 +1 首次保存拦截 2、06 -0 +1）、source 7/7 等值；firstSaveBlocked 1/7
npm run verify                      → total raw=943090 gzip=291766 headroom=28234 files=3 max=320000 / target=310000 gap=18234 / PASS
node scripts/fidelity-acceptance.mjs → 19/19 PASS（跑完 git checkout -- shots/round-10/）
node scripts/keyboard-acceptance.mjs http://localhost:5175 → 52/52 PASS（跑完 git checkout -- shots/round-05/）
```

- 首屏 gzip **291,766 B**（第 41 轮 291,317 → **+449 B**），距硬线 28,234 B、距内部预算 18,234 B。
- `npm test` 的 372 条由 29 个 `ℹ tests N` 块求和得出（`npm test *> .tmp/impl-test.log`），`ℹ fail` 全 0。
- 2 份 acceptance 覆盖已跟踪历史截图，跑完各 `git checkout --` 还原；收尾 `git status --porcelain` 只剩本轮 4 个改动文件 + `package.json` + `src/styles.css` + 新测试文件 + 两个未跟踪目录。

## 截图（`shots/round-42/`，8 张）

| 文件 | 内容 |
| :--- | :--- |
| `impl-t1-preview-find-locked.png` | 预览 + 查找条 + 只读说明 + 替换/全部替换置灰 |
| `impl-t1-edit-replace-click.png` | 编辑态真按钮替换成功（两处「正文」→「段落」） |
| `impl-t2-esc-out.png` | Esc 后焦点在状态栏字数入口（焦点圈可见） |
| `impl-t2-toolbar-pressed.png` | 光标在加粗文字里：B 按下态 |
| `impl-t2-tablebar-danger.png` | 浅色表格条：删除三项危险色 + 分隔线 |
| `impl-t2-tablebar-danger-dark.png` | 深色同一位置（只截图，不断言） |
| `impl-t2-empty-focus.png` | 首启空文档按键盘进正文：顶部内阴影指示线 |
| `impl-t2-focus-pinned.png` | 3,000 段长文滚到中段：指示线仍钉在滚动容器顶边 |

## CHANGELOG 建议条目

已按 §五 收尾 1 写进 `docs/CHANGELOG.md` 的 `## Unreleased` → **第 42 轮**小节（13 行），包含：预览锁替换（**并写明「预览里查找条整体锁住、命中计数不再显示」这条可见代价**）、Esc 正向出口与 `isComposing` 守卫、工具栏按下态、表格条分色、焦点指示线、退出源码不重解析（三档实测数）、三个守卫（每键实测数）、保存链单测、门禁汇总与首屏 +449 B、UNVERIFIED。README 按 §五 收尾 2 改了 3 处（首屏数字 291,766 B / +449 B、能做什么 2 句、不能做什么 3 条）。

## 新踩的坑 / 复现提示

- **React 19 下 `disabled` 按钮的「DOM 改回 false 再 click」不触发 `onClick`**（`getListener` 先看 fiber props，`react-dom-client.development.js:3456-3487`）；E2E 里要验证锁定态回调没被调用，就取 `Object.keys(btn)` 里的 `__reactProps$*` 直接调，并**必须配一条编辑态正向对照**，否则「什么都没执行」也是全绿。
- **`performance.getEntriesByName('sl-parse-done')` 是比墙钟稳的判据**：DEV 下 `setMarkdown` 才打点，进出源码不改应相等；改一个字必须 +1。只读 `length` 就行，不要 `clearMarks`。
- **长文 E2E 里按过 Tab 会让文档变脏**：接着点别的文件会弹「切换文档」确认框，文件切不过去（表现成后面的选择器 30 s 超时）。脚本里换文件前 `page.reload()` 一次最省事。
- **`:has()` 在当前 `vite.config.ts` 下不会被降级**（没有 `cssTarget`/lightningcss），可以直接用；焦点指示器的验证要同时看 `.doc-body` 的 `outline-style: none` **和** `.doc-scroll` 的 `box-shadow` 含 `inset`，只看一条会漏「outline 去掉了、替代指示器没生效」。
- **`keyboard-acceptance.mjs` 必须在所有源码视图改动做完之后再跑**：它覆盖 `Ctrl+/` → `Esc` 退出源码这条正好走 `applySource` 的路径；在 T2 阶段跑等于给改前代码取证。
