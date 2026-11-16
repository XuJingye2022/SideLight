# 第 29 轮 · 独立验收（tester）

- 验收人：tester（首次、独立；**未读 `impl.md`**，只读 `plan.md`、`git diff`、`STATE.md`、`README.md`、`AGENTS.md`、源码）
- 时间：2026-11-17 00:04–00:35（Asia/Shanghai）
- 环境：Windows 11，Node 24.21，dev server `http://localhost:5175`（未重启、未另起），headless Edge CDP **9222**（`node .tmp/reset.mjs 9222` 已清 localStorage/IndexedDB）
- 基线：HEAD `853966d`（0.32.1）；工作树未提交改动见 `git diff --stat`（`src/App.tsx`、`src/components/Outline.tsx`、`src/lib/outlineTree.ts`（新）、`src/lib/outline.test.ts`、`src/components/FindBar.tsx`、`src/styles.css`、`scripts/measure-first-screen.mjs`、`.github/workflows/ci.yml`、`README.md`、`docs/adr/0012-katex-lazy-loading.md`）

## 结论：PASS-WITH-UNVERIFIED

- 四项门禁全过（`tsc` 0、`npm test` 251/251、`npm run build` 0、首屏 **285,838 B** ≤ 286,000）。
- T1 主路径（保存后草稿不复活）与 T3（大纲折叠）逐条复验通过；**T1 断言 B 因运行时取到中间版本未能可信复验**，记 UNVERIFIED。
- **T2（状态栏字数点击明细）在工作树里完全没有实现**（`git status` 无 `StatusBar.tsx`/`StatsDetail.tsx`/`sentenceStats.ts` 改动，`git branch -a`/`git stash list` 也没有别处副本）。计划第 8 节期望 17 文件 **254** 条，实测 **251** 条（=248+3，只有 T3 的 3 条）。这不是「验收造假」，而是**计划内 P1 任务未做**：按本轮的判定规则（FAIL 只在门禁破/造假/回归时给）不判 FAIL，但 T2 必须进下一轮待办，不能当成本轮已完成。
- 与计划的偏差（不影响门禁）：T3 的 `.outline*` 四段样式**没有**搬进懒 CSS（`outline.css` 不存在，首屏 CSS 里仍有 3 处 `.outline-item`），计划 §8.5 的「首屏 CSS 不含 `.outline-item`」未达成；收益 −49 B 未发生，但总账仍过线。

## 1. 门禁（命令与真实输出）

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| `npx tsc --noEmit` | exit **0**（`TSC_EXIT=0`） | 终端输出 |
| `npm test` | 17 个测试文件、**251 条**、fail **0**（10+22+10+8+16+49+11+11+16+10+6+16+16+27+12+6+5=251） | 完整日志 `.tmp/test-r29.log`（391 行） |
| `npm run build` | exit **0**，`✓ built in 230ms` | 产物 `dist/`：`index-CyWsDpum.js` 895.84 kB / gzip 282.20 kB，`index-DteRiUms.css` 33.59 kB / gzip 7.06 kB |
| `node scripts/measure-first-screen.mjs` | `total raw=929441 gzip=285838 files=2 max=286000` → **PASS**，余 **162 B** | 命令输出；默认线已是 286,000（`scripts/measure-first-screen.mjs:15`） |
| `npm run roundtrip` | **未跑**：本轮不改编辑器内核与 Markdown 序列化（diff 只动提示/草稿守卫/大纲渲染/样式/脚本），按 `AGENTS.md:27` 不跑 | `git diff --stat` |

首屏核对：

- `dist/assets/index-*.css` 里仍有 `.outline-item` 共 **3 处** → 计划的「搬懒 CSS −49 B」没做（见偏差）。
- `dist/assets/` 只有 `index-*.css` 与 `katexLoader-*.css` 两个 CSS，**没有** `outline-*.css`；`Outline-DxriUHlq.js` 2.08 kB（懒 chunk，gzip 1.02 kB）。
- `node scripts/measure-first-screen.mjs` 无参数 `max=286000` 正确；`git grep -n "285000" -- docs/adr scripts .github` → **0 命中**。
- T1 子项 4 文案核对：`git grep -n "Ctrl + 0\` 复位\|并清空正文" -- README.md` → 0 命中（`README.md:51`、`:76` 已改对）。
- 无新增依赖：`git diff --name-only package.json package-lock.json` 为空。

## 2. 逐条验收（不信任实施报告，自己写脚本）

