# Markdown 往返损失报告

这份报告由 `npm run roundtrip` 生成。它把 `fixtures/markdown/` 里的真实样本读进编辑器内核，再写回 Markdown，逐行对比差异。

「当前应用」这一列走的是 App 真正的保存流程：摘掉 frontmatter 与脚注定义、把行内标签的尖括号转成实体、解析、序列化、还原被转义的脚注引用、行内 HTML 与 callout 标记，最后把摘掉的块拼回。

只差空行的样本仍算「有变化」，因为空行影响排版；判断内容有没有丢，看 diff 里有没有正文行。

## 结论

- 仅 StarterKit：0 / 7 个样本完全保真，共 45 行发生变化。
- StarterKit + 表格 + 任务列表：0 / 7 个样本完全保真，共 37 行发生变化。
- 当前应用（扩展 + 保真修复）：3 / 7 个样本完全保真，共 15 行发生变化。

## 仅 StarterKit

| 样本 | 结果 | 删除行 | 新增行 |
| :--- | :--- | ---: | ---: |
| 01-obsidian-note.md | 有变化 | 6 | 8 |
| 02-table.md | 有变化 | 5 | 0 |
| 03-footnotes.md | 有变化 | 4 | 1 |
| 04-reference-links.md | 有变化 | 4 | 1 |
| 05-html-block.md | 有变化 | 4 | 4 |
| 06-task-list.md | 有变化 | 2 | 4 |
| 07-math.md | 有变化 | 1 | 1 |

### 01-obsidian-note.md

```diff
- title: 周记 2026-11
- tags: [随笔, 生活]
+ 
+ ## title: 周记 2026-11
+ tags: \[随笔, 生活\]
- ---
- > [!note] 想法
+ > \[!note\] 想法
- - [ ] 写读书笔记
- - [x] 还书
+ - 
+   写读书笔记
+ - 
+   还书
```

### 02-table.md

```diff
- | 项目 | 一月 | 二月 |
- |:-----|-----:|:----:|
- | 房租 | 3200 | 3200 |
- | 书   | 180  | 240  |
- 
```

### 03-footnotes.md

```diff
- 这句话有脚注[^1]，还有第二个[^note]。
- 
- [^1]: 第一条脚注。
- [^note]: 带名字的脚注。
+ 这句话有脚注[^1](第一条脚注。)，还有第二个[^note](带名字的脚注。)。
```

### 04-reference-links.md

```diff
- 参考 [Tiptap][tiptap] 与 [CodeMirror][cm]，还有 [行内链接](https://tauri.app)。
- 
- [tiptap]: https://tiptap.dev
- [cm]: https://codemirror.net
+ 参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。
```

### 05-html-block.md

```diff
- 行内按 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 触发分析。
+ 行内按 &lt;kbd&gt;Ctrl&lt;/kbd&gt; + &lt;kbd&gt;Enter&lt;/kbd&gt; 触发分析。
- <div class="callout">
-   <p>这是一段 HTML 块。</p>
- </div>
+ &lt;div class="callout"&gt;
+   &lt;p&gt;这是一段 HTML 块。&lt;/p&gt;
+ &lt;/div&gt;
```

### 06-task-list.md

```diff
- - [ ] 未完成
- - [x] 已完成
+ - 
+   未完成
+ - 
+   已完成
```

### 07-math.md

```diff
- \frac{a}{b} = c
+ \\frac{a}{b} = c
```

## StarterKit + 表格 + 任务列表

| 样本 | 结果 | 删除行 | 新增行 |
| :--- | :--- | ---: | ---: |
| 01-obsidian-note.md | 有变化 | 4 | 4 |
| 02-table.md | 有变化 | 3 | 5 |
| 03-footnotes.md | 有变化 | 4 | 1 |
| 04-reference-links.md | 有变化 | 4 | 1 |
| 05-html-block.md | 有变化 | 4 | 4 |
| 06-task-list.md | 有变化 | 0 | 1 |
| 07-math.md | 有变化 | 1 | 1 |

### 01-obsidian-note.md

```diff
- title: 周记 2026-11
- tags: [随笔, 生活]
+ 
+ ## title: 周记 2026-11
+ tags: \[随笔, 生活\]
- ---
- > [!note] 想法
+ > \[!note\] 想法
```

### 02-table.md

```diff
- | 项目 | 一月 | 二月 |
- |:-----|-----:|:----:|
- | 房租 | 3200 | 3200 |
+ 
+ | 项目  | 一月   | 二月   |
+ | :--- | ----: | :----: |
+ | 房租  | 3200 | 3200 |
+ 
```

### 03-footnotes.md

```diff
- 这句话有脚注[^1]，还有第二个[^note]。
- 
- [^1]: 第一条脚注。
- [^note]: 带名字的脚注。
+ 这句话有脚注[^1](第一条脚注。)，还有第二个[^note](带名字的脚注。)。
```

### 04-reference-links.md

```diff
- 参考 [Tiptap][tiptap] 与 [CodeMirror][cm]，还有 [行内链接](https://tauri.app)。
- 
- [tiptap]: https://tiptap.dev
- [cm]: https://codemirror.net
+ 参考 [Tiptap](https://tiptap.dev) 与 [CodeMirror](https://codemirror.net)，还有 [行内链接](https://tauri.app)。
```

### 05-html-block.md

```diff
- 行内按 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 触发分析。
+ 行内按 &lt;kbd&gt;Ctrl&lt;/kbd&gt; + &lt;kbd&gt;Enter&lt;/kbd&gt; 触发分析。
- <div class="callout">
-   <p>这是一段 HTML 块。</p>
- </div>
+ &lt;div class="callout"&gt;
+   &lt;p&gt;这是一段 HTML 块。&lt;/p&gt;
+ &lt;/div&gt;
```

### 06-task-list.md

```diff
+ 
```

### 07-math.md

```diff
- \frac{a}{b} = c
+ \\frac{a}{b} = c
```

## 当前应用（扩展 + 保真修复）

| 样本 | 结果 | 删除行 | 新增行 |
| :--- | :--- | ---: | ---: |
| 01-obsidian-note.md | 有变化 | 1 | 0 |
| 02-table.md | 有变化 | 3 | 5 |
| 03-footnotes.md | 完全保真 | 0 | 0 |
| 04-reference-links.md | 有变化 | 4 | 1 |
| 05-html-block.md | 完全保真 | 0 | 0 |
| 06-task-list.md | 有变化 | 0 | 1 |
| 07-math.md | 完全保真 | 0 | 0 |

### 01-obsidian-note.md

```diff
- 
```

### 02-table.md

```diff
- | 项目 | 一月 | 二月 |
- |:-----|-----:|:----:|
- | 房租 | 3200 | 3200 |
+ 
+ | 项目  | 一月   | 二月   |
+ | :--- | ----: | :----: |
+ | 房租  | 3200 | 3200 |
+ 
```

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

