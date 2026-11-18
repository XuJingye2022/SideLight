# 第 69 轮 finder-delta（轮间回归）

轮前 `startSha` 即 HEAD=`2f5259f`（第 68 轮）。只查该轮改到的保存、焦点、键盘面；dev 5175 未重启，CDP 9226，跑前 `node .tmp/reset.mjs 9226`。

**结论：无（0 条新回归）**。补测 tester 没覆盖的两条相邻路径，20/20 断言通过、0 错误。

## 改动面
`src/App.tsx`（自动保存前清草稿表+推代际、源码组合门、`closeQuickOpen`/Esc 链、`focusCurrentView(WhenReady)`、`dialogOpen` 加 quickOpen）、`src/components/{QuickOpen,useDialogFocus,FileTree}.tsx`、`src/styles.css`；版本 0.32.1 未变，未动内核与序列化。

## 新增回归：无

### 已跑（`.tmp/e2e-r69-delta.mjs` → `.tmp/r69-delta.json`，`allPass:true`、`consoleErrors:[]`）
T1　快速打开**选中**之后（inert/焦点最易残留处，tester 只验了 Esc 关）：
- 打开 `bb.md` 后 `[inert]` **0**、`body.inert=false`、焦点 `.ProseMirror`；
- 立刻打字落入正文；文件树仍可点（`aa.md` 打开成功）；
- `Ctrl+S` 恰好 **1** 次写 `bb.md:35` 且含新字；再按 `Ctrl+S` **0** 写（第 51 轮「无改动不写盘」保住）；
- 再 `Ctrl+P`+`Esc`：关闭、`[inert]` 0、焦点 `.ProseMirror`。

T2　脏文档里选另一篇 →「切换文档」确认框（`focusCurrentView` 与模态框焦点竞争，两侧都没测过）：
- 框出现，焦点在框内 `BUTTON`、背景 `[inert]` 6、刚打的 `Y` 未丢；
- `Esc` 取消后框关、`[inert]` 0、仍在 `aa.md`；再打 `Z` 并 `Ctrl+S` → `aa.md:35` 含 `Y,Z`，不含乙篇内容。`App.tsx:395` 的按帧接焦按预期放手。

### 未跑（不构成判定）
B-148/B-145 的 1 MB 与组合主路径沿用第 68 轮 tester 结论（`docs/iteration/round-68/test.md`），本轮不重复计时。UNVERIFIED：真实中文 IME、WebView2 宿主内快速打开/组合输入、真实 FSA。
