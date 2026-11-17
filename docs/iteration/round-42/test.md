# 第 42 轮 · 独立验收（tester）

- 轮次：round=42；轮前 `startSha=5b7a1f5733c04b2c8bbf80987bf1119634541bbd`（`git rev-parse HEAD` 实测相同）。
- 验收方式：只读 `plan.md` 与 `git diff`（未读 `impl.md`），按计划验收标准**自写** E2E 脚本复验；所有断言与门禁输出都是本轮本机实跑。
- 环境：dev server `http://localhost:5175`（未另起、未重启）；CDP 9222（每次先 `node .tmp/reset.mjs 9222`）；未启动 Edge、未 kill `msedge`、未 `browser.close()`；未 push、未碰 `release/`。
- 结论：**PASS-WITH-UNVERIFIED**（门禁全过、三个任务的验收标准逐条复验成立、未发现回归；UNVERIFIED 见 §5）。

## 1. 门禁（真跑输出）

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0（无输出） |
| `npm test` | **29 个文件 372 条，0 fail**（脚本实测汇总：`FILES=29 TESTS=372 FAILS=0`；新增 `serializeDocument.test.ts` 10 条） |
| `npm run build` | exit 0，`✓ built in 517ms` |
| `npm run verify` / `node scripts/measure-first-screen.mjs` | `total raw=943090 gzip=291766 headroom=28234 files=3 max=320000`、`target=310000 gap=18234`、`PASS` |
| `npm run roundtrip` | `rich: 5/7`（04-reference-links −4/+1、06-task-list −0/+1，与改前同）、`source: 7/7`、`firstSaveBlocked: 1/7` |
| `node scripts/fidelity-acceptance.mjs` | **19/19 PASS**（跑完 `git checkout -- shots/round-10/`，工作树已还原） |
| `node scripts/keyboard-acceptance.mjs` | **52/52 PASS**（跑完 `git checkout -- shots/round-05/`，工作树已还原） |

首屏 291,766 B（第 41 轮 291,317 B，**+449 B**），距硬线 320,000 余 28,234 B、距内部预算 310,000 余 18,234 B。与 `README.md:103` 写的 `+449 B` / `291,766 B` 一致。

## 2. T1 · 预览只读锁替换（脚本 `.tmp/tester-r42-t1.mjs`）

种子 `甲.md` = `# 甲\n\n第一句在正文里。第二句也在正文里。\n`；假工作区 + `Ctrl+Shift+P` 进预览。

| 验收项 | 实测 | 判 |
| :--- | :--- | :--- |
| c1 说明与禁用 | `note` = `预览是只读视图，不支持查找与替换：切回编辑（Ctrl+Shift+P）再查`；`替换`/`全部替换` `d:true`；`Aa`/`ab` `d:false`；`count` = `''` | PASS |
| c2 直接调 `replaceCurrent` | 用 `__reactProps$.onClick()`（不走 `disabled`）调用后：`.preview-pane` 文本仍是 `甲\|第一句在正文里。第二句也在正文里。`、`dirty:false`、`count:''` | PASS |
| c3 直接调 `replaceEvery` | 同上，三条断言全成立 | PASS |
| c4 退出预览 → `Ctrl+S` | `seedSame:true`、`dialog:null` | PASS |
| 正向对照 `edit-handler-control` | 退回编辑后用**同一招** → 正文变 `甲\|第一句在段落里。第二句也在正文里。`、`dirty:true`（证明该招真能调到 `replaceCurrent`，c2/c3 不是假绿） | PASS |
| 正向对照 `edit-replace-click` | 再点**真按钮** → `第二句也在段落里`；`Ctrl+S` 盘上字节含「段落」 | PASS |
| c5 源码模式不回归 | `note` 仍是源码文案、四个动作按钮 `d:true`、`count:''` | PASS |
| c6 保真不回归 | `丙.md` `same:true`；`乙.md` 字节 `> 引用行\n> <p>html 段</p>\n` —— 正是计划要求的正则 `/^> 引用行\n> <p>html 段<\/p>\n$/`（bug 第 2 条本轮不做，行为不变即通过） | PASS |

截图：`shots/round-42/tester-t1-preview-find-locked.png`（预览 + 查找条 + 说明 + 两个灰按钮）、`shots/round-42/tester-t1-edit-replace-click.png`。控制台错误 **0**。

## 3. T2 · Esc 正向出口 + 工具栏按下态 + 表格条 + 焦点指示线

脚本 `.tmp/tester-r42-t2esc.mjs`（Esc）、`.tmp/tester-r42-t2.mjs`（其余）。截图 `tester-t2-esc-out.png`、`tester-t2-empty-focus.png`、`tester-t2-focus-pinned.png`、`tester-t2-toolbar-pressed.png`、`tester-t2-tablebar-danger.png`。

