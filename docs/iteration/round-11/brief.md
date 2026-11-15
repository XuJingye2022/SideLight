# 第 11 轮简报

## 上轮结果

- commit `4878030`，tester 判 PASS-WITH-UNVERIFIED。
- 表格：未改动的表格整块复用原文，rich 5/7；frontmatter 后空行保真。
- 引用式链接：载入即源码，source 7/7；切回富文本有确认，首次保存仍拦截。
- 版本 0.23.0；安装包 810,456 B，便携 zip 889,108 B。

## 本轮目标

把 KaTeX 改成惰性加载，首屏 JS+CSS gzip 从约 365 KB 降到 **≤265 KiB（271,360 B）**。

1. 新增 `src/lib/katexLazy.ts`：动态 `import('katex')`，加载前返回占位，加载后通知重画；`vite.config.ts` 用 alias 把 `^katex$` 指过去，源码 import 不改。
2. KaTeX CSS 从首屏移除，与 JS 一起动态注入；`scripts/vite-woff2-only.mjs` 允许 2 个 CSS 资产。
3. 文档载入后扫 `$` 预取；含公式文档不许闪裸 LaTeX；插入、编辑、预览、导出、MathML 全部通过。
4. 版本 0.24.0；失败就回退 alias、记录 ADR-0012，不发版。

## 三个视角

- **缺陷**：Tiptap `extension-mathematics` 的同步 `renderToString` 与 NodeView 更新；占位后如何触发重画；公式插入时模块未到；导出 MathML 的异步；`math.test.ts`/`acceptance` 对 `.katex` 的即时断言；CSS 拆分后字体与布局闪烁。
- **体验**：首屏含公式文档的视觉闪动与布局偏移；加载中的占位样式；插入公式的延迟感；离线/加载失败的回退。
- **发布**：首屏 gzip 实测口径（脚本，不看 Vite 日志）；CSS 资产数断言；alias 对测试/构建的影响；0.24.0 体积与文档；失败时的回退与 ADR。

## 边界

- finder 只读，不改 `src/`、`host/`；报告写 `docs/iteration/round-11/findings-*.md`；截图 `shots/round-11/`。
- 不跑 `npm run build`，不装系统级依赖。
- 端口：应用 `http://localhost:5173`；CDP 9222 / 9223 / 9224 各归一个 finder。

## 交付

三份发现，每条带编号、证据、影响、建议、难度；另附优化机会最多 3 条。