脚本：`.tmp/e2e-r29-tester.mjs`（连 `chromium.connectOverCDP('http://127.0.0.1:9222')`，假工作区用 `.tmp/r29-fsa.mjs`，结尾 `await browser.close(); process.exit(0)`）。
结果：`.tmp/e2e-r29-tester.json` —— **24 条断言，23 PASS，1 FAIL（T1 断言 B，见下）**，控制台 error **0**。

### T1 数据安全

| 断言 | 结果 | 证据 |
| --- | --- | --- |
| 断言 A（连跑 3 次）：打开 `甲.md` → 末尾打字 → `Ctrl+S` → 等 1800 ms → `.sidelight/drafts/*` **不存在** | **PASS ×3** | e2e 3 组 `drafts=[]` |
| 断言 A：磁盘 `甲.md` 含刚输入的 `ZZ1/ZZ2/ZZ3` | **PASS ×3** | 假工作区 `__fsState.files` 读回 |
| 断言 A2（`parentDirectory` await 窗口）：打字后设 `window.__fsDelayGetDirOnce=900` 并立刻 `Ctrl+S` → 等 2800 ms → 无草稿、磁盘含 `ZZDELAY` | **PASS** | 同上 |
| 断言 B：点开 6 MiB `大.md` → 提示含「仍在」+ 当前文档名，正文与标题仍是上一篇 | **FAIL（环境原因，记 UNVERIFIED）** | toast 实际文本是旧文案 `文件太大，暂不支持（上限 5.5 MiB）。`；正文确实保留上一篇（这条通过） |

**断言 B 为什么不能判产品缺陷**：运行时执行的是 **App.tsx 的中间版本**。

- 从 React fiber 读到的实时 `onOpenFile` 源码只有 `setNotice({ text: messageOf(error) })`，没有 `tooLargeNote` 分支（`.tmp/probe-r29g.mjs`、`probe-r29h.mjs` 输出）。
- 但 dev server 5175 返回的 `/src/App.tsx` 正文**有** `tooLargeNote`，磁盘 `src/App.tsx:2105,2112,2133` 也有。
- 同一页面里 T1 的草稿守卫**是新版**（否则断言 A 会红），说明页面拿到的是「守卫已加、提示未加」的中间快照，即 Vite HMR 没把最后一笔更新应用到已打开的页面。
- 按本轮指令「不得重启 dev server」，我没重启；因此**无法区分产品代码与陈旧模块**。→ UNVERIFIED，下轮补测方法见第 5 节。

### T2 状态栏字数点击明细

**未实现，无法复验**。`src/components/StatusBar.tsx` 与基线一致（字数仍是 `<span>`，无 `button`/`lazy`/`useState`），`git status` 无 `src/components/StatsDetail.tsx`、`src/lib/sentenceStats.ts`、`statsDetail.css`。计划 §8 的 251→254 条测试、`#stats-detail`、5/6 行数字、`aria-expanded`、`shots/round-29/stats-detail*.png` 全部不具备。

### T3 大纲折叠

| 断言 | 结果 | 证据 |
| --- | --- | --- |
| 源码模式写入 `# 一 / ## 一甲 / ### 一甲子 / ## 一乙 / # 二`，切回富文本，`Ctrl+Shift+1` | 大纲出现 | 截图 |
| `.outline-toggle` 数 = 2（「一」「一甲」有子级），初始 `aria-expanded` 全 `true` | **PASS**（2 / `["true","true"]`） | e2e |
| 初始 5 行 | **PASS** | 5 |
| 光标进「一甲子」→ 点「一」toggle → 可见 2 行、`aria-expanded=false`、「一」行 `aria-current="location"` + `is-active` | **PASS** | `["一","二"]`，active=`["一"]`，截图 `shots/round-29/outline-folded.png` |
| 再展开 → `aria-current` 回到「一甲子」 | **PASS** | active=`["一甲子"]` |
| 光标到「二」→「一」不再 `aria-current` | **PASS** | active=`["二"]` |
| 折叠「一」后把光标放进正文里的「一甲子」→ 祖先自动展开、5 行、高亮在子行 | **PASS** | `aria-expanded=true`、5 行、active=`["一甲子"]`，截图 `shots/round-29/outline-fold-reveal.png` |
| 单标题文档 toggle 数 = 0 | **PASS** | 0 |

截图（本轮我自己在 9222 上重拍的，覆盖同名旧图）：

- `shots/round-29/outline-folded.png` — 折叠「一」、可见 2 行、祖先高亮
- `shots/round-29/outline-fold-reveal.png` — 光标回子节后自动展开、高亮在「一甲子」
- `shots/round-29/t1-too-large-notice.png` — 6 MiB 被拒时的提示（**含旧文案**，见断言 B）

