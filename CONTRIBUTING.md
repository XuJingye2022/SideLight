# 参与贡献

谢谢愿意花时间。先读这一篇，再动手。

## 0. 先读

1. [README](README.md)：能做什么、不能做什么、命令。
2. [AGENTS.md](AGENTS.md)：仓库纪律、门禁、目录约定。
3. [docs/adr/](docs/adr/)：已定的技术决策（0001–0015）。
4. [GLOSSARY.md](GLOSSARY.md)：正文、批注、大纲等领域词。

## 1. 项目一句话

Sidelight 是面向中文写作者的桌面 Markdown 编辑器：左边写作，右边按需让 AI 补光。前端是 React 19 + Vite 8 + Tiptap，桌面宿主有两套：Windows 的 C# WebView2（`host/`）与 macOS 的 Swift/AppKit/WKWebView（`host-mac/`）。

## 2. 环境

- Node 24（见 `.nvmrc`），npm 11。
- Windows 11（或 10 22H2+）：需要 WebView2 运行时；**不需要管理员权限，也不需要 Visual Studio / MSVC**。
- macOS 13+（Apple Silicon 或 Intel）：需要 Xcode Command Line Tools（`xcode-select --install`）。
- 无需全局安装任何构建工具。

## 3. 10 分钟上手

```bash
git clone https://github.com/XuJingye2022/SideLight.git
cd SideLight
npm ci
npm run dev        # http://localhost:5173
npm test           # 16 个测试文件、205 条断言
```

注意：dev server 只监听 `localhost:5173`，用 `127.0.0.1:5173` 连不上是正常现象。

## 4. 目录地图

| 路径 | 内容 |
| :--- | :--- |
| `src/` | React 前端：编辑器、页边批注、大纲、设置、导出 |
| `src/lib/` | 纯逻辑：上下文、批注、大纲、字数、frontmatter、脚注、缓存、搜索、错误文案 |
| `host/` | Windows C# WebView2 宿主（`Program.cs`、`build.ps1`、探针） |
| `host-mac/` | macOS Swift 宿主（`Sources/SidelightMac/`、`build.sh`、`sign.sh`、`verify.sh`） |
| `packaging/` | NSIS 安装器、便携包、安装验收脚本 |
| `scripts/` | 截图、验收、缺陷探测、往返测量、首屏测量 |
| `fixtures/markdown/` | 7 个真实 Markdown 样本 |
| `docs/` | ADR、CHANGELOG、每轮留档、质量报告 |
| `release/` | 产物目录，不进版本控制 |

## 5. 门禁（分两档）

外部 PR 至少跑这三条，并在 PR 里贴输出：

```bash
npx tsc --noEmit
npm test
npm run build
```

只在改动编辑器内核或 Markdown 序列化时，再加跑：

```bash
npm run roundtrip
```

`npm run build` 会做类型检查 + 打包，正常贡献流程里可以跑（内部代理的纪律写在 [AGENTS.md](AGENTS.md)，不适用于外部贡献者）。

## 6. 测试

- 测试与实现同目录（`src/lib/*.test.ts`），用 `node:test`。
- **新增测试文件要手动加进 `package.json` 的 `test` 脚本链**，否则不会被跑到。
- 现在 16 个文件、205 条；数字以 `npm test` 输出为准。
- 改保存、缓存、导出、最近记录时，优先补能证明「字节不变/不静默改写」的用例。

## 7. 代码风格

仓库没有 linter/formatter，按现有代码写：

- 2 空格缩进；单引号；行尾不加分号。
- TypeScript `strict`；不新增 `any`（确实需要时写 `unknown` 再收窄）。
- 只改与本次 PR 相关的行，不顺手重排全文件。
- 注释写「为什么」，不写「是什么」。

## 8. 提交

- 外部贡献者：`type(scope): summary`，例如 `fix(host): 保存时保留 CRLF`。
- 内部按轮次：`round-NN: 一句话`。
- 一个提交只做一件事；不把格式化与功能混在一起。

## 9. PR 检查单

- [ ] 关联 Issue（或在描述里写清动机）。
- [ ] `npx tsc --noEmit`、`npm test`、`npm run build` 通过。
- [ ] 改序列化/编辑器时跑过 `npm run roundtrip`。
- [ ] 改界面附截图（见下）。
- [ ] 没有新增运行时依赖；若有，说明省下了什么。
- [ ] 没有提交 `dist/`、`release/`、`.tmp/`、`.sidelight/`、证书或 `.env`。

截图（界面变化时）：

```bash
npm run dev
node scripts/shot.mjs --out shots/round-NN/x.png
```

## 10. ADR

- 一个决策一个文件，编号递增，放 `docs/adr/`。
- 新 ADR 从 [ADR-0015](docs/adr/0015-macos-universal-and-signing.md) 的格式抄：背景、决定、否决方案、未验、状态。
- 推翻旧决策时，改旧 ADR 的状态并链到新 ADR，不删历史。

## 11. 发布

- 推 `v*` tag 自动构建并发布；手动在 Actions 里跑 `Release`，填 `tag`，勾 `publish` 才发布。
- 发布资产：Windows 安装包、Windows 便携 zip、macOS Universal zip，外加 `SHA256SUMS-<版本>.txt`。
- `install-verify` 只手动触发（会写 HKCU 与开始菜单）。

## 12. 许可证与贡献授权

提交即表示同意以仓库的 [LICENSE](LICENSE)（MIT）授权你的贡献。不要在 PR 里附带与项目无关的第三方代码。
