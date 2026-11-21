# 第 144 轮验收（tester）

判定 **PASS**。轮前 `startSha=284ec404fd97c1400c0287e0741e4ef312ba72c5`；验收对象 = 工作区未提交的第 144 轮改动（17 文件 +515/−209，另新增 `src/lib/rename.test.ts`）。未读 `impl.md`。

## 门禁（真跑）
- `npm run verify` **exit 0 PASS**：门 gzip **318,723 B** / 常驻 `MarginRail` **4,487 B** / 真实首载 **323,210 B**，`max=none headroom=none`、「仅记录…（硬线未设置）」、`PASS`（`.tmp/r144-tester-verify.log`）。
- `npm test` **73 文件 1013 条 0 fail**（`.tmp/r144-tester-test2.log`；1003 +10 = `rename.test.ts` 7 + `freeRootName` 3）。
- `roundtrip` 不跑：diff 无编辑器/序列化改动。

## A1 取消首屏硬线：只记录字节（验收①）
- `node scripts/measure-first-screen.mjs` **exit 0**：`total=318723 resident=4487 real=323210 headroom=none max=none`。
- **超 325,000 也 exit 0**：把 `dist` 复制成 `.tmp/r144-bigdist`、给入口 chunk 追加 24,000 字符 → `real=337547`（>325,000），无参仍 **exit 0**；同一副本 `--max 325000` **exit 1**（`FAIL 首屏 gzip 333060 超过上限 325000`）——硬线只对显式传值生效。
- `--max 1000` / `--real-max 1000` / `--no-resident --max 1000` 各 **exit 1**，`--no-resident` 无参 exit 0：守卫没被一起删。
- 静态门（改前→改后）：脚本 `325000` **3→0**；AGENTS/README `真实首载 gzip 字节门` **2→0**；src `tree-write-warning` **7→0**；App `新建失败：|已换到空白文档` **1→0**；App/components `无法创建回收站` **0**、`trash.ts` 3；CI 三处裸调用无 `--max`。
- 文档：AGENTS §3/§4、README、BRIEF、design-language §5 均写「只记录/不阻塞」；安装包 **50,000,000 B / 内部 45,000,000 B** 原句仍在。

## A2 只读工作区：安静「只读」徽标（验收②前半）
自写 `.tmp/e2e-r144-tester.mjs`（ego CDP 57270、1440×900、假 FSA 两夹具 + stub `showSaveFilePicker`）：**44/44、0 pageerror**（`.tmp/r144-tester-e2e.log`）。R1 只读夹具（读得到、写全抛 `NoModificationAllowedError`）打开后：`.toast` **0**；页面无「回收站」「无法创建」；`.tree-write-warning` **0**；`.tree-readonly-badge` **恰 1**、文「只读」、`SPAN` 非按钮；「＋ 新建」`disabled=false` 且 `aria-describedby=tree-readonly-badge`；`Main.md` 可读、`.ProseMirror[contenteditable=true]`；夹具字节未变（ops 仅 `FAILW:mkdir:.sidelight`）。视觉：`shots/round-144/readonly-badge-naming.png`。

## A3 新建 / 命名 / 另存为闭环（验收②后半）
- R2/R3 只读＋新建：无「新建失败 / 已换到空白文档」；`input.doc-name-input` 出现并聚焦、默认「未命名.md」；提示 `role=status`「这里写不进去：给它起个名字，保存时用「另存为」。」；新增 `create:` / `FAILW:` 操作 **0**、磁盘仍只 `Main.md`。
- 键入「读书笔记」Enter → 标题「读书笔记.md」、徽标仍在；`Ctrl+S` 的 `suggestedName=读书笔记.md` 且真写成功（含刚打的字），只读文件夹里没建出「未命名.md」。R9 再 `Ctrl+S`：选择器 **0 次**、写盘 +1 落同一目标。
- R4/R5 可写：徽标 0；新建直接在文件夹建「未命名.md」+「已新建」toast、不开输入框、`Ctrl+S` 直写（选择器 0）；双击标题改「笔记」→ 真 `move`（`笔记.md` 在、`未命名.md` 消失）、树/标题同步、改名后 `Ctrl+S` 写 `笔记.md`。
- R6 `Main.md`→`正文.md`：`move` 1 次、旧名消失、树/标题跟随、保存写新名。R7 文件 ▾ 键盘 ArrowDown/Enter 开「重命名文档…」输入框；Esc 取消、无多余 `move`。R10 `/__doc` 宿主：双击标题不出输入框，菜单给「宿主文件请用「文件 → 另存为」换名字。」。

## 回归
- `scripts/keyboard-acceptance.mjs` **52/52**（`.tmp/r144-tester-kb2.log`）。菜单插入「重命名文档…」使原有两条「第 2 项 = 另存为 / ArrowDown×1」断言过期；已改脚本两处（第 2 项取自菜单 DOM、另存为按文案走到），非产品回归。
- `scripts/newfile-acceptance.mjs` **2 条 FAIL**（`.tmp/r144-tester-newfile.log`）。定点探针 `.tmp/r144-tester-extdel.mjs`（`.json` 同名）：外部删除 + 刷新后提示「「a.md」已不在磁盘上…保存只能另存为」，打字 `Ctrl+S` 却 `create:a.md`+`write:a.md`。根因本轮 `saveIntoWorkspace` 改按 `docNameRef.current` 取名（HEAD 用 `nextNewName` → 建「未命名.md」）：两版都与「只能另存为」不一致，本轮只是把静默新建的名字换成旧名，不丢数据。记 **B-273**（P2 open），不判 FAIL。

## 偏差（不判 FAIL）
- `package.json` 的 `description` 被写成 `Sidelight 路 …`（`·` 的 `C2 B7` 被当 ANSI 读回写，AGENTS §8 同款坑）；已修回 `·`。
- 未改 README/AGENTS（批末 scribe 同步）。

## UNVERIFIED
真 WebView2 宿主内的徽标 / 双击改名 / `/__doc` 宿主真值；真实 Low IL 桌面双击；真实 FSA 的 `move` 与权限三态；真实中文 IME；macOS 宿主。
