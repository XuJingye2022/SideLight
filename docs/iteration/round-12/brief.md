# 第 12 轮简报

## 上轮结果

- commit `6bd6831`，tester 判 PASS-WITH-UNVERIFIED。
- KaTeX 惰性：首屏 364,960 → **282,809 B**（−22.5%）；公式渲染/编辑/预览/导出全过。
- 版本 0.24.0；安装包 811,756 B，便携 zip 891,471 B。

## 本轮目标

1. **文件树操作**：新建文件夹、删除（移到 `.sidelight/trash/<时间戳>-<名字>`，不直接永久删）、刷新；删除/新建前处理未保存改动；FSA 无 rename API 的事实写清。
2. **可访问性**：图标按钮补 `aria-label`；文件树/大纲加 `role="tree"/"treeitem"` 与 `aria-selected`；toast 加 `aria-live`；焦点顺序与 skip link 复核。
3. 版本 0.25.0，更新 CHANGELOG/README/AGENTS/ADR-0013。

## 三个视角

- **缺陷**：FSA 目录/文件删除与复制失败的半完成状态；trash 目录不可写；根目录删除；未保存文档被删；刷新时句柄失效；树选中态与当前文档不一致。
- **体验**：树上的新建/删除/刷新入口是否可发现；删除确认文案（能否恢复、去哪了）；空文件夹；错误提示；键盘操作树。
- **发布**：0.25.0 版本、体积（当前 811,756，硬线 850,000）、README「能/不能」、ADR-0013、隐私（trash 只在本地）。

## 边界

- finder 只读，不改 `src/`、`host/`；报告写 `docs/iteration/round-12/findings-*.md`；截图 `shots/round-12/`。
- 不跑 `npm run build`，不装系统级依赖。
- 端口：应用 `http://localhost:5173`；CDP 9222 / 9223 / 9224 各归一个 finder。

## 交付

三份发现，每条带编号、证据、影响、建议、难度；另附优化机会最多 3 条。
