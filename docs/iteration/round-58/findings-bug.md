# 第 58 轮 缺陷猎人（finder-bug）findings

- 环境：CDP 9222，dev `http://localhost:5175`，HEAD `25146504`，1440×900，每段前 `node .tmp/reset.mjs 9222`。
- 只读：未改产品代码。证据：`.tmp/r58-finder.json`、`.tmp/r58-rename.json`、`.tmp/r58-delete.json`、`.tmp/r58-1mb.json`、`.tmp/r58-1mb-load.json`。脚本：`.tmp/e2e-r58-*.mjs`。
- 结论：**未发现新的 P0/P1**，`actionable_count = 0`；1 条新 P2 记 deferred，1 条与 B-208 重复。

## 覆盖路径

| 路径 | 结果 | 证据 |
| :--- | :--- | :--- |
| 开工作区 → 开 b.md → 改 → `Ctrl+S` 写回 | 通过：toast「已保存 b.md」，盘上 `# 乙\n\n第二篇文章补充一句\n`，dirty→false | `r58-finder.json` `save` |
| 文件树新建 / 重命名 / 撞名 / 删除 / 刷新 | 新建 `未命名.md` 落盘；b.md→c.md 后 `Ctrl+S` 写 c.md；撞名 `a.md` 报「已有同名文件，没有覆盖它。」；删 b.md 成功、原文进 `.sidelight/trash/`、toast 带「撤销」；刷新无错 | `r58-finder.json` `afterNew`；`r58-rename.json` `afterRename`/`saveAfterRename`/`collision`；`r58-delete.json` `afterDelete` |
| `Ctrl+P` / `Ctrl+F` / `Esc` | 通过：Esc 后焦点回正文，无对话框残留 | `r58-finder.json` `quickOpenAfterEsc`/`findAfterEsc` |
| 坏 Mermaid / 超 5.5 MiB 拖入 | 通过：`.mermaid-preview.is-error` 出现、`body > pre` 0；大文件提示「超过 5.5 MiB，仍在「bad-mermaid.md」」，原文档不动 | `r58-finder.json` `badMermaid`/`tooBig` |
| 1 MB 载入 / 滚动 / 保存 / 重开 | 通过：`sl-sync-done` 前 385 ms（parse 176 ms）；滚动 0→682,915 px；保存 42 ms / 1,048,638 B（= 输入 +1 字符）；重开长度与首段含 `X` | `r58-1mb-load.json`；`r58-1mb.json` |

## F1（P2，新）：删除确认框的恢复说明与随后「撤销」提示矛盾

- 复现：工作区开 b.md（未保存正文），行末「⋯」→ 删除（移到回收站）。确认框写「要恢复，用文件管理器把 trash 里的文件移回原位。」（`src/components/TreeActions.tsx:287-293`），完全没提应用内撤销；确认后成功 toast 是「已移到回收站：b.md」+「撤销」（`src/App.tsx:2762-2771`，`r58-delete.json` `afterDelete`）。脏分支却写「撤销会一起搬回」（`r58-delete.json` `dirtyDialog.note`）。
- 期望 vs 实际：同一动作两处文案应一致；干净分支让用户以为只能去文件管理器捞。
- 建议：非脏分支末句改「要恢复，按提示里的「撤销」，或把 trash 里的文件移回原位。」，两分支共用一句。
- 影响：仅文案，不阻塞；与 B-208 无关。

## F2（P2，重复，不计新增）：重命名成功仍提示「已刷新：新增 1 个，消失 1 个」

- 复现：b.md 行菜单 → 重命名 → `c.md`；toast 是刷新文案，事务本身正确（树与句柄换到 c.md，之后保存写 c.md）。
- 证据：`r58-rename.json` `afterRename`；既有 B-208（deferred）。不重复计数，仅补本轮实测。

## 未验证 / 限制

- 删除后「撤销」未走完：测试桩的 `FileSystemFileHandle.move()` 抛 `NotSupportedError`，toast「恢复失败：no move」（`r58-delete.json` `afterUndo`）。真实 Chromium 有 `move()`，记 UNVERIFIED，不算产品缺陷。
- 文件树用内存虚拟 FS（真实 FSA 句柄 E2E 拿不到）；编码、权限、网络盘未覆盖。
- 未测：只读文件、另存取消分支、真实 IME、宿主 `/__asset`（本机宿主 INIT-FAIL，沿用第 57 轮）。

## BACKLOG 变更

- 新增 B-212（P2 → deferred）：删除确认框恢复说明与「撤销」提示矛盾。
