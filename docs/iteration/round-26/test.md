# 第 26 轮 · 验收（tester，v0.32.0）

日期：2026-11-16。v0.32.0，HEAD/tag `64710ad`。本机 Windows；未改产品代码、未 commit。

## 门禁

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| build | PASS，130 modules，0 warning | `.tmp/r26-build.log` |
| `npm test` | 17 文件、**248 条**、0 失败 | `.tmp/r26-test.log` |
| measure | PASS，**285,997 B ≤286,000** | `.tmp/r26-measure.log` |
| roundtrip | source **7/7**（rich 5/7） | `.tmp/r26-roundtrip.log` |

## #1 重开：PASS-WITH-UNVERIFIED

- `session-acceptance` **15/15**：OPFS 重载树/文档/批注、Ctrl+S 0 picker；单文件写回；宿主文档重开恢复树/批注/host save。
- 真实宿主关掉重开同一文件的权限与批注恢复未单独跑，**UNVERIFIED**；旧会话已丢弃批注不可恢复，按事实记录。

## #2/#3 批注 v2：FAIL（host-annotation 5/6）

- `annotation-flow` **8/8 PASS**：两次重跑不翻倍、窗口外不误删/id 复用、overall 进 DocNote、unresolved 保留 quote、旧数组兼容 v2；`shots/round-26/annotation-overall.png` 存在（`.rail-overall`）。
- `npm test` 内提示词 ≤1500 字、overall/最多 1 revision/论证判断规则均过。
- **FAIL**：`host-annotation-acceptance` **5/6**；`GET /__annotations 200 且 text 与文件一致` 实测 `status=200 bytes=109` 但文本不匹配；其余 404/落盘/伪造 path/只读/512 KiB 五项过。真实宿主批注恢复的 GET 端点未过。

## #7 DeepSeek：PASS-WITH-UNVERIFIED

- `npm test` 搜索 12 条：DeepSeek 官方 Search 请求、summary/snippet、空结果、错误码、300 字截断全过。
- 真实 DeepSeek Key/接口 **UNVERIFIED**（无 Key）。

## 回归 / 发布 / 范围

- 0.32.0 首屏/测试已过；session 15、annotation-flow 8、keyboard 49 为新证据。
- Release v0.32.0 API **404**；本地 release 仍只有 0.31.1 setup；无四资产/checksum。
- STATE 只有到第 25 行；round-26 只有 plan，round-26 test 为本报告，round-27 不存在。
- `git status`：仅截图改动/本报告未跟踪；无密钥/证书。

## 判定

**FAIL**

- `host-annotation` 5/6（真实宿主 GET 文本不一致）；
- Release v0.32.0 尚不存在；
- STATE 26 行与 round-26/27 证据未补。
- 其余 session 15/15、annotation-flow 8/8、门禁 248/285,997 通过；真实宿主重开权限/DeepSeek 仍 UNVERIFIED。
