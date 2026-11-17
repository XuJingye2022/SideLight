# 第 53 轮 finder-code（代码与性能）

门禁：`npx tsc --noEmit` exit 0；`npm test` exit 0（**34 文件 442 条 0 fail**，`.tmp/r53-test.log`）。
种子与前两轮逐字相同（`.tmp/e2e-r53-finder-code.mjs:10-18`）：1,000,012 字符 / 44,446 块，100,010 / 4,647。
基线：载入 ready **612 ms（100 KB）/ 2,645 ms（1 MB）**（第 52 轮 2,889/2,947，无回退）；1 MB 滚动 12,000 px，rAF 帧间隔 p50/p95 17 ms、最长 33 ms、>100 ms 帧 0；12 键 12 字，两篇都不掉字。

## F1（P1，性能）1 MB 逐键 p50 **126** / p95 **149** ms，每键一条 139–176 ms long task

- 实测 `.tmp/r53-finder-code.json` keysBig：12 键样本 121–149 ms，longtask 13 条（56–167 ms）；100 KB 对照 p50 13 / p95 17 ms、0 条 longtask。
- 机制：`onUpdate` 每键算 dirty 就整篇序列化——`src/App.tsx:963` → `:3021-3028` `currentMarkdown` → `:3011-3019` `serializeBodyNow`；同键 300 ms 后 `:980` 的 `getMarkdown()` 再整篇一次。CPU 归因（`.tmp/r53-finder-code-prof.json` keyOne）：tiptap markdown 序列化 91 ms + react-dom 41 ms（700 ms 窗口）。
- 影响：越过 100 ms 跟手门槛，1 MB 文档输入可感知卡顿、无提示。BACKLOG B-205 原记「1 MB 逐键 p95 未测」，本条给出实测，建议提为 open P1。
- 修法方向：dirty 不整篇序列化（按 transaction 是否触及文本判脏，序列化结果按 doc 版本缓存，精确比较留到保存前）。

## F2（P1，性能）1 MB 切源码冻结 **9.96–11.48 s**

- 进源码 9,958 / 11,484 ms，单条 long task 11,164 ms，其中原生 `removeChild` 自时 **9,754 / 9,984 ms**；退出源码（回富文本）2,672 ms。
- 机制：源码分支整棵卸载 `.ProseMirror`（44,446 块）再挂 1 MB 受控 `<textarea>`（`src/App.tsx:5350` 换分支、`:5365-5370` textarea、`:5380` 的 `EditorContent` 被卸载），同一同步任务；`initTextarea` 仅 17 ms。
- 影响：大文档点「源码」像卡死，无进度提示。
- 修法方向：切源码时隐藏而不卸载编辑器容器（`display:none` + `setEditable(false)`）；或大文档先给提示、分帧转换。

## F3（P2，写放大）一次按键停笔写 **2 份全文**（各约 1.58 MB）

- `.tmp/r53-finder-code.json` pauseBig：1 字符 + 4.2 s 停顿后 `{getFile:2, text:0, writable:2, close:2}`，落盘 UTF-8 1,577,813 B。
- 路径：`:1004-1027` 停笔 1.1 s 写 `.sidelight` 草稿（整篇）；`:3463-3469` 停笔 2 s 自动保存再写整篇，成功后删草稿。
- 判断：草稿（崩溃兜底）与自动保存都合理；B-006 已从 4 份降到 2 份，属设计权衡，记现状不重复计数。自动保存开启时可降草稿频率（≥5 s 或只写脏区）。

## 未测

生产构建逐键（只测 dev，DEV 开销偏高，不能当生产 p95）；真实磁盘（非内存假 FSA）写放大耗时；中文 IME 组合输入下的逐键。