## 3. 回归（与本轮相关的既有脚本）

| 脚本 | 结果 | 说明 |
| --- | --- | --- |
| `node scripts/draft-acceptance.mjs` | **57/57 PASS** | 草稿/自动保存/输入法/设置面板/文件菜单；宿主段 `SKIP 宿主段：CDP 没起来`（预期，非桌面宿主环境） |
| `node scripts/keyboard-acceptance.mjs` | **49/49 PASS** | 键盘路径，覆盖 T3 用到的 `Ctrl+Shift+1`；`role=alert`/live region 断言全过 |

（本轮没跑 tree/session/theme：`git diff` 未触及文件树逻辑、会话恢复、主题；大纲折叠新增的 Tab 停靠点只影响大纲内部，已由 T3 e2e 的键盘跳转覆盖。时间预算 25 min 内优先跑了与改动最相关的 draft + keyboard。）

## 4. 计划偏差清单（不判 FAIL，但必须记）

1. **T2 全部未做**：P1、产品负责人点名。计划 §8 期望 254 条测试，实测 251。下一轮必须补（含 `sentenceStats.ts`、`StatsDetail.tsx`、`statsDetail.css`、`StatusBar` props、2 张截图）。
2. **T3 的懒 CSS 搬移未做**：无 `src/components/outline.css`；`dist` 首屏 CSS 仍有 3 处 `.outline-item`；计划 §8.5 的核对项不成立。首屏因此少拿 −49 B，但实测 285,838 B 仍在 286,000 内（余 162 B）。副作用：`styles.css` 删了 5 段死 CSS（−76 B）已核实 0 引用（`.sr-only`/`.popover-*` 在 `src` 中 `git grep` 0 命中）。
3. **`.status-count` 复位样式未加**（T2 的依赖；T2 未做属一致性）。
4. 计划把三函数放 `src/lib/outline.ts`，实现放进了**新文件** `src/lib/outlineTree.ts`（`outline.ts` 未改）；单测、行为与验收项不受影响，但属于计划外的新模块，报告与 CHANGELOG 要写清。
5. 计划 §6 说「本轮不发版、不 bump」，与派工提示的通用收尾规则（按语义化 bump）**冲突**；本次按轮次专属的 plan §6 执行：**不 bump `package.json`（仍 0.32.1）**，CHANGELOG 记 `## Unreleased`。根代理若决定发版，再按发布流程 bump 到 0.33.0。

## 5. UNVERIFIED（哪条、为什么、下轮怎么补）

| 项 | 为什么测不了 | 下轮怎么补 |
| --- | --- | --- |
| T1 断言 B：文件树点开 >5.5 MiB 的提示是否已说清「仍在哪一篇」 | 运行时执行的是 App.tsx 中间版本（fiber 源码无 `tooLargeNote`，dev server 源码有）；按指令不得重启 5175，无法排除 Vite 模块缓存 | 根代理重启 dev server（或新会话）后重跑 `.tmp/e2e-r29-tester.mjs` 的 T1-B 段；3 分钟 |
| T2 全部验收项 | 工作树里没有 T2 的任何代码 | 下一轮实现后按 plan §4 T2 验收标准重验 |
| 离线首次点开明细面板 | T2 未做 | T2 落地后开 DevTools Offline 点字数，看 `Suspense fallback=null` 的空白是否可接受 |
| 长文编辑后大纲折叠是否错位（`h-<pos>` id 随正文位置漂移） | 折叠集合只在组件内存，位置 id 会随编辑变化；本轮 e2e 只覆盖静态文档 | 写 30+ 标题长文，折叠中间节点 → 顶部插入一段 → 看折叠是否对到别的标题 |
| 大纲折叠按钮的真实 Tab 顺序/读屏表现 | 无真实屏幕阅读器；只验了 DOM（`aria-expanded`/`aria-label`/`aria-current`） | VoiceOver/NVDA 实录走一遍大纲 |
| macOS 侧全部 | 本机 Windows | 后续在 macOS 上跑 |
| 首屏在 `localhost:5175` 之外的产物一致性 | 只量了 `dist`（即 `npm run build` 产物），未量 lint/CI 环境 | CI gate 已改为 `node scripts/measure-first-screen.mjs`（无参数 286,000），随 CI 跑 |

## 6. 复现命令

```bash
npx tsc --noEmit
npm test
npm run build
node scripts/measure-first-screen.mjs
node .tmp/reset.mjs 9222
node .tmp/e2e-r29-tester.mjs 9222   # 输出 .tmp/e2e-r29-tester.json，截图 3 张
node scripts/draft-acceptance.mjs   # 57/57
```
