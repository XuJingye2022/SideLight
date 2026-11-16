# 第 29 轮 · 实现报告（executor，CDP 9222）

- 角色：执行代理（单人，无并行 builder）；只写产品代码与证据脚本，未 commit、未 push、未 bump 版本、未动 `release/`。
- 输入：`docs/iteration/round-29/plan.md`（revision 3）、`plan-review.md`（critic，结论 REVISE）、`AGENTS.md`、`STATE.md`、相关源码。
- 结论：**T1 与 T3 落地，门禁全绿（tsc / test / build / 首屏 PASS）；T2 未做，标 BLOCKED（字节账按 plan-review 修正后不成立）**。

## 1. 逐任务状态

| 任务 | 状态 | 证据 |
| --- | --- | --- |
| T1 保存后不再写陈旧草稿 + 超大文件提示说清「仍在哪一篇」 | **DONE（代码 + 门禁 + e2e 部分断言；负向对照未做）** | 见 3.1 |
| T2 状态栏字数点击弹出明细 | **BLOCKED（未实施）** | 见 2 |
| T3 大纲折叠（父子树 + 折叠后定位当前节） | **DONE（代码 + 单测 + e2e + 截图）** | 见 3.3 / 4 |
| T1 子项 3（首屏预算默认值 286,000 一处化） | DONE | 见 3.2 |
| T1 子项 4（文档与文案） | DONE（README 两处 + FindBar） | 见 3.2 |

## 2. T2 为什么没做（BLOCKED）

plan-review 的 P0-1 已实测：把 T2 的首屏写法追加到真实 entry JS 尾部会漏掉 Vite 的三笔真实开销（懒 CSS 的 `__vite__mapDeps` +31 B、编译后的 `AS()` 包装 +32 B、假 react 导入多算 −25 B），修正后 T2 ≈ **+197 B**，加 `.status-count` 复位 +12 B ≈ **+209 B**。

本机实测基线：`285,783`（`node scripts/measure-first-screen.mjs`，max 286,000，余 **217 B**）。我做 T1 + T3 后实际首屏是 **285,838 B**（余 162 B）；再叠加 T2 的约 +209 B → **≈286,047 B**，破 286,000 线。按 plan.md 第 3 节杠杆 1/2/3 逐条算也压不到线内（提示短句 −9、删 `.status-count` −12 后仍 ≈286,026）。**按计划自己的规则：超线就停止并上报，不抬线、不塞半成品**，所以 T2 整项不做，不在 `StatusBar` 留死代码。下一轮入口：先做 plan-review P0-1 建议的 `.tmp/build-spike` 最小构建 spike 重新定量，或先找 ≥100 B 的抵消项，再实现 T2。

> 注：plan.md revision 3 第 3 节的总账（≤285,985）与 plan-review 的修正账（≈286,099～286,397）互相矛盾；本报告采用 plan-review 的实测修正账，因为它有可复跑脚本。

## 3. 改动与验收

### 3.1 T1 数据安全

**改动文件**

| 文件 | 位置 | 改什么 |
| --- | --- | --- |
| `src/App.tsx` | `:846-871` | 800 ms 草稿定时器加守卫：回调里取 `targetPath`/`generation`，定义 `stale()`（`!dirty \|\| 路径变 \|\| deleting \|\| 代际变`），在 `parentDirectory` **前、后**各判一次，`await writeCache` 之后**再判一次**；最后一次为真时 `await removeCache(dir,'draft',key)` 补删（覆盖 writeCache 内部 3 段 await 的窗口） |
| `src/App.tsx` | `:2505-2516` | `finishSaved` 清草稿前先 `clearTimeout(draftTimerRef.current)` 置 null，再 `draftGenerationRef.current += 1`（与宿主草稿同一套 pattern） |
| `src/App.tsx` | `:2091-2100` | 组件内助手 `tooLargeNote(name)` = `「${name}」超过 5.5 MiB，仍在「${docNameRef.current}」`，读 ref 所以不会闭包过期；`openSingleFile` 的 `'tooLarge'` 分支改用它 |
| `src/App.tsx` | `:2117-2125` | `openWorkspaceFile` 的 `catch`：`error instanceof Error && error.message.includes('文件太大')` 时用同一个助手，其他错误仍 `messageOf(error)` |
| `src/components/FindBar.tsx` | `:56` | 查询为空时不显示「无结果」：`{query.trim() === '' ? '' : total === 0 ? '无结果' : …}` |

