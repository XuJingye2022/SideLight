# 第 101 轮执行记录（impl）

- round=101，startSha `df57242`；单轮，任务 A1/A2/A3 同批（用户 2026-11-20 要求把三条并到这一轮）。
- 状态：**A1 PASS / A2 PASS / A3 PASS（57/57）**；`tsc` / `build` / `npm test` / `verify` 全绿，`roundtrip` 未跑（未碰编辑器与序列化）。

## 逐任务

| 任务 | 状态 | 落地 |
| :--- | :--- | :--- |
| A1 数据层 | PASS | 新 `src/lib/reviewFiles.ts`（`collectReviewFiles`：只读、在审=有档且 annotations 非空、open 只算 open 档、目录解析按目录缓存、maxFiles/maxRows 双上限、open 降序同数 path 升序）；新 `src/lib/reviewFiles.test.ts` **13 条**；`package.json` 的 `test` 链尾追加该文件 |
| A2 UI 与接线 | PASS | `MarginRail.tsx`：`.rail-head` 末尾「在审」入口 + 只读 sheet（复用 diff 外壳/行容器，四支提示、busy、Esc/关闭钮/背板/`useDialogFocus`）；`App.tsx`：`getReviewWorkspace` / `activePath` / `onOpenReviewFile`（同篇短路）；`styles.css`：4 组新规则 + `.rail-review-open` 并入 `.rail-diff-open` 块；`scripts/measure-first-screen.mjs:8-9` chunk 注释 2,327→6,489 |
| A3 真机 + 回归 | PASS | 新 `.tmp/e2e-r101-review.mjs`（假 FSA，57 条断言）；`docs/iteration/round-101/test.md`；`shots/round-101/` 2 张 |

## 命令结果

- `npx tsc --noEmit`：exit 0。
- `npm run build`：exit 0（`host-www` 镜像 98 文件）。
- 首屏门：`node scripts/measure-first-screen.mjs --max 316000` → **gzip 315,146 / headroom 4,854 / PASS**（基线 315,022，净 **+124 B**）。
- 常驻 `MarginRail` chunk：`gzipSync(level:9)` **6,489 B**（raw 18,336；改前 5,593 / 14,814，+896，门槛 5,593+1,500 内）→ 真实首载 **321,635 B**。
- `npm test`：**61 文件 861 条 0 fail**（`.tmp/r101-impl-npmtest.log`）。
- `changelog.test.ts`：3/3（标题改 29–101 并写第 101 轮小节）。
- E2E：`.tmp/e2e-r101-review.mjs` **57/57**、0 pageerror（`.tmp/r101-e2e-review.json`）。
- 回归：`.tmp/e2e-r97-a1-status.mjs` **44/44**、`.tmp/e2e-r100-diff.mjs` **43/43**；两者重写的 `shots/round-97`/`round-100` 截图已 `git checkout --` 还原。

## 截图

- `shots/round-101/review-list.png`
- `shots/round-101/review-truncated.png`

## CHANGELOG 建议（已写入 `docs/CHANGELOG.md` 第 101 轮小节）

- 在审文件列表：只读数据层 `collectReviewFiles` + 右侧「在审」只读面板（B-228）；首屏门 +124 B、chunk +896 B、真实首载 321,635 B 记 B-229。

## 新踩坑（3 条）

- **假 FSA 的 `entries()` 只 yield 文件、不 yield 第一段目录名时，子目录在文件树里不出现**：r100 的 `mkDir` 没有子目录用例，本轮 `sub/b.md` 被跳过（树里只有 2 篇，`sub` 目录 0 个）。`entries()` 要按「第一段名字」同时产出文件与目录。
- **夹具批注的 quote 必须是正文子串**：载入文档时 `restoreAnnotationsFor` 按 `findRange` 用 quote 重新定位（`App.tsx:2531-2545`），quote 对不上就静默丢条目 → 卡片数 0；store 里的 from/to 会被重算。
- **`.rail-overall` 只在有整体评价/未定位批注时渲染**（`MarginRail.tsx:602` 的条件），夹具没有 `notes` 里的 overall 时 ⑫「末卡底 ≤ 整体评价顶」永远拿到 null。
