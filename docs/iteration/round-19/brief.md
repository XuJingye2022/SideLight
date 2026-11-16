# 第 19 轮简报（收尾硬化）

## 上轮结果

- v0.30.1 已发布：Windows 818,553 B / 902,786 B、macOS Universal 890,510 B。
- 保存竞态、丢字、大文件上限已修；性能只完成 10 KB 冒烟，100 KB/1 MB 未测。
- 开源文档、SECURITY、PRIVACY 草案、Issue/PR 模板、Release 说明模板已上线。
- 第 17 轮验收发现：保存成功后草稿未清（draft 57/58）；性能数字不可复现。

## 本轮目标

1. **修复草稿清理回归**：保存成功且无新输入时发 `draft-clear`；保存中继续输入则保留。
2. **更正性能陈述**：删除不可复现的 4.47 ms/1078 ms，写「仅 10 KB 冒烟、波动 4.47–6.77 ms、100 KB/1 MB 未测」。
3. **发布 0.30.2**：Windows + macOS Universal，自动 release，校验和；不升 1.0（macOS 真机/签名公证/Intel/隐私确认仍未完成）。
4. **20 轮收尾准备**：仓库、Release、文档、STATE 一致；无密钥/临时产物入库。

## 三个视角

- **缺陷**：保存/草稿序列、保存中继续输入、切文档、6 MB 上限；性能数字与脚本可信度。
- **读者**：Release 页、README、CONTRIBUTING、PRIVACY 草案是否诚实；0.30.2 升级说明。
- **发布**：版本/CHANGELOG/包名/校验和；自动 release 是否稳定；仓库健康与 secrets 扫描。

## 边界

- finder 只读，不改 `src/`；报告 `docs/iteration/round-19/findings-*.md`。
- 不推 tag、不改 GitHub 设置、不写隐私承诺定稿。
- 端口：应用 `http://localhost:5173`；CDP 9222/9223/9224。

## 交付

三份发现，每条带编号、证据、影响、建议；另附「20 轮收尾检查表」。
