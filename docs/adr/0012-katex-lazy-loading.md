# KaTeX 惰性加载：首屏 364,960 → 282,809 B，265 KiB 不可达

KaTeX 曾是首屏最大的非必要字节：`@tiptap/extension-mathematics` 顶层静态 `import katex`，扩展在编辑器首帧注册，KaTeX 的 JS（约 259 KB）与 CSS（约 27 KB）都进首屏。只打开无公式文档的用户也要付这份钱。

本轮把 KaTeX 拆出首屏：首屏 gzip **364,960 → 282,809 B（−22.5%）**；265 KiB（271,360 B）**不可达**，差 11,449 B。

## 决定

1. `vite.config.ts` 用数组 + 正则 alias：`{ find: /^katex$/, replacement: path.resolve('src/lib/katexLazy.ts') }`。只匹配裸 `katex` 说明符，不误伤 `katex/dist/…` 深路径。
2. `katexLazy.ts` 提供 default 与命名导出；`katexLoader.ts` 用**深路径**动态 `import('katex/dist/katex.mjs')` 与 `import('katex/dist/katex.min.css')`，CSS 随动态 chunk 走。
3. 渲染层用注册表 + 订阅：第一次渲染公式时触发加载；加载中显示占位，失败显示可重试的失败态，正文不受影响。
4. 含公式的首屏**非阻塞预取** KaTeX chunk（`requestIdleCallback`/`setTimeout`），不等待、不阻塞首帧。
5. 块级公式 `displayMode` 由 `$$…$$` 推断；导出在 KaTeX 未加载时走保底路径（不阻塞、不报错）。
6. `chunkSizeWarningLimit` 保持 1200（主 chunk 约 883 KB）。

## 实测（脚本口径：`scripts/measure-first-screen.mjs`，逐文件 gzip level 9）

| 项 | 字节 |
| :--- | ---: |
| 改造前首屏 gzip | 364,960 |
| 改造后首屏 gzip | **282,809**（index JS 276,401 + index CSS 6,396） |
| 首屏 raw | 913,137（882,627 + 30,510） |
| KaTeX 独立 chunk（gzip） | 77,660（JS 258.78 kB / CSS 26.62 kB） |
| 265 KiB 目标 | 271,360 |
| 差距 | **+11,449（不可达）** |

说明：

- 阶段 B 记录过 **281,471 B**，本轮构建实测 **282,809 B**（+1,326 B），差异来自构建内容不同；文档与验收以脚本当次输出为准。
- 全量 stub 的上限是 **279,087 B**——即使把 KaTeX 相关模块全部换成空实现，也到不了 271,360。265 KiB 需要一个本轮没做的第二杠杆：把 `@tiptap/extension-mathematics` 从首屏注册链里摘出去（或换扩展），属于独立改动。
- 脚本合计 282,809 与「两文件拼接后整体 gzip」282,775 相差 34 B；验收用逐文件求和（与浏览器实际请求对齐）。

## 被否决的方案

- **对象形式 alias**（`{ katex: … }`）：Vite 按字符串前缀匹配，`katex/dist/...` 也会被改写；实测 `'^katex$'` 作为对象键永不命中。
- **字符串前缀 alias**（`'katex'`）：会把深路径一起指到 shim，loader 自引用。
- **`renderToString` 改 async**：Tiptap 的渲染链同步，改 async 会牵动三处调用与首帧时序，收益仍是同一份 KaTeX 字节。
- **只拆组件不拆 tiptap 扩展**：扩展仍在首帧静态 import `katex`，字节不会降。
- **await parse 阻塞首屏**：把问题从「下载」挪到「等待」，更糟。

## Kill criteria 与结果

- 判据：`measure --max 285000` 超线，或首屏仍含 `katex`/lazy chunk，或公式/导出回归。
- 结果：**未触发**。首屏 gzip 282,809 ≤ 285,000；首屏集合只有 index JS 与 index CSS；`math-ready-acceptance` 11/11、acceptance dev 11/11、`npm test` 205 条全绿。
- 265 KiB 目标未达成，但这是「目标不可达」而不是「本轮方案失败」：Kill 判据用的是 285,000 软线。

## 下一轮第二杠杆

把 `@tiptap/extension-mathematics` 移出首屏注册链（惰性注册扩展或换一个不静态 import katex 的公式扩展），预计能再降 10–20 KB；需先量出扩展自身与 KaTeX 的耦合面。

## UNVERIFIED

- 真实 WebView2 冷启动的首屏时间（本机只有 FCP 探针）。
- 离线时 KaTeX chunk 加载失败的失败态与重试。
- CLI 下 `npm test` 看不到 alias（测试在 Node 里跑，不走 Vite alias）。
- `katexLazy.test.ts` 尚未挂入 `npm test`。

## 状态

2026-11-16 接受（0.24.0）。0.26.0 产物：setup 817,347 B（SHA256 `FE2EF144D06AAA4F9667ADB1934929082C77D78FE2A1BD690BD6B16F3F08A268`）、便携 zip 899,829 B（SHA256 `9C18FC9CA29F7311010E3D2570F2C6AE6C6A8358EDD0C6951D24FAD232CB98BC`）；构建产物 1,434,502 B。
