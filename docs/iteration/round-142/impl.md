# 第 142 轮执行报告（A1 + A2）

基线 `e7a2753`；未 commit、未改版本、未动 `release/`、未重启 dev。B 轮（143）未开始。

## A1 新建可用、打开不被 error toast 挡、原因全中文 —— DONE

- `src/lib/saveError.ts`：新增 `writeReasonOf(error)`（纯插入 27 行，`describeSaveFailure` 逐字节未动）；按 `DOMException.name` 给中文短句，不拼 `error.message`。
- `src/lib/trash.ts`：11 处全换 `writeReasonOf`（68/71/115/128/135/207/217/221/255/414/417）；`NotAllowedError` 去「删除不可用」。
- `src/App.tsx`：`ensureWorkspaceWritable` 只 `setTrashReason`、删常驻错误 toast；`createWorkspaceFile` catch 改 `writeReasonOf` + `await startNewDocument()` + 中文提示（带「另存为」）；`createFolder` catch 同改。
- `src/components/FileTree.tsx`：删 `disabled={Boolean(trashReason)}`（留 `title`、`aria-describedby`）；警示行补「能打开也能编辑，保存会失败：请用「文件 → 另存为」换一个位置。」。
- `src/components/TreeActions.tsx`：删无用 `trashReason` prop 与「新建文件夹」的 `disabled`/`title`。
- `src/lib/saveError.test.ts`：20 → 24 条（`writeReasonOf` 两条、trash.ts 11 处静态门、新建兜底门）；「＋ 新建」门反转。

## A2 端到端：假 FSA 拒写全链路 —— DONE

新 `.tmp/e2e-r142-a.mjs`：夹具 `noWrites`（读/枚举/`removeEntry` 正常；任何 create 与 `createWritable` → `NoModificationAllowedError` + W3C），覆写 `showDirectoryPicker`，走「文件 ▾ → 打开文件夹…」，30 断言覆盖打开/新建/编辑/Ctrl+S/另存为五段。`.tmp/e2e-r141-save.mjs` 删 ③④（旧口径）并指回 A2。

## 门禁

- `npx tsc --noEmit` exit 0；`npm test` exit 0，**72 文件 1003 条 0 fail**（改前 999）。
- `npm run verify` **PASS**：门 317,638 / 常驻 4,478 / 真实首载 **322,116**（改前 321,950，+166；预算 ≤323,500，距硬线 325,000 余 2,884）。
- 验收 grep：`git grep -nE 'error\.message|second\.message' -- src/lib/trash.ts` 改前 **11 条**（68/71/115/128/135/207/217/221/255/414/417）→ 改后 **0 命中、exit 1**。
- `node .tmp/reset.mjs 57270 && node .tmp/e2e-r142-a.mjs` → `allPass:true`，**30/30**，pageErrors 0（`.tmp/r142-a.json`）；`e2e-r141-save.mjs` → **13/13**，0 FAIL。
- `roundtrip` 不跑（未动编辑器/序列化）。

## 截图

`shots/round-142/folder-unwritable.png`：打开写不进去的文件夹后——树里有 `Main.md`、0 toast、「＋ 新建」可点、警示行给中文原因与「另存为」出路。

## CHANGELOG 一行建议

保存：写不进去的文件夹不再弹错误提示挡住打开（原因改由文件树一行中文警示承担），「＋ 新建」不再禁用、失败切到空白文档；删除/回收站/恢复/缓存搬移的失败原因不再漏 W3C 英文原文（新 `writeReasonOf`）。

## 计划偏差

1. 草稿兜底证据：拒绝在 `.sidelight` 级，断言用 `FAILW:.sidelight`；空白文档无 `file.path`、兜底落 localStorage → C 段断 localStorage，D 段断 `FAILW:.sidelight` + files 无 drafts。
2. `writeReasonOf` 不带 `console.debug`（纯函数；node 直接执行该文件时 `import.meta.env` 不可用）；`trash.ts:62`「删除不可用」改「没有写入这个文件夹的权限。」，无测试引用旧串。

## 新踩坑

1. **提示要等 `startNewDocument()` 之后设**：`loadIntoEditor` 收尾有 `setNotice(null)`，顺序反了提示一闪就没。
2. **假 FSA 的磁盘键是文件名**：`files.get('Main.md')` 才对，按 `工作区名/Main.md` 取到 `undefined`，会把「磁盘没改」误判 FAIL。
3. **先断 dev server 交付新模块**：`fetch('/src/App.tsx',{cache:'no-store'})` 查 `writeReasonOf(error)`、无 `这个文件夹写不进去（`。
