# 第 23 轮验收（数据与 Markdown 修复）

## 判定

PASS-WITH-UNVERIFIED（门禁与实现证据；未做独立全量验收，最终由第 25 轮累积验收覆盖）。

## 结果

- 首屏 285,471 B ≤ 286,000（数据安全例外）。
- `npm test` 16 文件 234 条；roundtrip source 7/7。
- 草稿：文件夹文档从 `.sidelight/drafts` 恢复；三条写路统一 256 KiB 门。
- 打开文件：`File.size` 先行检查，超 5.5 MiB 返回 `tooLarge`。
- 删除：trash 原始字节 + SHA + `.current.md`；缓存复制校验；撤销搬回。
- 公式 `\$`、脚注 4 空格续行、CRLF 尾部空行矩阵已修。
- 发布 0.31.0：Windows 820,225 / 904,156 B，macOS 891,885 B。

## UNVERIFIED

- 宿主/本地草稿合并单弹窗、状态栏来源、BOM 逐字节断言、data-safety 脚本需 dev。
- 真实宿主、IME、macOS、网络盘未验。

## 范围

- 无密钥；release/dist/.tmp/host/bin 未入库。
