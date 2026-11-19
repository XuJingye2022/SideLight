# 第 89 轮计划：B-107 自定义快捷键（rev 2）

## 0 口径
- 只做 **B-107**（B-103/106 fixed）：8 条可改键+持久化+冲突拒。版本 0.32.1、不 push、不改 `release/`。
- `e858a7af`；dev `:5175`；真机 ego CDP **54280**, 9222 无监听记 UNVERIFIED。改前 gzip **307,630 B**（内部 310k/硬线 320k）、53 文件 **693 条**；不跑 roundtrip。

## 1 锚点
- `App.tsx:4283-4557` keydown；8 分支 `:4417/:4437/:4445/:4450/:4460/:4483/:4502/:4524`；`dialogOpen :4287`。
- `ShortcutsDialog:14-52`；`styles.css:1532-1540`；`SettingsDialog:137/226`；门 `.tmp/r58-docs-check.mjs`；模板 `.tmp/r51-fsa.mjs`+`e2e-r80-*`。

## 2 定案
- 8 条：save `Ctrl+S`、find `Ctrl+F`、globalSearch `Ctrl+Shift+F`、quickOpen `Ctrl+P`、toggleSource `Ctrl+/`、togglePreview `Ctrl+Shift+P`、newDocument `Ctrl+Alt+N`、exportMenu `Ctrl+Alt+E`。串序 `Ctrl+Alt+Shift+键`, Ctrl 兼 ⌘, 须带 Ctrl/Alt, 键限字母数字与 `/`, 修饰全等。
- **冲突单路 `bindKey`**：① 命中 `RESERVED_KEYBINDINGS`（combo→label：`ShortcutsDialog:14-52` 除 8 条, 含 `Ctrl+1–6/0`；`Ctrl+H`、`Ctrl+B/I/E/Shift+X`、`Ctrl+L`、`F11`、`Ctrl+N/O/Shift+S`）→ 拒, 理由「与「加链接」重复」；② 与另一命令当前键位同 → 拒（同句）。`resolveKeybindings` fold `bindKey(默认表,id,存值??默认)`；`''` 当非法值。
- 持久化 `keybindings` 存 8 条、缺键读默认, 不升版本。

## 3 任务
### A1 纯逻辑+单测
files：`src/lib/keybindings.ts`、`keybindings.test.ts`（新）、`package.json`
做：`KEYBINDING_COMMANDS`/`DEFAULT_KEYBINDINGS`/`RESERVED_KEYBINDINGS` + `normalizeBinding`/`bindingFromEvent`/`matchBinding`/`bindKey`/`resolveKeybindings`；入参 `KeyLike`。
验收：1. `keybindings.test.ts` exit 0、**≥16 条**：默认唯一+往返、RESERVED 合规、normalize 四拒+小写归一、四形、严格匹配；**`bindKey(save,'Ctrl+K')` 拒 label=`加链接`**、`Ctrl+H`→`查找`、`Ctrl+P`→`快速打开文件`、`Ctrl+N`/裸 `s` 拒、`Ctrl+Alt+W` 过；**`resolve({save:'Ctrl+H'})`→`Ctrl+S`**、`{save:'Ctrl+P'}`→save 回默认、`{}`=默认、未知 id/非法值回默认。2. `npm test` 0 fail（**54 文件 ≥709 条**）；`verify` 记 307,630。

