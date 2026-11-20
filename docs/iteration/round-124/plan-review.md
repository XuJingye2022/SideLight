# 第 124 轮计划审查（critic）

**结论：PASS**（P0 0 / P1 0 / P2 6）。范围与体积符合任务书；A1 对 HEAD `ff22b67` 成立，A2 主路径能区分修前/修后。下列 6 条执行前改掉即可。

## 范围与可行性
- 与任务书一致：只修第 123 轮 finder F2；排除 B-229/B-231/B-234/B-248/B-255/B-256；不加依赖、不改 CSS/编辑器/序列化。A1 = 4 文件 + 1 新测试，A2 只写 `.tmp/`。不超范围。
- 行号核正：`MarginRail.tsx:370-382` loadSnapshots、`:385-406` openReview、`:318` reviewRunRef、`:958-974` 快照段；`App.tsx:3397-3409` recordRevision、`:3498-3505` 成功分支、`:6017-6040` `<MarginRail>`；`revisions.ts:300-345` 返回 `string | null`。F2 证据 `.tmp/r123-finder-bug-def.json` 与描述逐字相符。
- 方案可行：epoch 只在 `writeRevision` 返回 id 后 +1；effect `!reviewActive` 早退；`snapSeqRef` 后发起者胜出；不推 `reviewRunRef`（否则 openReview `finally` 的 busy 永真）。

## 体积
- 基线 315,685 / chunk 7,416 与 r123 `test.md:35-36` 一致；门 ≤315,845（+160）、chunk ≤7,816（+400）与估算相容；门口径余 ≥4,155 B，硬线不破。
- 门+chunk 323,101→≤323,501 仍属 B-229；报告只能写「门口径未破、合计归 B-229」，不能写「硬线未破」。

## 必须改的 6 处（均 P2）
1. **`git diff --stat` 只 4 文件不成立。** 新文件 `revisionRefresh.test.ts` 自检时未跟踪，stat 只出 3 个已跟踪文件。修：用 `git status --porcelain`（3 M + 1 `??`）或 `git add -N`。
2. **预填静态计数与 HEAD 不符。** `git grep -n reviewRunRef -- src` 实测 **11 行**，非 plan 写的 5 行；「App 2 + MarginRail 4」也是预填。修：先跑命令记实测。
3. **静态门 ②「`setRevisionEpoch` 恰 1」会数到 2。** 声明行 `const [revisionEpoch, setRevisionEpoch] = useState(0)` 也含该标识符。修：断 `setRevisionEpoch(` 恰 1，且其后 500 字符含 `await writeRevision(` 与 `if (id)`。
4. **A2 ④ 计数窗口含糊。** 「关面板后 `Ctrl+S` 只 +1」与「重开行数 = 磁盘份数」混在一句；重开还会再读 1 次 `entries()`。修：拆两段——关闭→重开前恰 +1；重开后再 +1；行数断言单列。
5. **A2 前缺 dev 模块新鲜度检查。** Vite 旧 HMR 模块会让 A2 跑旧逻辑假红（AGENTS §8 已记两次）。修：A2 开头 fetch `/src/App.tsx` 与 `/src/components/MarginRail.tsx`，断言含 `revisionEpoch`。
6. **漏回归：改名脚本未列入。** A1 动 `loadSnapshots` 与 `docName` 边界，紧邻 B-254 改名迁移路径。修：回归加 `.tmp/e2e-r123-a1-rename-snap.mjs`（期望 12/12），与 r114 27/27、r101 57/57 同批。

## 备注
- `writeRevision` 去重路径也返回 id（`revisions.ts:328`），`if (id)` 语义是「已存在或已写」——行为无害，注释别写「仅新写才刷新」。
- B-255 证据列「第 124 轮首项」与本轮排除 B-255 冲突（B-255 在 P2 段、不阻塞）；lead/scribe 改一句即可。