**修复根因**（与 plan 一致）：`deriveTimer`（300 ms）回调里再排 800 ms 草稿定时器，`finishSaved` 只删草稿文件、不清计时器、不推进代际，于是保存后约 1.1 s 草稿复活；复活草稿走另一条序列化路径（表格重排），下次「恢复」会把已保存的新文件覆盖成旧结构——数据损失路径。

**验收**

- `npx tsc --noEmit` → exit 0（`TSC_EXIT=0`）。
- e2e `.tmp/e2e-r29-t1t3.mjs`（CDP 9222，假工作区 `.tmp/r29-fsa.mjs`，输出 `.tmp/e2e-r29-t1t3.mjs` 运行时打印）：
  - 断言 A（连续 3 次）：保存后等 1600 ms，`.sidelight/drafts/` 下**没有**草稿键；磁盘 `未命名.md` 内容 == 编辑器正文。实测 `A 第N次 草稿键 => []` ×3，磁盘内容逐次包含新追加句。
  - 断言 A2（在飞窗口）：打字后 1000 ms 设 `window.__fsDelayGetDirOnce = 900`（一次性，只被草稿的 `parentDirectory` 消费），1200 ms 按 `Ctrl+S`，等 2600 ms → 草稿键 `[]`，磁盘正确。实测通过。
  - 控制台 error = 0。
- **UNVERIFIED（两条，必须写清）**：
  1. **缺负向对照**：没有临时注释掉守卫再跑一次证明断言会红。因此 A/A2 通过只能证明「保存后确实没有草稿残留」，不能单独证明是守卫（而不是 `finishSaved` 的 `clearTimeout`）兜住了在飞窗口。plan-review P1-2 要求的「先红后绿」没做，原因是时间预算（本轮单代理 25 min）。
  2. 断言 B（超大文件提示）：脚本里往假工作区塞 6 MiB `大.md` 后重新打开文件夹，没有抓到提示文本（`.toast, .notice` 为 `none`），也没确认点击是否命中该文件，标题仍为 `Sidelight`。**这条没有证据，记 UNVERIFIED**；代码改动本身由 `tsc` 与代码审阅保证，真实界面路径未验。
- 未跑 `npm run roundtrip`：本轮不改 markdown 序列化（App.tsx 只动草稿守卫与提示文案）。

### 3.2 T1 子项 3 / 4

- `scripts/measure-first-screen.mjs:2,15`：默认 `--max` 由 `285000` 改 `286000`。`node scripts/measure-first-screen.mjs`（无参数）→ `max=286000`、`gzip=285838`、**PASS**。
- `.github/workflows/ci.yml:39`：`node scripts/measure-first-screen.mjs`（去掉 `--max 286000`，预算只在脚本默认值一处）。
- `docs/adr/0012-katex-lazy-loading.md:43`：判据行改 `--max 286000`；`:44-45` 历史结论不动。
- `README.md:51`：字号复位改 `Ctrl + Alt + 0`（`Ctrl + 0` 是正文样式）。
- `README.md:76`：超大文件不再写「并清空正文」，改为「提示写清『仍在哪一篇』，正文保留上一篇（不清空）」。
- `git grep -n "measure --max 285000" -- docs/adr scripts .github` → 0 命中（实测：只剩历史轮次 docs 里的旧记录，`docs/adr` 已改）。

### 3.3 T3 大纲折叠

**改动文件**

