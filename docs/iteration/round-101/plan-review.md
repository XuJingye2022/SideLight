# 第 101 轮计划审查（critic，复审 r1）

结论：**PASS**。上一版 2 P1 + 3 P2 全部落地；新发现 4 条 P2，不阻塞执行。任务切分、只读口径、红线判断不变。

## 上一版漏洞复核

| 项 | 落地 | 复核证据 |
| :--- | :--- | :--- |
| P1-1 | §1 并列两数（门 315,022 / 真实首载 315,022+5,593=**320,615**，超硬线 615，改前已如此）；A2 改 `measure-first-screen.mjs:8-9`；降级改首屏杠杆；真实首载交 lead + 开 B-229 | 复跑 `node scripts/measure-first-screen.mjs`：gzip 315,022 / headroom 4,978 / PASS；脚本 `:49` 同口径 `gzipSync(...,{level:9})` 量 `dist/assets/MarginRail-Blbb6wXV.js` = **5,593**（raw 14,814）；`App.tsx:20` lazy、`:5989-6000` 非预览恒渲染 |
| P1-2 | 选择器改 `.rail-diff-open ~ .rail-review-open{margin-left:0}`；A3 ⑭ 加右缘/间距断言 | 实机（ego CDP 57270、1432×882、head 320 宽）注入同盒 35×16 钮 + 一条样式：无 count 时 diff 1210–1245 / 在审 1252–1287，右缘差 **0**、间距 **7**、head 高仍 **16**；再注入 `.rail-count`（2 条，ml 168.5）后 diff/review ml 均 0，结果同 |
| P2-3 | A2 加 `aria-labelledby="rail-review-title"` + 标题 id | 照 `MarginRail.tsx:645-654` 的 r100 写法 |
| P2-4 | A2 明写 sheet 80vh / rows 60vh+overflow；A3 ⑮ 51 篇→50 行+truncated+可滚 | 与 `styles.css:1360-1418` 实际值一致 |
| P2-5 | A3 末记 `revision_count` 偏差进 test.md | 参考 `SKILL.md:228-230` |

## 新漏洞（P2）

- **P2-1** A3 ④ 断「当前行 `aria-current`」，与 §1 降级 ②「去 `activePath`/`aria-current`」冲突：真触发降级时 ④ 必假红。修：④ 改成「`.is-current` 或 `aria-current` 任一」，或降级只删样式、留属性。
- **P2-2** 四支提示实测只覆盖「无工作区」（⑨）与 truncated（⑮）；「无批注」与 capped（201 篇）只有 A1 单测，计划未记偏差。修：⑨ 拆两步（有工作区但全无批注 → 无批注文案；再清工作区 → 打开文件夹），capped 在 test.md 记「只单测」。
- **P2-3** 懒 chunk 净增只写「另记进真实首载账」，无上限；真实首载已超线 615 B，本轮再加就无法拒收。修：A2/A3 加「MarginRail chunk gzip ≤ 5,593+1,500」（level 9 同口径量），超了先合并选择器/收短文案。
- **P2-4** A2 的 `aria-haspopup` 要写 `="dialog"`（照 `MarginRail.tsx:259`），裸属性会渲染成 `true`（= menu）。

## 已核对

- HEAD `df57242` = startSha；工作树只有 `docs/iteration/round-101/` 未跟踪。
- `readAnnotationStore` 只读、目录缺回空 store（`annotations.ts:520-532`）；批注落点 = 文件所在目录（`App.tsx:892-896` + `workspace.ts:143-161`），与 A1 规则一致；`readDirectory` 跳过 `.` 开头（`workspace.ts:92-94`）→ `.sidelight`/trash 不进列表；`reviewStatusOf` 自带旧档迁移（`annotations.ts:57-63`）；`cacheKey('a.md')='a'`（`cache.ts:37-40`）→ 夹具 `ws/.sidelight/annotations/a.json` 可行。
- 新模块只被 MarginRail 引用 → 进懒 chunk，`collectReviewFiles` 在 `App.tsx` 0 的机制门成立；`npm test` 链尾加文件 = 61 文件（现 60/848），A1 的 ≥858 条自洽。
