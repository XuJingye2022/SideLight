# 第 06 轮简报

## 上轮结果

- commit `2b031e8`，tester 判 PASS-WITH-UNVERIFIED。
- 键盘可用：skip link、快捷键一览、`Ctrl+Alt+*` 键位、焦点归还；`Ctrl+Shift+S` 不再误加删除线。
- 三档主题（浅/深/跟随系统），刷新无白帧；HTML 导出用 MathML 自包含；字体裁到 15 个 woff2。
- 版本 0.18.0；安装包 788,878 B，便携 zip 866,981 B。

## 本轮目标

打通「双击 / 命令行打开 `.md` → 编辑 → `Ctrl+S` 写回原文件」，替掉只读横幅。

1. **宿主 IPC 写回**：路径只允许 argv 打开的那个；保留 BOM 与换行；原子写。
2. **前端**：检测宿主桥；`Ctrl+S` 写回；失败提示且不清 dirty；另存为后清除宿主路径；横幅改成「写回原文件」。
3. **文档**：ADR-0006、CHANGELOG 0.19.0、README 的只读说明改掉。

## 消息协议（两边必须一致）

- 宿主在页面加载前注入 `window.__sidelightHost = { v: 1, writable: true, fileName: 'x.md' }`，不含完整路径。
- 前端保存：`window.chrome.webview.postMessage({ v: 1, type: 'save', id: '<uuid>', text: '<markdown>' })`。
- 宿主写回启动时记住的路径，回复：`{ v: 1, type: 'save-result', id, ok: true, bytes }` 或 `{ v: 1, type: 'save-result', id, ok: false, error: '...' }`。
- 前端 10 秒超时；失败保留 dirty 并提示可重试。
- 只允许写 argv 路径；其他路径一律拒绝。UTF-8 默认，原文件有 BOM 就保留；换行按原文件（CRLF/LF）保留；先写临时文件再替换。

## 边界

- finder 只读，不改 `src/`、`host/`；报告写 `docs/iteration/round-06/findings-*.md`；截图 `shots/round-06/`。
- 不跑 `npm run build`，不装系统级依赖，不写注册表。
- 端口：应用 `http://localhost:5173`；宿主 `http://127.0.0.1:47821`；CDP 9222 / 9223 / 9224 各归一个 finder。

## 交付

三份发现，每条带编号、证据、影响、建议、难度；另附优化机会最多 3 条。