### A2 持久化+设置 UI+尺寸
files：`settings.ts`、`settings.test.ts`、`SettingsDialog.tsx`、`App.tsx`、`styles.css`
做：Settings 加 `keybindings`（默认 `DEFAULT_KEYBINDINGS`）, `loadSettings`/`commitSettings` 走 `resolveKeybindings`（版本仍 2）。字号后加首条 `details.settings-group`「快捷键」：8 行 `.field.keybinding-row`, 录制态「按下新键位…」, `onKeyDown` 停传播+全键 preventDefault（Esc 取消/Backspace 回默认/其它 `bindKey`, 理由进 `role="status"`）＋「全部恢复默认」；钮 24px+focus 环。腾空间：`:226` note 移进「接口地址」hint；仍超缩 `.settings-group` margin 12→8/summary 6→4。
验收：1. `settings.test.ts` exit 0, 新增 **≥4 条**（缺键/非法/未知 id 回默认、`{save:'Ctrl+P'}` 读回默认、落盘带 keybindings）。2. `npm test` 0 fail、`verify` 记 gzip、静态 `keybindings` settings.ts 0→≥4/SettingsDialog 0→≥3。3. 尺寸（`setDeviceMetricsOverride`）：三档 `.dialog` 的 `scrollHeight-clientHeight` 改前/后各记；1000×620 **≤64 px** 才过, 否则按上两步再量；仍超记实测并把 B-150 目标改实测（禁写「不回归」）。4. UI：展开第 1 条 details（另两组闭合）8 行=默认；「保存」行按 `Ctrl+P` 报冲突仍 `Ctrl+S`；Esc 取消不关面板；恢复默认生效；0 pageerror。

### A3 接线+真机+文档
files：`App.tsx`、`ShortcutsDialog.tsx`、`.tmp/e2e-r89-a3-keybindings.mjs`（新）、`shots/round-89/`、文档 5 份
做：接 `keybindingsRef`；`matchBinding` 先于硬分支；对话框吞 `productCombo||customId`；switch 接 8 条现有动作（无工作区 toast、导出 rAF 焦点）；删 8 分支留 `Ctrl+H`；ShortcutsDialog 加「本表是默认键位, 改过的以设置为准」。
验收（CDP 54280, `.tmp/r89-a3-keybindings.json`, 写盘数取 `__fsLog.write`）：
1. 清 localStorage+reload：无工作区 `Ctrl+Shift+F` 出含「先打开文件夹」的 `.toast`；`openFolder`+夹具后 `Ctrl+F`/`Ctrl+P`/`Ctrl+/`/`Ctrl+Shift+P` 分别出 `.find-input`/`.quick-open-input`/`textarea.source-editor`/`.preview-pane`（后两条按回）；有工作区 `Ctrl+Shift+F` 出 `.global-search`；干净态 `Ctrl+Alt+N` 换空白新文档（标题 `未命名.md`、正文空）；`Ctrl+Alt+E` 出 `.export-menu` 且 `activeElement` 是首个 button；脏文档 `Ctrl+S` 写盘 1 次。
2. 设置里「保存」改 `Ctrl+Alt+W` 保存：新键写盘 1 次；再打 1 字改脏后**页内派发** `dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true}))`, 旧 `Ctrl+S` **0 写**；`reload` 后重 `openFolder`+点文件+打 1 字改脏, 再断新键写 1 次、旧键 0 写。
3. 设置开着 `Ctrl+Alt+W` **0 写**、面板不关；「保存」行按 Backspace 回 `Ctrl+S`→点「保存」关面板→脏文档 `Ctrl+S` 写 1 次；再打 1 字改脏, `Ctrl+Alt+W` 0 写。
4. 0 pageerror/console error；截图 `shots/round-89/keybindings.png`。
5. 文档：`docs-check`→**42/42、3/3、1/1/1、missRowSum 3**；`git grep '自定义快捷键 | 无'` 1→0；「有」加「8 条可改键+全部恢复默认, 其余固定」；**`:78`→「1. 自定义主题。」**；`README:102`/`AGENTS:74` 均改 42/3、**`:231`→「路线图开放项已清（B-107 收口）；剩余见差距表：自定义主题、导出四种 P2、代码块高亮 P1 待批」**；B-107→fixed（open 1→0）；CHANGELOG 第 89 轮+标题 29–89。
6. `npm run verify`（A2/A3 值进报告）、`npm test` 0 fail。连不上 CDP → 1–4 记 UNVERIFIED, 仍交 5–6。

## 4 风险与不做
- 体积 +0.6–1.0 KB；>310,000 精简文案, 超 320,000 回滚；回滚 `git checkout --` 4 文件+删 2 新。录制新键用真键、旧键一律派发；残余 `Ctrl+H` 别名、mac 写 Ctrl、表列默认。