| 文件 | 改什么 |
| --- | --- |
| `src/lib/outlineTree.ts`（新建） | `OutlineNode` 类型 + `buildOutlineTree`（level 单调栈补 `parentId`/`hasChildren`，跳级 H1→H3 归 H1）+ `expandAncestors`（清当前节全部祖先的折叠标记，无变化返回原集合）+ `visibleActiveId`（当前节被折叠时返回**最外层**被折叠祖先）。**没有放进 `outline.ts`**：那个模块被 `App.tsx:71` 静态 import，放进去会让三个函数进首屏（plan-review P0-1 实测 +298 B）。 |
| `src/lib/outline.test.ts` | 末尾追加 3 条（树结构 + 跳级、`expandAncestors`、`visibleActiveId`），只 import `outlineTree.ts`；既有 7 条不动 |
| `src/components/Outline.tsx`（重写渲染） | `useMemo(buildOutlineTree)` + `useState<Set<string>>` 折叠集合 + `useEffect` 在 `activeId` 变化时 `expandAncestors`；只渲染可见行；外层 `<nav style={{display:'grid',gridTemplateColumns:'14px minmax(0,1fr)'}}>`（**行内 style，首屏 0 B**）；每行两个同级元素：有子级时 `<button className="outline-toggle" aria-expanded aria-label>`（`▸`/`▾`，行内 style 重置外观），否则 `<span aria-hidden>` 占位，再是原 `button.outline-item`（class、`aria-current`、`title`、`onJump` 保留） |
| `src/styles.css` | 删 5 段 0 引用规则：`.sr-only`（原 `:171-182`）、`.dialog-input,` 选择器项（原 `:1922`，保留 `.dialog-textarea`）、`.popover-title`/`.popover-note`/`.popover-actions`（原 `:2245-2263`）。`.popover` 基类、`.note-kind-*`、`.annot-*` **未动**（`git grep` 复核只命中定义处） |

**为什么没搬 `.outline*` 到懒 CSS**：plan 记搬运 −49 B，plan-review 实测扣掉 Vite 的 `__vite__mapDeps`（+27）与 `AS()` 包装（+14）后只剩 **−8 B**，还要承担「Vite 把 CSS 并回首屏则零收益」的验证成本。本轮时间不足，按最小改动跳过；`.outline-item` 四段样式仍在首屏 CSS（不影响功能），报告记下这 8 B 的潜在收益。

**验收**

- `npx tsc --noEmit` → 0；`node --experimental-strip-types src/lib/outline.test.ts` → 10 条全过（原 7 + 新 3）。
- e2e（`.tmp/e2e-r29-t1t3.mjs`）：源码里构造 `一`/`一甲`/`一甲子`/`一乙`/`二` 五个标题后打开大纲（`Ctrl+Shift+1`）：
  - `.outline-item` 5 行，`.outline-toggle` 2 个（「一」「一甲」有子级），`aria-expanded` 全 `true`；
  - 点「一」的 toggle → 可见行 **2**（「一」「二」），toggle `aria-expanded="false"`，**「一」行带 `aria-current="location"`**（折叠后仍能定位当前节）；
  - 再把光标移到正文里被折叠的「一甲子」标题 → 自动展开：行数回 5，两个 toggle 都 `true`，`aria-current` 落在「一甲子」行；
  - 控制台 error 0。
- 截图：`shots/round-29/outline-folded.png`（折叠「一」、祖先高亮）、`shots/round-29/outline-fold-reveal.png`（光标回到子节后自动展开）。
- 未做：折叠集合持久化（Typora 同为会话内）、长文编辑后位置漂移（`h-<pos>` id）——见 UNVERIFIED。

## 4. 门禁与体积（实测）

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | exit 0，**17 个文件 251 条**（248 + T3 的 3 条），fail 0 |
| `npm run build` | exit 0（`index-CyWsDpum.js` 895.84 kB / gzip 282.20 kB，`index-DteRiUms.css` 33.59 kB / gzip 7.06 kB，`Outline-DxriUHlq.js` 2.08 kB / gzip 1.02 kB） |
| `node scripts/measure-first-screen.mjs`（无参数） | `total raw=929441 gzip=285838 files=2 max=286000` → **PASS**，余 **162 B** |
| `npm run roundtrip` | 未跑（不改序列化） |

