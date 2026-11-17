# Markdown 往返损失报告

这份报告由 `npm run roundtrip` 生成。三个数字分开算，不再合并成一个「保真数」：

- **rich**：富文本路径，走 App 真正的保存流程（摘 frontmatter/脚注 → 解析 → 共享 `serializeDocument`，含表格整块复用）。
- **source**：源码路径。源码模式不经过解析，`Ctrl+S` 写出的就是输入原文，按定义等值；前提是源码没有被编辑。
- **firstSaveBlocked**：切回富文本后第一次保存是否仍被差异门拦下（基线里有 blocking 结构损失）。

表格复用只保证表格行内字节；表格前后的空行仍由文档级 `\n\n` 决定（0/1 个空行与原文一致，≥2 个会被规范化）。

## 汇总

- rich：6 个样本完全保真（共 8 个），共 6 行发生变化。
- source：8 个样本等值（共 8 个；按定义，未编辑）。
- firstSaveBlocked：1 个样本首次保存仍会被拦（共 8 个；04-reference-links.md）。

## 逐样本三栏

| 样本 | rich | source | firstSaveBlocked |
| :--- | :--- | :--- | :--- |
| 01-obsidian-note.md | 完全保真 | 等值（未编辑源码） | 否 |
| 02-table.md | 完全保真 | 等值（未编辑源码） | 否 |
| 03-footnotes.md | 完全保真 | 等值（未编辑源码） | 否 |
| 04-reference-links.md | 有变化（-4 +1） | 等值（未编辑源码） | 是（引用式链接定义 [tiptap]: … 会被丢掉，正文里的链接会被改写成行内形式；引用式链接定义 [cm]: … 会被丢掉，正文里的链接会被改写成行内形式） |
| 05-html-block.md | 完全保真 | 等值（未编辑源码） | 否 |
| 06-task-list.md | 有变化（-0 +1） | 等值（未编辑源码） | 否 |
| 07-math.md | 完全保真 | 等值（未编辑源码） | 否 |
| 08-inline-html.md | 完全保真 | 等值（未编辑源码） | 否 |

## 富文本路径的逐行差异

### 04-reference-links.md

```diff
- 参考 [Tiptap][tiptap] 与 [CodeMirror][cm]，还有 [行内链接](https://tauri.app)。
- 
- [tiptap]: https://tiptap.dev
- [cm]: https://codemirror.net
+ 参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。
```

### 06-task-list.md

```diff
+ 
```

## 已知边界

- 06-task-list.md：列表项之间多 1 个空行。taskList 与 bulletList 的 schema 互斥，不修；二次往返已经收敛。
- 01-obsidian-note.md / 02-table.md 的 rich 结果以本表为准；`npm run roundtrip` 每次重算，不写死样本数。

