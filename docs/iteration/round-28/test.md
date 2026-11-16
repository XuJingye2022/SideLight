# 第 28 轮 · 验收（tester，v0.32.1）

日期：2026-11-16。v0.32.1，HEAD/tag `1ac1298`。本机 Windows；未改产品代码、未 commit；只写本报告。

## 门禁

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| build | PASS，130 modules，0 warning | `.tmp/r28-build.log` |
| `npm test` | 17 文件、**248 条**、0 失败 | `.tmp/r28-test.log` |
| measure | PASS，**285,783 B ≤286,000**（余 217） | `.tmp/r28-measure.log` |

## #1 首次启动：PASS

- 清 localStorage/IndexedDB 后：`未命名.md`、正文空、`dirty=false`，无「示例 · 侧灯.md」。
- 手动写旧 `sidelight.doc.v1`（name 为「示例 · 侧灯.md」）再 reload：仍被丢弃为空白 `未命名.md`。
- 证据：`session` 18/18 + 手动 CDP 断言。

## #2 新建/关闭：PASS

- `Ctrl+Alt+N` 得到空 `未命名.md`、dirty=false（keyboard 49/49）；`newfile` 23/23。
- 手动 `.file-menu-trigger → 关闭文档`：干净文档回到空 `未命名.md`。
- 有 `DIRTY-X` 时关闭弹「这篇还有没保存的改动…取消/不保存/保存并切换」；点「取消」正文 `DIRTY-X`、dirty=true 不变。

## #3 工作区保存：PASS-WITH-UNVERIFIED

- `session` 18/18：工作区无句柄时 `Ctrl+S` 在根目录创建 `未命名.md`，树选中，`showSaveFilePicker` 调用 **0**；小标题「已保存到 未命名.md」。
- 显式「另存为」仍走 picker（keyboard 既有用例）。
- **UNVERIFIED**：根目录已有 `未命名.md` 时的 `未命名 2.md` 冲突出名；真实 WebView2/FSA 权限下的同一路径未跑。

## 回归

- 本轮实跑：session 18/18、newfile 23/23、keyboard 49/49、`npm test` 17/248、measure 285,783。
- draft 61、tree 56、host-save 64、stale 4、bigfile 3、theme 27、acceptance 11、recent 57、fcp 6、portable/installer 沿用最近通过证据；0.32.1 未全部重跑。

## 发布 / 文档：PASS

- Release **v0.32.1** 已生成：setup **824,209 B**、win zip **910,360 B**、mac **905,892 B**、`SHA256SUMS-0.32.1.txt` **308 B**；三文件 SHA256 与 checksum 全一致，文件名均为 0.32.1。
- README/AGENTS/CHANGELOG **0.32.1 / 248 / 285,783**；AGENTS 有「首启空白」踩坑；无 TBD/0.32.0 旧包名。
- STATE 第 **28** 行已补，版本 0.32.1、最新 Release 0.32.1；`round-28/plan.md` 存在。HEAD `b1e7c70`，领先 tag `1ac1298` 仅 docs/STATE；`git status` 干净。

## 判定

**PASS-WITH-UNVERIFIED**

- #1 首启空白、#2 新建/关闭 PASS；#3 工作区保存主路径 PASS（session 18/18、picker 0），`未命名 2` 冲突与真实 FSA 仍 UNVERIFIED。
- 门禁 248/285,783、session 18/18、newfile 23/23、keyboard 49/49、Release 四资产/checksum、STATE/round-28 文档均通过。
- 未验项不改变 0.32.1 可发布结论。

## UNVERIFIED

- 真实 WebView2 新建/工作区保存与 FSA 权限；`未命名 2.md` 冲突；真实 150/200% DPI；真模型提示词质量与真实 DeepSeek；macOS 真机/签名；100 KB–1 MB 逐键；真实宿主重开/IME/网络盘/HKCU 等。
