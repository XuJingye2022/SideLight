# 第 132 轮执行（B-263：产品键只在编辑器正文 / 源码框内放行）

状态：A1/A2/A3 全 DONE。

## 改动文件
- `src/App.tsx:4651-4658`（+7 行）：`?` 块后、`customId` 分派前插守卫
  `foreignTyping = typing && !(target instanceof HTMLElement && target.closest('.ProseMirror, textarea.source-editor'))`；
  命中时只对 `productCombo || customId` 吞默认动作并 return，`customId !== 'save'` 放行保存。串与 `FileTree.tsx:120` 逐字同；未动 `typing`、Esc/F11 顺序、`railModal`、MarginRail、styles。
- `src/lib/appKeyScope.test.ts`（新 5 条静态门）：判据 1 定义 + 2 引用；选择器串与 FileTree 逐字同；位置在 `?` 后 / 分派前；守卫体（保存例外 + 只吞产品键 + return）；test 链带本门。
- `package.json`：test 链尾追加该门（67→**68 文件**、943→**948 条**）。
- `docs/iteration/BACKLOG.md`：B-263→`fixed` 带证据；B-229 补复测。

## 门禁
- `node --experimental-strip-types src/lib/appKeyScope.test.ts` → **5/5 exit 0**；负向删 `customId !== 'save'` / 选择器串砍成 `.ProseMirror` 各 **1 红**，拷回后 5/5。
- `grep`：`foreignTyping` 0→**2**；选择器串 0→1。
- `npm run build` → **exit 0**。
- `node scripts/measure-first-screen.mjs --max 316800` → **exit 0 PASS**：gzip **316,134 B**、raw 1,025,609、headroom **666**；对 316,096 **+38 B**、对硬线 320,000 余 **3,866 B**。
- `MarginRail-R13BmBTx.js` gzip9 **7,878**；合计 **324,012**（超线 **4,012**，归 B-229）。
- `npm test` → **68 文件 948 条 0 fail**；`keyboard-acceptance` **52/52**，跑后 `git checkout -- shots/round-05/`。
- `git status`：`M docs/iteration/BACKLOG.md`、`M package.json`、`M src/App.tsx`、`?? src/lib/appKeyScope.test.ts`、`?? docs/iteration/round-132/`。`roundtrip` 未跑（未动编辑器/序列化）；截图零新增。

## A2 真机（ego 57270、1440×900、假 FSA `a.md`、`autoSave:false`）
- 身份门 `foreignTyping`：before **0** / after **2**（`.tmp/r132-chatkeys-gate.json`）；before 相 `git stash push -- src/App.tsx`，pop 后 SHA256 `C0B18A8E…` 等值、`git stash list` 0。
- **before 2/2 对照 = 被穿透**（① link-editor 2 + 焦点「链接地址」、② find-input 1；③–⑥ 亦穿透）。
- **after 18/18、0 pageerror**：①–⑥ 浮层 0、焦点仍 `.rail-chat-input`、输入值与 innerHTML 不变；⑦ Esc 焦点仍输入框；⑧ 回车 2 turn；⑨ 正文 Ctrl+K 2 input→Esc 0；⑩ 正文 Ctrl+F 1→Esc 0 焦点回 `.ProseMirror`；⑪ 源码框 Ctrl+F 1→Esc 0 焦点回 `textarea.source-editor`；⑫ 按前 0 写 + dirty，按后 1 写 28 B 含「改」+ dirty=false + 焦点仍输入框。
- 证据 `.tmp/e2e-r132-chatkeys.mjs`、`.tmp/r132-chatkeys-{before,after}.json`。

## 有意行为（别当回归）
外置输入框里**不再动作**：Ctrl+K/F/H/P、Ctrl+/、Ctrl+Shift+F/P/M、Ctrl+Alt+N/O/S/E、Ctrl+Alt+Shift+O、Ctrl+Shift+1/3/L、Ctrl+0–6、Ctrl+=/-、Ctrl+Shift+=/-/0；**Ctrl+S 例外仍保存**；查找框内 Ctrl+F 无动作。

## 残余 / UNVERIFIED
行内 `input.sl-math-inline-input`（`mathNodeView.ts:311`）与块级 `textarea.sl-math-block-input` 在 `.ProseMirror` 内，仍在放行集 → 那里 Ctrl+K/F 照旧（同症状不同路径；收紧需保源码框放行 + 补 E2E，超范围）。未验：真 WebView2、真实中文 IME、macOS。

## 新踩坑
1. **侧栏是常驻列**：`App.tsx:6108` 无条件渲染，`railOpen` 只管 ≤1119px 抽屉（`:6111`）。1440 宽下 `#rail-panel-chat` 开局就在，别点 `.rail-toggle`——点了进抽屉态，Esc 链（`:4561`）关侧栏，⑦ 假红。
2. before 相 `git stash push/pop -- <单文件>` 后要 `touch` 该文件：Vite 按 mtime 失效变换，否则可能交旧模块。
3. PowerShell `Tee-Object` 写 UTF-16LE（`ff fe`），`Get-Content -Raw` 数 `ℹ tests` 恒 0；用 `node -e` 解码再数。

CHANGELOG：`- 焦点在右侧对话等外置输入框里时，Ctrl+K / Ctrl+F 不再执行、不再抢焦点；Ctrl+S 仍保存（B-263）`