首屏账对照：基线 285,783 − 死 CSS 76 + T1（守卫 + 提示 + FindBar 净额约 131） + T3（大纲折叠全在懒 chunk，0 B） = **285,838**，比 plan 的上界 285,985 少 147 B；T2 的 209 B 因此确实塞不下（285,838 + 209 = 286,047 > 286,000）。

## 5. 截图

- `shots/round-29/outline-folded.png`：大纲折叠「一」后只剩 2 行，祖先行高亮。
- `shots/round-29/outline-fold-reveal.png`：光标回到「一甲子」后自动展开，`aria-current` 在子行。

（T1 无界面变化，不截图；证据是 e2e 输出。T2 未做，`stats-detail*.png` 不产出。）

## 6. CHANGELOG 建议条目（`## Unreleased`）

```markdown
## Unreleased

- 修复：保存成功后仍会写回的陈旧草稿不再复活（清计时器 + 代际守卫，覆盖写入落在保存窗口内的情形），避免下次恢复草稿把已保存的新文件覆盖成旧结构。
- 修复：打开超过 5.5 MiB 的文件被拒时，提示写清正文仍停留在哪一篇；查找框刚打开时不再显示「无结果」。
- 新增：大纲支持折叠（父子树、有子级的标题可折叠，当前节在折叠子树里时自动展开并高亮折叠祖先）。
- 工程：首屏预算默认值统一为 286,000 B（脚本默认值一处，CI 不再另传 `--max`）；删除 5 段零引用 CSS。
- 测试：17 个文件 251 条；首屏 gzip 285,838 B（≤286,000，余 162 B）。
```

README 建议（根代理收尾）：`README.md:31` 大纲那句补「可折叠」；`docs/typora-gap.md` 的「21 项有 / 18 项缺」待复核（本轮未动）。

## 7. 新踩坑

- **不要用 PowerShell `Get-Content`/`Set-Content` 改写含中文的脚本**：无 BOM 的 UTF-8 会被按 ANSI 读，写入后中文变成乱码、字符串引号被破坏（本轮把 `.tmp/e2e-r29-t1t3.mjs` 改坏一次，报 `SyntaxError: Invalid or unexpected token`）。改文件一律用 read/write/edit 工具。
- **e2e 里 localStorage 要清在 `page.goto` 之前的效果**：本轮顺序是 goto → 清 localStorage，结果首屏仍从 IndexedDB/本地存储恢复了上一篇，污染了「大纲折叠」断言（多出一行把正文段落当标题）。正确做法是 `addInitScript` 里清，或清完再 `reload`。
- **假 FSA 的盘上键是不带工作区名前缀的**（`未命名.md`，不是 `示例文集/未命名.md`）：`parentDirectory` 会 `slice(1,-1)` 去掉第一段，但假 `entries()` 从根遍历，根级文件键就是裸文件名。
- **一次性延迟开关**（`window.__fsDelayGetDirOnce`）比常开延迟好用：常开延迟会被 `finishSaved` 的 `removeCache` 也消费，测试最终仍删掉草稿，未修实现也能 PASS（plan-review P1-2 的结论，本轮实测复现了这个设计要点）。

## 8. UNVERIFIED 清单

1. T1 断言 A/A2 的**负向对照**（临时去守卫是否必红）——没做。
2. 超大文件提示的界面路径（e2e 断言 B 没抓到提示文本）。
3. 长文编辑后大纲折叠集合是否错位（`h-<pos>` id 随内容漂移）。
4. 大纲折叠 toggle 的真实 Tab 顺序与读屏表现（只验了 `aria-expanded`/`aria-label`/`aria-current` 属性）。
5. 面板/折叠在源码模式、预览模式切换后的表现（本轮没做 T2 面板）。
6. macOS 侧全部（本机 Windows）。
