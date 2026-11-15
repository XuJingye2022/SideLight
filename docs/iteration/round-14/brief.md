# 第 14 轮简报

## 上轮结果

- v0.27.0 已发布：Windows 安装包/便携包 + macOS arm64 zip；仓库 https://github.com/XuJingye2022/SideLight
- CI 三组全绿：`gate` / `windows-host` / `macos-host`。
- 首屏 gzip 284,973 B（≤285,000，余 27 B）；测试 16 文件 205 条。

## 本轮目标

1. **首次使用**：第一屏是否给得出下一步；示例工作区与真实文件夹是否分得清；空状态/最近文件空态/新建文档是否顺手；没配 Key 时模拟批注是否说清楚。
2. **延后项收尾**：侧栏 `role=tablist`、文件树展开态跨「文件/大纲」页签保持、空文件夹提示。首屏预算只剩 27 B，做不下就按优先级记录延后，不许抬线。
3. **发布自动化**：推送 tag 时由 GitHub Actions 构建 Windows + macOS 并创建/更新 Release（不再手工上传）；README 的下载与版本说明；macOS Intel/Universal 的可行性（只研究，不承诺）。
4. 版本 0.28.0。

## 三个视角

- **缺陷**：首屏/示例/空文档/最近文件空态；P3/P4 的实际行为；桥接层与 macOS 改动是否影响 Windows；保存/草稿/错误路径回归。
- **体验**：不读 README 的 30 秒路径；示例与真实文件夹的区分；设置面板；菜单与空态；侧栏页签键盘；空文件夹；视觉一致性。
- **发布**：tag 触发的 release workflow（Windows + macOS 矩阵、产物命名、校验和、release notes）；版本 0.28.0；CI `macos-host` 与 `windows-host` 是否转必过；Intel/Universal 方案与签名/公证边界。

## 边界

- finder 只读，不改 `src/`、`host/`、`host-mac/`；报告写 `docs/iteration/round-14/findings-*.md`；截图 `shots/round-14/`。
- 不跑 `npm run build`，不装系统级依赖；不推 tag、不改 GitHub 设置。
- 端口：应用 `http://localhost:5173`；CDP 9222 / 9223 / 9224 各归一个 finder。

## 交付

三份发现，每条带编号、证据、影响、建议、难度；另附优化机会最多 3 条。
