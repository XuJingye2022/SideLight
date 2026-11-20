# 第 113 轮计划审查（critic，revision 2）

结论：**PASS**。上一版 6 条 CR 全部核销；剩 4 条 P2 属执行口径，不阻塞。
轮前 `9e4990c`，工作树只多 `docs/iteration/round-113/`（`git status` 已核）；`shots/round-113/` 不存在（`Test-Path` = False）。

## 上一版 6 条逐条核销

- **CR-1（P1）已修**：A3 改「新建脚本」，A3.1 明写不复制 A/B 两段与 `round-112` 的 401 截图；A3.6 回归前后 `git checkout -- shots/round-112 shots/round-96`；验收加 `git status --porcelain shots/round-96 shots/round-112` 为空。四处被覆盖路径已核实且已跟踪：`r112-finder-bug.mjs:217/:243`、`r112-tester-a1-scroll.mjs:231`、`r96-tester-a1a2.mjs:238`（`git ls-files`）。
- **CR-2 已修**：A2 写 18→20；实测 `Select-String '^test\(' src/lib/chat.test.ts` = **18**，算术对。
- **CR-3 已修**：A3 改「新建脚本」，A3.4 先 a+b 再 c/d、只到 b 记 UNVERIFIED 并写原因。
- **CR-4 已修**：A3.2 开头 `mkdirSync('shots/round-113',{recursive:true})`，照 `r96-tester-a1a2.mjs:15`。
- **CR-5 已修**：A3.7 把 B-243（`BACKLOG.md:124`，open）改 fixed；旧行号 `:191`/`:214-216` → `:196`/`:213-215`，与 HEAD 实测一致（占位 `MarginRail.tsx:196`、catch `:213`、`:215` 只 `setChatError`）。
- **CR-6 已修**：§1 口径分开（门 ±0～10 B、chunk 6,884→6,974～7,064、门+chunk 322,187～322,287）；实测 `MarginRail-CB5tvYeF.js` raw 19,493 / gzip9 **6,884**、`.tmp/r112-verify.log` gzip **315,213** / headroom **4,787**，与计划一致；A3.7 补 Deferred 行。

## 方案可行性（抽查）

- 成因链对：`:196` 先塞空 assistant、`:213-215` catch 只写 `chatError`、`:724` 的 `turn.text ||` 非 busy 时输出空串。401 经 `errorCopy` 落「API Key 无效」（`src/lib/ai.ts:93`），A3 断言字面可达；错误后输入框只随 `busy`/空串 disabled（`:736-753`），判据 b 第二次发送可达。
- `chat.ts` 只被 `MarginRail.tsx:18`（`App.tsx:20-21` 的 `lazy()`）与 `chat.test.ts:18` 引用 → 新函数进懒 chunk，首屏门不涨；`chat.test.ts` 在 `npm test` 链（`package.json` 已核）；A2 的读源码静态门有先例（`chat.test.ts:130/157/192` 的 `readFileSync('src/components/MarginRail.tsx')`，cwd 为仓库根）。
- `dropEmptyAssistantTail` 返回同一引用 ⇒ React 直接 bail out；`catch (` 全文件仅 1 处（`:213`），静态门锚点唯一。

## 新发现 P2（不阻塞）

**N-1 行号区间自相重叠**：A3.1 借 `:152-168`，同时又写「不复制 A/B 两段 `:161-243`」——重叠 8 行，按字面无法同时满足。
修法：改「借 `:1-28`、`:30-106`、`:108-125`、`:149-168`；`:169-243`（A/B 断言与两张截图）不借、不写」。

**N-2 证据文件名未定**：A3 验收要「截图存在且 >0 B」「JSON 落盘」，但步骤只 mkdir，且 A3.1 明确不写旧 401 截图——可能整轮 0 张，验收无法机械核对。
修法：点名 `shots/round-113/chat-401-no-bubble.png`（判据 a 后写）与 `.tmp/r113-chat-401.json`。

**N-3 A1 验收与 A3.7 冲突**：A1 写「`git diff --stat` 仅这两文件 + `chat.test.ts`」，A3.7 改已跟踪的 `docs/iteration/BACKLOG.md`，收尾复验必多一行。
修法：改 `git diff --stat -- src`，或写「产品代码仅 3 文件」。

**N-4 A3.7 口径与表格式冲突**：Deferred 小节是 5 列表格（ID/区域/问题/原因/轮），加行必须有新 ID，与「BACKLOG 不加新条」自相矛盾；小节标题实为 `## Deferred（不阻塞停止）`。
修法：写「不加 open 条目；Deferred 表加 1 行（新 ID，如 B-246，5 列齐）」。

## 体积判定

门 `--max 316000` 余 787 B，本轮净增 ±10 B：**放行**。真实首载（315,213 + 常驻 chunk 6,884）= **322,097**，超硬线 **2,097 B**，属 **B-229 open**（口径由 lead 定），本轮 +90～180 B 不新增超线责任；test.md 记两个口径。用户参数里的 312,423 / 余 7,577 已过期，以实测 315,213 / 4,787 为准（计划已如此）。
