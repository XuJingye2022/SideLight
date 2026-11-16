# 第 18 轮简报

## 上轮结果

- v0.30.0 已发布；Universal macOS、自动 release workflow、签名/公证可选分支已就绪。
- 首屏 284,210 B；测试 16 文件 205 条；tree 49/49、theme 27/27（43/48 适用）、keyboard 35/35。
- 第 17 轮正在修保存竞态、大文件上限与性能。

## 本轮目标

1. **开源文档**：`CONTRIBUTING.md`（构建/测试/发布/PR/提交信息）、`SECURITY.md`（漏洞报告、密钥与隐私边界）、`PRIVACY.md`（本地优先、BYO Key、写哪些文件）；隐私声明必须标「待产品负责人确认」，不得擅自对外承诺。
2. **仓库治理**：Issue/PR 模板、GitHub 描述与 topics、Release 说明模板、CI `install-verify` 手动说明、分支保护建议（只给建议，不改设置）。
3. **一致性**：README/AGENTS/CHANGELOG/STATE 的版本、体积、测试数、平台说明对齐；无 0.29/0.30 旧包名残留。
4. 不新增运行时依赖；不改产品行为；首屏不变。

## 三个视角

- **文档**：第一次贡献者能否在 10 分钟内 build + test；SECURITY/PRIVACY 是否说清「数据只在本机、Key 只存本地、不代管请求」；隐私声明是否需要产品负责人确认。
- **仓库**：Issue/PR 模板、Release 模板、topics、License、CI badge、Go/No-go 清单；有没有把 `.tmp`/`release`/证书误提交的风险。
- **读者**：普通用户从 README 能否完成「下载→打开→写→保存→找数据」；贡献者能否找到 ADR/测试/发布流程。

## 边界

- finder 只读，不改 `src/`；报告写 `docs/iteration/round-18/findings-*.md`；截图 `shots/round-18/`。
- 不推 tag、不改 GitHub 设置、不写隐私承诺的最终措辞（只给草案，标「待确认」）。
- 端口：应用 `http://localhost:5173`；CDP 9222/9223/9224。

## 交付

三份发现，每条带编号、证据、影响、建议、难度；另附优化机会最多 3 条。
