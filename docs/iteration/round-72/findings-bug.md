# 第 72 轮 finder-bug 侦察报告

- 角色：finder-bug（只读，不改产品代码）
- HEAD `4cccb036`（= 轮前 startSha，工作树干净）；dev `http://localhost:5175`；CDP 9222，跑前 `node .tmp/reset.mjs 9222`
- 结论：**0 个新 P0/P1**。1 条新 P2（过期草稿残留）。复核 2 条已有 P2 仍成立（不重复计数）。

## 路径与证据

脚本 `.tmp/e2e-r72-bug-a.mjs`、`-c.mjs`、`-d.mjs`；读数 `.tmp/r72-bug-{a,c,d}.json`。假工作区用 `DataTransferItem.getAsFileSystemHandle` 注入（补了 `move()` 才能测改名）。三条脚本均 0 pageerror、0 console error。

| 路径 | 实测 | 判定 |
| :--- | :--- | :--- |
| 输入→保存→重开 | `Ctrl+S` 后 `a.md` 9→13 字符、toast「已保存 a.md」；切 b.md 再切回，正文含「第四行Z」 | 通过 |
| 改名（当前打开的 a.md→x.md） | Enter 后标题/活动行 x.md、盘上 x.md 13、旧键消失；再打字 `Ctrl+S` 写 x.md 17、toast「已保存 x.md」 | 通过 |
| 删除→撤销 | 确认后切 b.md、`x.md` 进 `.sidelight/trash/…-x.md`、toast 带「撤销」；撤销后 x.md 回盘（17） | 通过 |
| Ctrl+P / Ctrl+K / Ctrl+F | 焦点进 `.quick-open-input`、过滤 `ro` 后 Enter 打开、焦点回 `.ProseMirror`；Ctrl+K 出 `.link-editor-input`×2、Esc 后回正文；Ctrl+F Esc 后回正文 | 通过 |
| 只读保存失败 | `createWritable` 抛 `NotAllowedError`：toast「保存失败：denied。改动还在，可以再试一次。」、盘不变、`.sidelight/drafts/ro.md` 14 字符兜底 | 通过 |
| 设置面板挡自动保存 | 打字后 150 ms 开设置：3.3 s 内盘不写、草稿 13；关后 3.5 s 内补存（盘 14），再打一字又存 15 | 通过 |
| 748,888 字符 / 20,000 段 | 打开 1,416 ms 出全文（`innerText` 748,888、末段正确）；末尾打字 `Ctrl+S` 96 ms 落盘 +3 字符 | 通过 |

## F1（P2，新）：模态挡住自动保存时写的草稿，保存成功后不清理

- 复现：打开 `a.md` → 打字 → 2 s 内打开「设置」→ 等 2.5 s（草稿计时器到点）→ 关设置 → 自动保存成功。
- 证据（`D1.*`）：`whileDlg` 盘 9、`.sidelight/drafts/a.md` 13；`afterWait` 盘 14 +「已保存 a.md」，草稿仍 13；再打一字后盘 15，草稿仍 13。
- 期望：保存成功后删本篇草稿（宿主模式与竞态分支都删）。
- 实际：只有 `scheduleDraft` 闭包的竞态分支删（`src/App.tsx:779-784`），`finishSaved`（`src/App.tsx:3032-3070`）不删。
- 影响：`.sidelight/drafts/` 每篇留一份过期副本；该草稿 mtime 早于保存，下次打开不弹恢复（`src/App.tsx:2453`），无数据风险，属缓存残留。
- 建议：`finishSaved` 顺手 `removeCache(dir,'draft',cacheKey(name))`；或在 `src/App.tsx:2453` 的 `cached.text === text` 分支里删。

## 复核已知条目（不重复计数）

- 改名成功 toast 仍是刷新文案「已刷新：新增 1 个，消失 1 个」→ `B-208`（deferred）。
- 删除确认框只说「用文件管理器把 trash 里的文件移回原位」，与成功 toast 的「撤销」矛盾 → `B-212`（deferred）。

## 未验证

- 真实 FSA 的 `move` 与 `lastModified`：用假句柄注入，改名与草稿新旧判定只验应用逻辑。
- 1 MB 滚动与位置还原：自写脚本选的滚动容器不对（`max=0`），UNVERIFIED；载入/保存两项有效。
- `>5.5 MiB` 拒绝提示、真实 IME、宿主 WebView2：本轮未碰。
