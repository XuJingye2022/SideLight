# 贡献指南

Sidelight 是面向中文写作者的桌面 Markdown 编辑器。改动前先读 [AGENTS.md](AGENTS.md)、[README.md](README.md) 与相关的 [docs/adr/](docs/adr/)。

## 环境

- Node 24（见 `.nvmrc`）。Windows 11 是首发平台。
- `npm ci` 安装依赖。

## 门禁

提交前跑这些命令。全部通过才算完成。

```bash
npx tsc --noEmit   # 类型检查
npm test           # 单元测试
npm run roundtrip  # 只在改动编辑器或 Markdown 序列化时跑，会重写 docs/roundtrip-report.md
```

`npm run build` 由维护者在收尾时串行跑一次。实施期间不要跑它。它会清空 `dist/`，与并行工作的产物互相覆盖。需要产物时用 `npx vite build --outDir .tmp/build`。

测试数量以 `npm test` 的实际输出为准。不要在文档里写死数字。

界面变化要截图。图放到 `shots/` 下，并在报告里引用路径。

## 提交

格式：`round-NN: <一句话>`。例：`round-01: 修货币写法被吞成公式`。

一个提交只做一件事。不要混入格式化改动。

## 依赖

不新增运行时依赖，除非省下的代码比依赖大。加一个依赖时，在同一个提交里写两处：

1. `README.md` 的「依赖与体积」段记一行理由。
2. 提交信息里说明为什么现有代码不够。

## 术语与决策

- 领域词写在 [GLOSSARY.md](GLOSSARY.md)。术语变了当场改，不要攒。
- 架构决策写在 `docs/adr/`，一决策一文件，编号递增。
- 产品硬约束见 [AGENTS.md](AGENTS.md) 第 4 节。违反其中任意一条的改动会被拒绝。

## 许可证

提交即表示同意以 [MIT License](LICENSE) 授权你的贡献。
