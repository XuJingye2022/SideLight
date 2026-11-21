# 迭代简报（BRIEF）

> 每个代理先读这份（≤2 KB）。细节读 `AGENTS.md` 第 4/8 节与相关 ADR；不要整篇读 AGENTS/README/STATE。

## 当前
- 状态：**进行中**。第 144 轮（v4，首轮 144、6 个代理、1 轮 2 条、回滚 0 条）：B-271 取消首屏体积硬线（`--max` / `--real-max` 默认 null，只记录字节、CI 不因体积红）；B-272 只读工作区改成安静「只读」徽标 + 新建/命名/另存为闭环（新建不先失败、标题可改并保存到新名）。P0/P1 为 0；`BACKLOG.md` 只剩 P2：B-273（外部删除/改名后 `Ctrl+S` 与「只能另存为」提示不一致，`open`）、B-267 / B-268 与 `deferred`。
- 版本：0.32.1（未发版）；HEAD `6f1a57a`（第 144 轮）
- 测试：73 文件 1013 条；体积第 144 轮实测 门 gzip **318,723 B** + 常驻 **4,487 B** = 真实首载 **323,210 B**——**只记录、不阻塞**（`--max`/`--real-max` 默认 null）；差距 42 有 / 3 缺。
- 端口：9222–9226（本批无监听）；真机走 ego CDP 57270。

## Top 5 优先
1. **体积只记录、不阻塞**（第 144 轮按用户 2026-11-21「取消首屏硬线，不要为体积砍体验」取消）：`npm run verify` 照旧报门 / 常驻 / 真实首载与 `headroom=none`，但不再判失败、CI 不因体积红；不要为省几 KB 砍体验。安装包硬线 50,000,000 B（内部 45,000,000 B）不动。设计语言 §5 仍要求新增常驻控件时同时删一个或进菜单 / 键位（体验阈值，不是体积门）。
2. 剩余 P2 见 `BACKLOG.md`：B-273（外部删除/改名 + 刷新后 `Ctrl+S` 仍静默建文件，与「保存只能另存为」提示不一致）、B-267（对比行只有鼠标路径）、B-268（栏宽 / 折叠态不落盘）、`deferred` 的 B-135 与 B-201–B-207。
3. 发版前跑 `npm run verify`、`npm test`、`packaging/verify-installer.ps1`。
4. 真 WebView2/macOS 宿主、真实中文 IME、真实 FSA、真实 Low IL 桌面双击、连续拖拽与 `pageZoom≠100%`、`F8` 是否被宿主吞掉未验。
5. v4 流程与度量在 STATE/METRICS。

## 环境
- dev `http://localhost:5175`（不另起/重启；5173 禁用）；CDP 9222–9226 + `node .tmp/reset.mjs <端口>`；截图 `node scripts/shot.mjs ...`；门禁 `npm run verify`、`npm test`（改编辑器/序列化加 `roundtrip`）。

## 红线（10 条）
1. Tiptap 内核不换
2. AI 不直接写正文；只采纳落正文
3. 意见用页边批注
4. 只做自带密钥
5. 缓存只写 `.sidelight/`
6. 新运行时依赖需产品负责人批准，README 记理由与体积
7. 安装包硬线 50 MB（内部 45 MB）；首屏体积**只记录、不阻塞**（第 144 轮取消首屏硬线，`--max` 显式才判）
8. 不 push、不建 Release、不改 `release/`
9. 版本 0.32.1，CHANGELOG 写 `## Unreleased`
10. 稳定性 > 核心功能 > 体积优化 > 节省 Token > 速度

## 链接
`AGENTS.md`、`README.md`、`docs/iteration/STATE.md`、`docs/iteration/BACKLOG.md`、`GLOSSARY.md`、`docs/typora-gap.md`、`docs/adr/`
