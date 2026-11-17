# 第 55 轮执行（executor）

轮前 `f686b63`；未 commit/push、未改 `release/`、版本 0.32.1。

## B1（B-101）快捷行内语法：DONE

- 新增 `inlineSyntax.ts`：三个专用 mark（`eqHighlight`/`caretSup`/`tildeSub`，类名同义 `sl-eq`/`sl-sup`/`sl-sub`）+ 三个 marked 行内 tokenizer。开关只改解析（`() => boolean` 闸门）；schema 常驻，不重建编辑器、不丢撤销栈；写回同一对符号。`<mark>`/`<sub>`/`<sup>` 仍归第 47 轮 inlineMarks。
- `tilde.ts`：`disableSingleTildeStrike(manager, gate)` 同一 `use()` 注册 `[loneTildeText, …三个 tokenizer]`。`App.tsx`：`inlineSyntaxRef` + effect、extensions 加三个 mark、parse 前传闸门。
- `settings.ts` 加 `inlineSyntax`（默认 false）、`SettingsDialog.tsx` 复选项、`styles.css` 三个 mark 样式、`package.json` 注册测试。
- 新增 `inlineSyntax.test.ts`（9 条）；roundtrip 补 `08-inline-html.md`，并把 `inlineMarks` 注册进 `scripts/roundtrip.mjs`（计划漏了脚本，否则新样本报丢标签的假差异）。

## B2（B-112+B-117）差距表计数与拆行：DONE

- `typora-gap.md`：`（32）→（35）`、`缺的（9）→（7）`；语法行与 TOC/emoji 拆开并移入「已经有的」；「视图与界面（3）→（1）」，视图缩放（50–200%）、全屏（`F11` 有入口，宿主内未验）移入「已经有的」；「建议的下一批」去掉已落地项。
- `README.md:45`、`AGENTS.md:72`：`100–300%` → `50–200%`；`README.md:96` → 35/7；`AGENTS.md:74` → 35 项有、7 项缺。
- 证据：`node .tmp/r55-count-gap.mjs`（表头=行数、子节全 ok）；`node .tmp/r55-doc-assert.mjs`（9 条 旧 0/新 1）；改前 1/1/2 的正向对照见 `git diff` 的 `-` 行。

## B3（B-105）主题清单 + sepia：DONE

- 新增 `themes.ts`（清单、`THEME_MODES`、`isThemeChoice`、`contrastRatio`）+ `themes.test.ts`（清单=CSS、对比度、id、合法值）。
- `styles.css` 加 `html[data-theme='sepia']` 完整变量块；系统深色媒体查询加 `:not([data-theme='sepia'])`，否则暖纸被吃掉。
- 沿用既有 `theme` 字段，`data-theme` 直接是 `sepia`，旧三档不变；设置面板主题组按清单渲染。

## 门禁

| 命令 | 结果 |
| :--- | :--- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 37 文件 / 462 条 / 0 fail |
| `npm run roundtrip` | rich 6/8；新样本完全保真；04/06 原差异不变 |
| `npm run verify` | 首屏 gzip **297,656 B**（预算 310,000） |
| `.tmp/e2e-r55-b1.mjs` | 11 项全 true，console 0 |
| `.tmp/e2e-r55-b3.mjs` | 12 项全 true，console 0 |

E2E 见 `.tmp/r55-b1.log` / `.tmp/r55-b3.log`（B1 三态与导出字节、B3 主题各项）。

## 改动文件

改 `App.tsx`、`lib/settings.ts`、`lib/tilde.ts`、`SettingsDialog.tsx`、`styles.css`、`package.json`、`scripts/roundtrip.mjs`、`README.md`、`AGENTS.md`、`typora-gap.md`；新增 `lib/inlineSyntax.ts`+测试、`lib/themes.ts`+测试、`fixtures/markdown/08-inline-html.md`。

截图：`shots/round-55/b1-syntax.png`、`shots/round-55/b3-sepia.png`。计划写 round-54，按 common.md 落 round-55。

CHANGELOG 建议：`- 设置里可开快捷行内语法 ==高亮== / ^上标^ / ~下标~（默认关，写回逐字节不变）；新增内置主题「暖纸」与主题清单。`

## 踩坑

1. **`@tiptap/markdown` 复用全局 marked 单例**：同进程多个 manager 的 `use()` 会累积，带闸门的 tokenizer 串味；测试只能一个 manager + 可变闸门。
2. **`marked.use()` 行内 tokenizer 是 unshift**：扩展级 `markdownTokenizer` 排不到 `loneTildeText` 之后，`~c~` 会被单波浪号抢走；必须同一 `use()`、数组第一个放 `loneTildeText`。
3. **公式安全已实测**：`inlineMath` 在 `$` 处整段吃掉，`$x^2 + y^2$`、`$a~b~c$` 开时字节不变；单行 `$$…$$` 变块级是既有行为。

待 scribe：AGENTS/README 的测试条数与首屏字节已过期（现 37/462、297,656 B）；差距表「拖入打开」「主题三档」两行不在 B2 行范围，未动。
