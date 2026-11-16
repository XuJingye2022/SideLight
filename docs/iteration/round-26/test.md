# 第 26 轮 · 最终验收（tester，v0.32.0）

日期：2026-11-16。v0.32.0；产品提交 `c035a1d`，HEAD `b148e0e`（仅 docs/STATE 领先）。本机 Windows；未改产品代码、未 commit。

## 门禁

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| build | PASS，130 modules，0 warning | `.tmp/r26-build.log` |
| `npm test` | 17 文件、**248 条**、0 失败 | `.tmp/r26-test.log` |
| measure | PASS，**285,997 B ≤286,000** | `.tmp/r26-measure.log` |
| roundtrip | source **7/7**（rich 5/7） | `.tmp/r26-roundtrip.log` |

## #1 重开：PASS-WITH-UNVERIFIED

- `session-acceptance` **15/15**：OPFS 重载树/文档/批注、Ctrl+S 0 picker；单文件写回；宿主文档重开恢复树/批注/host save。
- 真实宿主关掉重开后权限恢复、批注从 `/__annotations` 重载仍未单独跑，**UNVERIFIED**；旧会话已丢弃批注不可恢复，按事实。

## #2/#3 批注 v2：PASS

- `annotation-flow` **8/8**：两次重跑不翻倍、窗口外不误删/id 复用、overall 进 DocNote、unresolved 保留 quote、旧数组兼容 v2；`.rail-overall` 截图存在。
- `host-annotation-acceptance` **6/6**：`GET /__annotations` 200 且 text 与磁盘一致；无缓存 200 空 v2 store；annotations-save 落盘、伪造 path 拒绝、只读/512 KiB 错误码全过。
- `npm test` 提示词 ≤1500/overall/最多 1 revision/论证判断规则全过。

## #7 DeepSeek：PASS-WITH-UNVERIFIED

- 搜索 12 条单测：官方 Search 请求、summary/snippet、空结果、错误码、300 字截断全过；真实 Key/接口 **UNVERIFIED**。

## 发布 / 文档 / 仓库：PASS

- Release **v0.32.0**：setup **824,473 B**、win zip **910,519 B**、mac **906,060 B**、`SHA256SUMS-0.32.0.txt`；三文件 checksum 全一致；CI #41 gate/windows/macos success，Release #15 四 job success。
- README/AGENTS/CHANGELOG 0.32.0/248/285,997；STATE **1–27 行**；round-26/27 plan/test 齐；`git status` 干净；HEAD 领先 tag 仅 `docs/STATE`，`src` 0 改动。
- 无密钥/证书入库，release/dist/.tmp/host/bin 未入库。

## 判定

**PASS-WITH-UNVERIFIED**

- 门禁、session 15/15、annotation 8/8、host-annotation 6/6、DeepSeek 单测、发布资产/CI 全通过。
- 真实宿主重开权限、真实 DeepSeek、真模型提示词质量仍 UNVERIFIED。
