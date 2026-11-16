# 第 22 轮验收（侦察轮）

## 判定

RECON（无产品改动，无发布）。

## 证据

- 六份报告：`findings-fix.md`、`findings-markdown.md`、`findings-data.md`、`findings-perf.md`、`findings-ux.md`、`findings-install.md`。
- 第 21 轮主干闭合：C1 脚注两次往返字节一致；D1 删除脏文件正文+草稿+批注可撤销。
- 新增/残留：D2 浏览器草稿不恢复、D3 `Ctrl+Alt+O` 绕过 5.5 MiB、M1 `\$` 形成坏公式、F2 窄窗批注抽屉不自动开、F4 Tab 吞字、I1 运行中覆盖安装留旧宿主、I4 macOS Finder 打不开、真实多段 1 MB 载入约 54 s。

## 范围

- 只写 `docs/iteration/round-22/`、`shots/round-22/`、`.tmp/r22-*`；`src/` 未改。
- 无密钥/证书；无发布。
