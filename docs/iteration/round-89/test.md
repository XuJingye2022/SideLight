# 第 89 轮测试报告：B-107 自定义快捷键（A1/A2/A3）

- 轮前 `e858a7af`；dev `:5175`；真机走 ego CDP **54280**（9222–9226 未使用，沿第 79 轮口径）。
- 只读 `plan.md`、`git diff`、BACKLOG；未读 `impl.md`，真机断言全部自写脚本。
- **判定：PASS**（门禁、三条验收与真机项均独立复跑通过；无回归）。

## 门禁
- `npm test`：**54 文件 724 条 0 fail**（基线 53/693）。`.tmp/r89-tester-npmtest.log`
- `npm run verify`：gzip **309,074 B**，余 10,926 / 926。`.tmp/r89-tester-verify.log`
- roundtrip 未跑（未动编辑器/序列化，计划同）。
- 单测独立复跑：`keybindings.test.ts` **26/26** exit 0；`settings.test.ts` **19/19**（`git grep -c '^test('` HEAD 14 → 19，+5 ≥4）；静态 `keybindings` settings.ts **0→4** 行、SettingsDialog **0→5** 处（HEAD `git grep -c` exit 1 作正向对照）。

## A1 纯逻辑（PASS）
默认 8 条唯一 + 归一往返、RESERVED **29** 条 label 非空且不撞默认、normalize 四拒 + 小写归一与修饰顺序、`bindingFromEvent` 四形、严格修饰全等、`bindKey` 的 Ctrl+K「加链接」/Ctrl+H「查找」/Ctrl+P「快速打开文件」/Ctrl+N 与裸 `s` 拒、`Ctrl+Alt+W` 过、`resolve` 的 `{}`/`Ctrl+H`/`Ctrl+P`/未知 id/非法值全符合。26 条逐条对应验收。
收尾订正：BACKLOG/CHANGELOG 原写「28 条固定键」，实测 `RESERVED_KEYBINDINGS.length`=**29**，已改。

## A2 持久化 + UI + 尺寸（PASS）
自写 `.tmp/r89-tester-e2e.mjs` **33/33**、0 pageerror/console error（`.tmp/r89-tester-e2e.json`）：
- 第 1 条 details「快捷键」展开后 **8 行**、逐项 = 默认。
- 「保存」行按 `Ctrl+P` → 状态「与「快速打开文件」重复」且仍 `Ctrl+S`。
- 录制中 `Esc` →「已取消，键位不变」且面板不关；改 `Ctrl+Alt+W` 后状态「已改为 Ctrl+Alt+W」。
- 保存后关面板、`localStorage` 的 `keybindings` 8 键且 `save=Ctrl+Alt+W`；Backspace 回 `Ctrl+S` 并落盘。
- 尺寸（`scrollHeight-clientHeight`）：1440×900 **0** / 1024×700 **0** / 1000×620 **49 px**（≤64），页脚三档都在框内与视口内。改前未回退代码，用 DOM 重建（藏该 details + 补回常显协议说明）近似得 0/0/**62**，与交付记录一致（`.tmp/r89-tester-overflow.mjs` 5/5）。
- 结构探针 `.tmp/r89-tester-structure.mjs` 5/5：3 组 details 初始闭合、点第 1 条后 `[true,false,false]`、8 钮高 **24 px**、Tab 不进入录制。

## A3 接线 + 真机 + 文档（PASS）
- 默认键（真实键盘）：`Ctrl+F`→`.find-input`、`Ctrl+P`→`.quick-open-input`、`Ctrl+/`→`textarea.source-editor` 再按回、`Ctrl+Shift+P`→`.preview-pane` 再按回；无工作区 `Ctrl+Shift+F` toast「先打开文件夹，再全局搜索（Ctrl+Shift+F）」，有工作区出全局搜索框（实际类 `.global-search-dialog`，产品无 `.global-search`，按类前缀成立）；`Ctrl+Alt+N` 标题 `未命名.md` 正文空；`Ctrl+Alt+E` 出 `.export-menu` 且 `activeElement`=首个 button；脏文档 `Ctrl+S` 写 **1** 次。
- 改键持久化：新键写 1 次；再改脏后页内派发旧 `Ctrl+S` **0 写**；reload 后重开文件夹与文件，新键仍 1 写、旧键 0。
- 设置开着：`Ctrl+Alt+W` **0 写**且面板不关；Backspace 复位→保存关面板→脏文档 `Ctrl+S` 写 1→再改脏按新键 **0 写**。
- 截图：`shots/round-89/keybindings.png` 已目视（8 行、保存行 Ctrl+Alt+W）、`keybindings-settings.png` 在；tester 另截图存 `.tmp/`（守每轮 ≤2 张）。
- 文档：`node .tmp/r58-docs-check.mjs` **42/42、3/3、子节 1/1/1、missRowSum 3**；`自定义快捷键 | 无` HEAD **1** → 现 **0**；`README.md:102`=42/3、`AGENTS.md:74` 同、`README.md:231`=「1. Phase 1 路线图开放项已清（B-107 收口）；剩余见差距表：自定义主题、导出四种 P2、代码块高亮 P1 待批」；CHANGELOG 标题 `29–89` 且有第 89 轮小节；BACKLOG `B-107=fixed`，`git grep '| open |'` exit 1（open 1→0）。

## 回归
- `scripts/keyboard-acceptance.mjs http://localhost:5175`（`SIDELIGHT_CDP=…:54280`）**52/52** exit 0（`.tmp/r89-tester-keyboard.log`）；跑完已 `git checkout -- shots/round-05/`。
- 未动编辑器/序列化，`npm test` 全量 0 fail 即整体回归。

## UNVERIFIED / 口径
- 原生打印 / 另存 PDF、真宿主 WebView2、真实中文 IME：与本轮无关，未跑（沿用批次口径）。
- 尺寸「改前」是 DOM 重建近似，非回退代码实测；硬门槛（改后 ≤64 px）与页脚可见性为真机实测。
- CDP 9222–9226 按环境说明不可用，未反复重试。
