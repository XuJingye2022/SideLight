# 第 23 轮简报（数据与 Markdown 修复）

## 侦察来源

第 22 轮六路报告（`docs/iteration/round-22/findings-*.md`）与第 21 轮遗留项。本轮不再派新侦察，直接修 P0/P1。

## 本轮目标

1. **浏览器草稿通道**：315 KB 文档编辑后刷新必须能从 `.sidelight/drafts` 恢复；源码模式与保存成功写 localStorage 也必须受 256 KiB 上限与 hostMode 守卫。
2. **打开文件大小门**：`Ctrl+Alt+O` 走 `pickFile/openSingleFile` 时先查 `File.size`，与文件树共用 5.5 MiB 常量与文案。
3. **删除脏文件的字节保真**：trash 副本保留 BOM/GBK/CRLF；先写 trash 成功再删原文件；缓存搬移失败要回滚，不能留下空 drafts/annotations 且无撤销。
4. **脚注续行收紧**：只认 4 空格/tab 续行，不能把「段首空两格」的正文吞进脚注。
5. **公式 `\$` 转义**：`价格 \$100 与 $x^2$` 不能生成坏公式节点，保存不能二次转义。
6. **CRLF 尾部空行**：1–2 个尾部空行不能被吞，≥3 个不能写 `&nbsp;` 增长。

## 预算

- 现 284,903 / 285,000（余 97）。本轮为数据安全修复把上限临时放宽到 **286,000**，STATE 记录理由；仍超则按「表配对 → CRLF 空行」砍，不无限放宽。
- 每任务单独 `.tmp/build-a|build-b` + measure，合并后 root 再测。

## 分工

- A（builder）：`src/App.tsx`、`src/lib/workspace.ts`、`src/lib/trash.ts`、`src/components/TreeActions.tsx`；草稿、大小门、trash 字节/回滚。
- B（builder2）：`src/lib/math.ts`、`src/lib/footnotes.ts`、`src/lib/serializeDocument.ts`、`src/lib/risk.ts` 与测试；公式、脚注、CRLF 空行。
- 零重叠；不改 `.github`、package、README（版本由 B 在验收后统一）。
- 版本 0.31.0（数据可靠性 + 体验修复）；测试进既有文件，保持 16 文件 213 条起。

## 边界

- 不做 UX/安装/性能（24–25 轮）。
- 真实宿主/IME/macOS/网络盘仍 UNVERIFIED。
- 每条修复要有可复现断言；不能只改文案。