| 验收项 | 实测 | 判 |
| :--- | :--- | :--- |
| 正文 Tab 缩进不回归 | 正文中段 `Tab` ×2：`textContent` 22 → **26**（+4），`activeElement` 仍是 `.ProseMirror` | PASS |
| Esc 正向出口 | `Escape` 后 `activeElement` = `BUTTON.stats-trigger`，`closest('.status-bar')` = true；`.editor.compareDocumentPosition(active)` = **4**（`DOCUMENT_POSITION_FOLLOWING`） | PASS |
| Esc 后继续向前 | 再按 `Tab` → `activeElement` 变成 `BODY`（不再停在字数入口） | PASS |
| Esc 后按 `z` | 26 → 26 不变；正对照：点回正文第 3 段按 `z` → 27（证明「不变」不是打不进字） | PASS |
| 焦点指示线（空文档） | `Shift+Tab` 出正文 → 1 次 `Tab` 回到 `.ProseMirror`；`.editor` `outline-style:none`；`.doc-scroll` `box-shadow: rgb(43,109,100) 0px 2px 0px 0px inset`；`.doc-body:focus-visible` 命中 | PASS |
| 焦点指示线（长文 3,000 段中段） | `focus-visible` 命中；`scrollTop=75,347` 时阴影仍 `inset`、`.doc-scroll` 矩形 84–872 与 900 视口相交、`.doc-body` 矩形 `top=-75,211`（正文顶部已滚出视口 → 旧写法必红） | PASS |
| 工具栏按下态（8 条） | B：`aria-pressed=true`、`is-on`、背景 `rgb(232,240,237)`；普通段落 `false`、`class` 空、背景 `rgba(0,0,0,0)`。I/S/`</>` 同口径各 2 条（激活 `italic is-on` / `strike is-on` / `mono is-on`，未激活 `italic` / `strike` / `mono`） | PASS |
| 组合类名保住打字样式（3 条 ×2 态） | I `font-style:italic`（两态都是）、S `text-decoration-line:line-through`（两态）、`</>` `font-family:ui-monospace, "Cascadia Code", Consolas, monospace`（两态） | PASS |
| 表格条 7 个 `title` | 全部非空（`在当前行上方插入行` … `删除整张表格`） | PASS |
| 危险色与分组 | 删除三项 `color:rgb(180,69,58)`（浅色 `--danger`）、插入四项 `rgb(35,84,77)`、`.table-bar-sep` **1** 个 | PASS |
| H1/H2 按下态 | 按计划「只记录不 assert」：普通段落里两者 `aria-pressed=false` | 记录 |

控制台错误 **0**。

**测试自身踩到的假阴（已排除，非产品缺陷）**：第一版脚本在文档刚载入时先 `page.click(段落)`、再插 `page.evaluate` 读焦点、然后才按 `Tab`；此时 ProseMirror 选中位置被重置到文首 `1/1`，`Tab` 走的是 `src/App.tsx:857` 的 skip-link 分支（`return false`），浏览器默认动作把焦点移走 → `tabDelta:0`、Esc 也没命中。改成「点击后停 250 ms 再按 Tab」后稳定通过；另写 `.tmp/tester-r42-debug.mjs` 用最小步骤复现同一路径（`+2` / `+2` / Esc → `stats-trigger`），确认是脚本节奏问题。这一条建议记进 AGENTS §8。

## 4. T3 · 退出源码不重解析 + 守卫 + 保存链单测

脚本 `.tmp/tester-r42-t3.mjs`（正确性）、`.tmp/tester-r42-perf.mjs`（守卫耗时，自写）、`.tmp/e2e-r42-impl-perf.mjs`（墙钟，tester 自己跑一次）。

### 4a. 物证：`sl-parse-done` 不增加（主判据）

| 场景 | 计数 | 判 |
| :--- | :--- | :--- |
| 打开 `甲.md` 静止 | 3 | 基线 |
| `Ctrl+/` 进源码（不改）→ `Ctrl+/` 退出 | **3**（相等），退出后 `dirty:false`、`titleDirty:false`、`viewMode:'edit'` | PASS |
| 正对照：进源码输入「源码改动」再退出 | 3 → **4**（该跑的时候仍跑），正文含「源码改动」、`dirty:true` | PASS |
| `乙.md`：进源码不改退出 | 5 → **5**，`dirty:false`、标题无 `•` | PASS |

`Ctrl+S` 后盘上字节 **逐字节等于种子** `# 甲\n\n第一句在正文里。\n`。

### 4b. 墙钟（`sourceToggle.outMs`，tester 本机实跑）

| case | 门槛 | 实测 | 改前（finder 基线） | 判 |
| :--- | ---: | ---: | ---: | :--- |
| A-100KB-1k | ≤140 ms | **63 ms** | 242 ms | PASS |
| B-1MB-1k | ≤650 ms | **281 ms** | 1,323 ms | PASS |
| C-1MB-4k | 只记录 | **487 ms** | 5,537 ms | 记录 |

