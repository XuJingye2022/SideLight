# 第 55 轮测试报告（tester，独立验收）

轮前 `startSha` = `f686b63114d121c3f0dcce1eec09462c497a7edc`。未读 `impl.md`；只按任务验收标准、`git diff`、`BACKLOG.md` 从零复验。
**判定：PASS**（1 条 UNVERIFIED 见末节）。

## 门禁（一次跑完）

- `npm run verify` **PASS**：首屏 gzip **297,656 B**（内部 310,000 / 硬线 320,000，余 12,344；第 54 轮 296,610 → +1,046）。`total raw=961180 gzip=297656 files=3 max=320000`。日志 `.tmp/r55-tester-verify.log`
- `npm test` **37 文件 462 条 0 fail**（第 54 轮 35/449；+2 文件 +13 条：`inlineSyntax.test.ts` 9、`themes.test.ts` 4）。日志 `.tmp/r55-tester-test.log`
- `npm run roundtrip` **PASS**：rich 6/8、source 8/8、firstSaveBlocked 1/8；新样本 `08-inline-html.md` **完全保真（-0 +0）**。日志 `.tmp/r55-tester-roundtrip.log`

## B1 `==高亮==` / `^上标^` / `~下标~`（B-101）

自写 `.tmp/e2e-r55-tester.mjs`（reset 9222 后跑，`.tmp/r55-tester-e2e.log`）：

| 状态 | 证据 | 结果 |
| :--- | :--- | :--- |
| 默认关 | 设置面板复选框 `inlineChecked=false`、`localStorage` 无 `inlineSyntax` 键（`.tmp/t55-probe-default.mjs`） | 默认关 ✓ |
| 关时四例 | 拖入 `==a==` / `^b^` / `~c~` / `<mark>a</mark>` 后 `.sl-eq`/`.sl-sup`/`.sl-sub` 各 0，`s,del,strike` 0（`~c~` 没变删除线），正文含三段字面；导出 Markdown 与原文**逐字节同** | ✓ |
| 开时（同会话勾选+保存，**不刷新**）再拖入同篇 | `.sl-eq`→`a`、`.sl-sup`→`b`、`.sl-sub`→`c`、`<mark>` 仍是真 `mark` 元素（`inlineMark` 路径）；导出字节仍 `==a==`/`^b^`/`~c~`，逐字节同 | ✓ |
| 同会话再关（不刷新）再拖入 | 三个 mark 全 0、三段字面回归、字节同；`stored=false` | ✓ |
| console | 全流程 0 条 error / 0 pageerror | ✓ |

单测（`src/lib/inlineSyntax.test.ts`，9 条）另覆盖：开时 `~~删除线~~` 仍是 strike、行内代码与围栏内符号不动、边界 `====`/`2^10`/`25~`/`a == b` 不误判、「关开关不重排已有文档」、开关前后写回字节一致。

## B3 主题 MVP：清单 + 暖纸（B-105）

`.tmp/e2e-r55-tester.mjs` 同一次运行：

- 点「暖纸」→ `data-theme='sepia'`，`computed --paper = #f4e8d2`，与 `src/lib/themes.ts:19` 清单值相同；`--ink = #3a2f21`。
- 对比度 **10.77:1**（≥4.5；页面 computed 值算）。静态复核 `themes.test.ts` 4 条：清单与 `styles.css` 逐变量相同、对比度、id 唯一、`isThemeChoice` 回落。
- 保存后 **reload 仍 `sepia`**（`stored='sepia'`）；系统深色（`emulateMedia`）下 `--paper` 仍 `#f4e8d2`（没被跟随系统吃掉）。
- 旧三档不变：浅色 `light`/`#f6f4ee`、深色 `dark`/`#15171a`、跟随系统 `system`/`#f6f4ee`；点「取消」还原到已保存的 `sepia`。
- 0 控制台错误。截图 `shots/round-55/b3-sepia.png`、`shots/round-55/b1-syntax.png`（本轮 2 张）。
- 偏差：验收写 `shots/round-54/b3-sepia.png`，为不碰第 54 轮历史证据改存 `shots/round-55/`。

## B2 差距表计数与拆行（B-112 + B-117）

自写 `.tmp/t55-docs-check.mjs`（HEAD 版本先由 PowerShell 以 UTF-8 导出到 `.tmp/r55-head/`，node 只读文件；沙箱禁止 node 起子进程）：

- 表头 `## 已经有的（35）` 实际数据行 **35**；`## 缺的（7）` 子节行数 1/1/1/1/1/2 = **7**，每个 `### …（k）` 的 k 与本节行数相等，子节声明和 = 表头。
- 三条限定文件（改前→改后）：`docs/typora-gap.md` 旧句 1→**0**、新句 0→**1**；`README.md` 1→0 / 0→1；`AGENTS.md` 1→0 / 0→1。另 `## 缺的（9）` 1→0。
  记：验收括注「改前实测 1/1/2」，我按上面三句测得 **1/1/1**，结论（旧句落 0、新句各 1）不变。
- `README.md:45`、`AGENTS.md:72` 均含「50–200%」且不再含「100–300%」。
- 全屏行逐字为 `| 全屏 | 有；\`F11\` 有入口，宿主内未验 |`，无其它宿主结论。
- 历史文件：`git status` 里只有本轮允许的文件；`docs/iteration/round-*`（非 55）与 `shots/round-*`（非 55）**0 处改动**。

## 回归

- `scripts/theme-acceptance.mjs`：首跑 **26/27**，唯一 FAIL 是脚本写死「三档主题」；第 55 轮按 B-105 追加「暖纸」按钮属预期，**先改脚本**（断言改为「前三档仍在原位 + 清单非空」）再跑 **27/27 PASS exit 0**（`.tmp/r55-tester-theme2.log`）。跑完 `git checkout -- shots/round-05`（该脚本会覆盖 4 张历史截图）。

## UNVERIFIED

- 「开时」写回字节用应用内「导出 Markdown」取 Blob（与保存共用 `serializeDocument` 链），**没有**经真实磁盘/FSA 保存路径；宿主 WebView2 里的 sepia 与 `F11` 同样未验（本机浏览器态）。
- 真实中文 IME 下的 `==`/`^`/`~` 逐键表现（只验了拖入解析与设置开关）。
