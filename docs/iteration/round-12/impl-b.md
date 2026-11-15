# 第 12 轮 · 实施报告 B（builder2）

状态：**已走发布分支**。A 组首屏 284,134 gzip（root 的 dist 实测同值 PASS，余 866 B）；`package.json` 0.25.0；文档定稿，仅体积/SHA 留 `[TBD]`。

## 已完成（不依赖构建）

- `docs/adr/0013-file-tree-operations.md`（新）：只删文件、trash 语义（`<工作区>/.sidelight/trash/<时间戳>-<原名>`、重名随机后缀、跨盘回退「复制 + SHA-256 校验 + 删源」）、无应用内恢复、不自动清理、卸载不删、无目录 move/copy、刷新重绑、不监听目录、否决方案与 UNVERIFIED。
- `README.md`：能做什么加「文件树操作：右键删除 → trash」；不能做什么加「只能删文件（不能移动/复制/重命名/删目录），无应用内恢复，trash 不自动清理、卸载不删」；隐私节加「trash 只在本机」；ADR 索引 `0001–0013`，补 ADR-0012/0013 两条决策；包名改 `Sidelight-0.25.0-win-x64-setup.exe`。
- `AGENTS.md §6`：功能加「文件树右键可删除（移到工作区 `.sidelight/trash/`）」；未验加真人右键与确认框、从 trash 恢复、网络盘/OneDrive 占位文件、超长路径与中文文件名、并发删除。
- `docs/CHANGELOG.md`：加 `## 0.25.0 — 2026-11-16` **候选段**，首行标 `[待体积门：A 组 T1–T3 完成并过 measure --max 285000 后才定稿；未发布]`；测试与体积/安装包均标 `[待…]`，未写已发布。

## 等待 build 后的流程（A 组完成 T1–T3 后执行）

```powershell
# 1) 只有 A 组说可以 build 时才跑；不要提前 build
npx vite build --outDir .tmp/build-b

# 2) 首屏体积门（脚本口径，预算按 gzip）
node scripts/measure-first-screen.mjs .tmp/build-b --max 285000

# 3) 若 exit 0 且集合无 katex/lazy chunk：升 package.json 0.25.0，填 CHANGELOG 的测试数/体积，
#    把候选段改成正式条目；否则保持 0.24.0，只写「尝试与回退」并报告数字。
```

- 体积门通过前：不改 `package.json`、不把 `[待体积门]` 改成已发布、不写安装包字节与 SHA。
- 体积门通过后：`node -e "console.log(require('./package.json').version)"` 必须为 0.25.0；CHANGELOG 去掉 `[待体积门]`；README 体积段与 CHANGELOG 数字一致。
- 安装包预算沿用 ≤815,000（硬线 850,000 不动），最终字节与 SHA 由根代理出包回填。

## 遗留

1. 等 A 组 T1–T3 完成后 build + measure；当前未验证首屏是否仍 ≤285,000。
2. `package.json` 仍是 0.24.0（未升 0.25.0）。
3. 文件树删除的自动验证（trash 落点、重名后缀、跨盘回退、只读/占用失败）依赖 A 组实现后的探针，本轮未跑。
---

## 发布分支（A 组首屏 284,134 通过后）

- `node scripts/measure-first-screen.mjs dist --max 285000` → JS 886,956 B（gzip 277,570）+ CSS 31,100 B（gzip 6,564）= **284,134 B**，PASS，余 866 B。
- `package.json` → **0.25.0**；CHANGELOG 去掉 `[待体积门]`，写首屏 284,134（−22.2%）、文件树删除 trash 语义、可访问性条目、测试 16/205，体积 `[TBD]`。
- README：体积段与 KaTeX 段改 284,134（−22.2%），包名 0.25.0，ADR 索引 0001–0013，trash 语义与「只能删文件」边界，隐私节加 trash。
- AGENTS §6：0.25.0、首屏 284,134、文件树删除、未验项。
- **因首屏预算延后（不算达标）**：侧栏 `tablist` 与大纲 `aria-current`，已写进 ADR-0013 与 CHANGELOG；下一轮单独做。

### 最终产物（已回填，无 TBD）

- dist **1,427,617 B**；setup **815,683 B**（SHA256 `BEAADB7AF71BDAB8E6980ED39DC52B5450B17C578C6E67774E21825DBD75696F`）；便携 zip **897,251 B**（SHA256 `9DBC71B0E658C7178F039859E4278C06CFBB26ECB441B8F9887103F094A88248`）；首屏 **284,134 B gzip** PASS。
- 安装包较内部预算 815,000 B 高 **683 B**（树操作 + 可访问性代码），硬线 850,000 B 未破；**不调预算数字**，已写进 README/CHANGELOG/ADR-0013。
- `package-lock.json` 已是 0.25.0；`verify-installer` PASS（3 项 HKCU/快捷方式 UNVERIFIED）。