（`.tmp/perf-round42-impl.json`，本机 `generatedAt 2026-11-17T08:12:30Z`；`loadMs` A/B/C = 770 / 2,711 / 11,010 ms。）

### 4c. 守卫收益（1 MB 样本，7 次取中位、预热后，两轮结果一致）

| 步骤 | 门槛 | 实测 | 改前 |
| :--- | ---: | ---: | ---: |
| `repairTildes` | ≤0.3 ms | **0 ms** | 2.8 ms |
| `repairCalloutMarkers` | ≤0.3 ms | **0 ms** | 0.9 ms |
| `repairHtml` | ≤0.6 ms | **0.6 ms** | 1.6 ms |
| `guardsIncludes`（4 次 `includes`） | ≤0.6 ms | **0.6 ms** | 0.4 ms |
| `serializeDocument` 合计 | ≤5.5 ms | **4.5–4.8 ms** | 8.5 ms |

单次 `includes` 成本本机 0.2 ms；`repairHtml` 三次 `includes` ≈0.6，实测正好落在门槛上（计划 R42-8 已写明「0.4–0.6 属达标，不必压线」）。

### 4d. 正确性与保真

`npm run roundtrip` rich 5/7、source 7/7、`firstSaveBlocked 1/7`，与改前一致（diff 的两条是已知限制，未变多）。

## 5. UNVERIFIED（不因此回滚）

1. **真实中文输入法组合输入期间按 `Esc` 不夺焦、不丢拼音候选**：计划 R42-3 已注明 CDP 造不出真 IME；本轮只验证了 `event.isComposing || keyCode === 229` 守卫的代码存在（`src/App.tsx:3630`）。补测：真机/WebView2 用中文输入法打拼音时按一次 Esc，看焦点是否仍在正文、候选是否只是取消。
2. **深色主题下表格条删除三项的计算色**：计划已预砍为「只截图不断言」，本轮未切深色，未取证。补测：设置 → 深色 → 保存后点表格单元格，读三项 `color` 与 `--danger` 深色值是否一致。
3. **H1/H2 在标题里时的高亮**：计划预砍「只记录不 assert」，本轮只记录了普通段落里两者为 `false`。补测：光标放进 `# 标题`/`## 标题` 后读 `aria-pressed`。
4. **宿主 WebView2 下 `:has()` 是否生效**：本轮只在 dev Chromium 验证（`.doc-scroll` 的 `inset` 阴影命中）。生产 `dist` 的 CSS 原样保留 `:has()`；宿主内核是 Chromium（105+ 才有 `:has()`），但未在宿主里实跑。计划已给 fallback（`.doc-scroll:focus-within`），补测：装一次包或跑 `host-smoke` 后按 Esc/Tab 进正文看顶部青线。
5. 安装包体积与 `release/`：本轮「不发版、不改 `release/`」，未打安装包，无新体积数据（最后实测仍是第 39 轮的 setup 1,300,711 B / 便携 zip 1,622,355 B）。
6. `data-safety` / `session` / `host-*` 套件：按惯例（依赖假 FSA 或宿主）未跑；本轮改动未触及这些路径，`applySource` 的影响面已由 T3 验收 2 覆盖。

## 6. 文档复核

- `package.json` 版本仍 **0.32.1**（计划「不发版」）。
- `README.md`：「现在能做什么」补了预览锁与 Esc 正向出口；「现在不能做什么」补了三条（预览查找不显示命中数、批注卡片不能 Tab、表格条贴靠与拖拽未支持）；首屏数字 `291,766 B` / `+449 B` 与本轮实测一致。
- `docs/CHANGELOG.md`：`## Unreleased` 有第 42 轮小节，含 T1/T2/T3、门禁数字与 UNVERIFIED。**一处数字按本轮独立实测校正**：`repairHtml` 由计划/实施口径的 0.1 ms 改为 0.6 ms（实施那一轮自己的 `guardsIncludes` 4 次是 0.4 ms，3 次 `includes` 的守卫不可能低于 0.3 ms，0.1 是取整/计时噪声；本轮两次独立跑都是 0.6，且门槛就是 ≤0.6）。
- 本轮已更新 `AGENTS.md` §3 测试条数注释、§6 当前状态、§8 新增一条测试脚本踩坑，并更新 `docs/iteration/STATE.md`。

## 7. 判定

**PASS-WITH-UNVERIFIED**。理由：门禁全过（tsc / test 29-372 / build / 首屏 291,766 PASS / roundtrip / fidelity 19-19 / keyboard 52-52）；T1/T2/T3 的每条验收标准都由 tester 自写脚本实跑成立，且关键项都带正向对照（c2/c3 的 `edit-handler-control`、T3 的「改一个字必须 +1」、T2 的「Esc 后按 z 打不进去但点回正文能打进去」）；未发现回归。UNVERIFIED 6 条已写清补测方法，均不涉及本轮代码正确性。
