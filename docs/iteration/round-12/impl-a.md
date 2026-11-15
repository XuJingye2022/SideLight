# 第 12 轮 · A 组实施报告（T1 → T2 → T3）

日期：2026-11-16。基线 `6bd6831`（v0.24.0）。未 commit；未跑 `npm run build`；`npx vite build --outDir .tmp/build-a` 只用于体积估计。
边界：`src/**`、`scripts/tree-acceptance.mjs`；未碰文档、`package.json`、host/packaging。

| 任务 | 结论 | 证据 |
| :--- | :--- | :--- |
| T1 文件树操作 | **PASS** | `tree-acceptance` 40/40：删除进 `.sidelight/trash`、SHA-256 一致、原名不存在、撤销回位；move 优先与无 move 的 copy→SHA→remove 回退；复制内容不一致时保留原件、清掉半成品；同名同秒两份、`:` 清洗、子目录只删自己；新建文件夹重名提示；`.sidelight` 是文件时 ＋ 禁用并给 title；示例态整宽「打开文件夹…」无删除入口 |
| T2 删除竞态与刷新 | **PASS（6/8 场景实测）** | 删当前文档后输入 3.3 s：原路径不存在、没有写回被删路径；慢速 writable 在飞时删除：原路径仍不存在、trash 一份；删最后一篇回空「未命名」；外部删除刷新提示「已不在磁盘上…只能另存为」，之后 Ctrl+S 不写原路径；外部改名刷新提示「改名/移走」，不静默写旧/新路径。**未实测**：手动保存（`saving`）在飞时删除、刷新期间自动保存不写旧目标（代码路径同一 `waitForCommit`/generation 守卫） |
| T3 可访问性 | **PARTIAL（核心 PASS，可延后两项按体积砍掉）** | 核心：`role=tree` + `aria-selected`、树内 1 个 tab 站、↑↓/Home/End/→/←/Enter/Delete、Tab 不困住、Delete 弹确认；仅 1 个常驻 polite live region、视觉 toast `aria-hidden`；FindBar 三个按钮 `aria-label`。**砍掉**：侧栏 `role=tablist/tablist/tabpanel/aria-controls`、大纲 `aria-current`（体积门优先，T5/T4 需在文档记「延后项」） |

## 关键实现

- **`src/lib/trash.ts`**：`trashName`（`YYYYMMDD-HHmmss-<随机 base36>-<清洗名>`，清洗 `<>:"/\|?*` 与控制字符、Windows 保留名加 `_`、≤120）；`ensureTrashDir` 区分 `.sidelight` 是文件/无权限；`deleteFileToTrash` 按完整 `path` 找父目录（去掉 workspace 根名），`move()` 优先，回退 copy→SHA-256→remove，比对失败清理 trash 副本并保留原件；`restoreFromTrash` 同样优先 move。
- **`src/lib/workspace.ts`**：`readDirectory` 每项 try/catch（消失/无权限只跳过该项），导出 `refreshWorkspace`。
- **`src/components/FileTree.tsx`**：树头 `[＋ 新建 ▾] [⟳] [⋯]`；行级 hover/聚焦 `⋯`、右键、Delete、Shift+F10；删除确认 `.dialog`，取消默认聚焦；`role=tree/treeitem/group`、roving tabindex、方向键/Home/End/Enter/Delete；示例态整宽「打开文件夹…」。
- **`App.tsx`**：`deletingRef`/`refreshingRef`/`autoSaveGenerationRef`；删除前停 auto/草稿计时、清 pendingConfirm/pendingSwitch、`waitForCommit`（在飞 performCommit/host save 最多 2 s）；`performCommit` 写前校验 generation/删除/刷新/句柄，写后若删除已发生再 `removeEntry` 一次；刷新重绑 `activeFile`，找不到清句柄并标「只能另存为」；删除后下一行/空文档、清 draft/annotations 缓存、toast「撤销」。
- **T3**：树语义与键盘、单一 polite live region（`sr-only`，错误不重复播报）、toast `aria-hidden`、FindBar 三个 aria-label；侧栏 tab 与大纲 aria-current 已写但为体积撤下。
- **体积**：`trash.ts` 改为按需 `import()`，不进首屏。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 文件、205 条断言、0 失败
npx vite build --outDir .tmp/build-a  → exit 0
node scripts/tree-acceptance.mjs      → 40/40 PASS
node scripts/measure-first-screen.mjs --dir .tmp/build-a → 284,134 gzip（≤285,000，余 866 B）
```

**首屏增量**：0.24.0 基线 282,809 gzip → 本轮实测 **284,134**（+1,325 B，约 +0.47%），低于 285,000 软线 866 B。为压体积：`trash.ts`、`TreeActions`（行菜单/删除确认/树头下拉，样式改内联）、`FindBar`、`Outline` 都改为按需 `import()`；删除未使用的 `checkTrashAvailability`、`FileTree` 的 `onOpenSingleFile`/`onOpenDemo`、无引用的 `.source-hint`/`.skip-link-tree`/`.tree-group`/`.tree-row-more:focus-visible` CSS。功能与行为未改。

## 截图

- `shots/round-12/t1-trash.png`（删除到回收站 + 撤销）
- `shots/round-12/t2-external-gone.png`（外部删除后刷新）
- `shots/round-12/t3-tree-a11y.png`（树语义与键盘）

## 遗留

1. T2 的「手动保存 in-flight 时删除」「刷新期间 auto 不写旧目标」只有同一套守卫代码，未单独用例；根代理/B 若要严格闭环可补。
2. T3 可延后两项（侧栏 tab、大纲 aria-current）本轮未交付，需在 T4 文档记录。
3. 首屏 284,134（≤285,000，余 866 B）；`.tmp/build-a` 不是最终产物，最终以根代理 build + measure 为准。
4. `tree-acceptance` 用内存 FSA 替身，真实 Edge/WebView2 的 `move()`、网络盘/只读目录、`trash` 手工恢复未验。
