# 第 83 轮验收（tester，未读 `impl.md`）

结论：**PASS-WITH-UNVERIFIED**。三条门禁全过、A1 单测与 A2 独立探针 9/9、A3 文案静态与单测全对；真机项全缺（CDP 无监听，单次尝试即停），缺口归 tester，记 UNVERIFIED。commit 前 HEAD `13cf1a3` = 轮前 startSha。

## 门禁（各跑一次）

| 项 | 读数 | 判 |
| :-- | :-- | :-: |
| `npm test` | **47 文件 601 条 0 fail**（轮前 46 / 591；A2 +6、A3 +4） | PASS |
| `npm run verify` | 首屏 gzip **304,492 B**（headroom 15,508 ≤ 310,000） | PASS |
| `npm run roundtrip` | rich **6/8**、source **8/8**，与基线同（`04`/`06` 既有 diff） | PASS |
| `inlineSyntax.test.ts` | 14 → **20 / 20** | PASS |
| `deleteDialogText.test.ts` | **4 / 4** | PASS |

日志：`.tmp/r83-tester-{npm-test,verify,roundtrip,a1-tests}.log`（601 条按 `ℹ tests N` 逐文件求和，47 文件另从 `package.json` 数）。`package.json` 只多 test 串一项。

## A1 复核用户点名的 3 条回归

- 单测（实跑）：`mathInput 5/5`、`mathReveal 10/10`、`settings 14/14`、`mathStyle 4/4`，均 0 fail。
- `src/styles.css:2137-2141` 逐条在：`.tiptap-mathematics-render[data-type='block-math'] .katex-display { margin: 0 auto; width: fit-content; min-width: 100%; }`（`2119-2123` 已过期）。
- **UNVERIFIED（归 tester）** 三项真机读数：① 段可见文本无字面 `$`/`==`（`.sl-math-reveal`、`.sl-eq-delim` 都 0）；② `.sl-eq ≥1` 且段尾打 1 字 `Ctrl+S` 读回 = 原文 + 该字；③ `.katex-display` computed `margin-left/right` = `0px`、`min-width` = 容器宽。
- 证据：`node .tmp/reset.mjs 9222` 单次 → `ECONNREFUSED`（`.tmp/r83-tester-reset-9222.log`）；9222/9223/9224/9225/9226/54280 全无监听。不重试、不换端口。未发现真回归，产品代码 0 行改动。

## A2 `\=` 字节保真（自写探针，非执行者脚本）

`.tmp/r83-tester-a2-probe.ts` → `.tmp/r83-tester-a2-probe.log`：与 App 保存链同口径（`escapeHtmlForParse` → `manager.parse` → `serializeDocumentBody`），9 行**全部** `bytesSame:true`、`stable:true`：

| case | 字节同 | 二次可见文本 | eq 节点 |
| :-- | :-: | :-- | :-: |
| `\==a== 结尾` | ✓ | `==a== 结尾` | 0 |
| `\==**b**c==` | ✓ | `==bc==` | 0 |
| `\===a===` | ✓ | `=a=` | **1**（二次仍 1） |
| `a \== b` | ✓ | `a == b` | 0 |
| `\== 单独` / `\=\=` / `x \=\= y` | ✓ | 同原文去反斜杠 | 0 |
| `a == b` / `==a====b==` | ✓ | 原样 | 0 |

另：开关关着 `\==a==` 字节同；行内代码 `` `\=` `` 不产生 mark（0）；`x \=\= y` 的 eqEscaped 落 **2 个文本节点**（`["=","="]`，slot 防合并成立）。

**静态**（`.tmp/r83-tester-static.json`，HEAD 树与工作区逐行数）：`eqEscaped` 改前 **0** → 改后 **12**（`inlineSyntax.ts` 内 6 处）；`deleteDialogText` 改前 0 → 10。App 侧 `inlineSyntaxMarks()` 已进编辑器 schema（`src/App.tsx:958`→`:1008`）。

**额外回归检查**（critic P2-1 关心的公式路径，自写 `.tmp/r83-tester-a2-math.ts`）：带 `Mathematics` 扩展、走 `protectMathPairs` 的 App 口径下 `$\alpha \= x$`、行内夹用、块级 `$…$` 三例：`inlineMath`/`blockMath` 各 1、latex = `\alpha \= x` 原样、**eqEscaped 0**、字节同 → 公式里的 TeX `\=` 未被抢。

**UNVERIFIED（归 tester）**：浏览器 6 项（`esc.md` 的 `.sl-eq` 0 / 可见含 `==a== 结尾` / `Ctrl+S` 逐字节 / 重开再存；对照 `hl.md` `.sl-eq` 1；编辑器 DOM 与 `getHTML()` 的 `.sl-eq-escaped` span 数 = `\=` 数）。

## A3 B-212 两分支共用恢复说明

- 单测 4/4：两分支都含「撤销」、恢复句 `slice(indexOf(DELETE_TRASH_DIR))` 逐字相同、路径恰 1 次且无第二处 `.sidelight`、dirty/clean 只差 lead、clean lead 含「移到这个文件夹的」、无「。，」。
- 静态：`要恢复` 改前 1（`TreeActions.tsx:292`）→ 改后 1（`deleteDialogText.ts:22`）；`文件管理器` 改前 1 → 改后 **0**；`TreeActions.tsx` 内无第二份文案、无 `.sidelight/trash/` 字面量（都从常量取）。
- 与 plan-review P2-4 的差异：实现把「用文件管理器把 trash 里的文件移回原位」改成「把回收站里的文件移回原位」，保留可执行提示但不再提外部工具；与 rev.1 验收「`文件管理器` 改后 0」一致，不算回归，只记文案取舍。
- **UNVERIFIED（归 tester）**：干净/脏两分支 `.dialog-note` 都含「撤销」且恢复句相同、删后 toast 含「撤销」。

## 未验项（合并）

用户点名 3 项的浏览器读数、A2 浏览器 6 项、A3 两分支对话框与 toast、原生打印、真实 FSA / IME / WebView2 宿主。原因：CDP 9222–9226 与 54280 无监听（沙箱禁止启动 Chromium），单次尝试后停手；`keyboard/tree` 回归脚本同样依赖 CDP，未跑。

## 收口

CHANGELOG 加第 83 轮段；STATE 加一行；BACKLOG：B-212 → `fixed`（移入 P2 表）、新开 B-213（`\=` 保真）→ `fixed`。残余：粘贴 `\=` 文本再粘回不重建 mark（critic P2-5 已知）。
