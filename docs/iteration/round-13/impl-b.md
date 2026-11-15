# 第 13 轮 · 实施报告 B（builder2）

状态：**已定稿并升 0.26.0**。A 组 T1 22/22、T2 43/43、P1 大纲 aria-current PASS；`.tmp/build-b` 首屏 **284,973 gzip**（≤285,000，余 27 B）PASS。

## 已完成（不依赖构建）

- `docs/adr/0014-file-rename.md`（新）：同目录、只接受 `.md`/`.markdown`、目标存在拒绝（二次探测只收窄 TOCTOU）、`move()` 唯一路径无 copy 回退、大小写两段式失败保留临时名、缓存写新成功才删旧、最近记录不迁移（旧条目 `FILE_GONE`）、目录不做、否决方案与 UNVERIFIED。
- `docs/adr/0013-file-tree-operations.md`：「不做重命名」句改成指向 ADR-0014（移动/复制仍不做）。
- `README.md`：安装包内部预算 815,000 → **820,000 B**（硬线 850,000 不动）；能做什么加 rename（标 `[待体积门]`）与「改名后 `Ctrl+S` 写新路径」「旧最近记录会失效」「缓存写新成功才删旧」；ADR 索引 `0001–0014`，补 ADR-0014 决策行。
- `AGENTS.md §6`：rename 条目标 `[待体积门]`，未验加真人右键重命名、大小写两段式临时名、网络盘/OneDrive 改名。
- `docs/CHANGELOG.md`：`## 0.26.0 — 2026-11-16` 候选段，首行 `[待体积门]`，含 rename 语义、缓存迁移、最近记录失效、预算调整；未写已发布。

## 等 A 后的流程

```powershell
npx vite build --outDir .tmp/build-b
node scripts/measure-first-screen.mjs .tmp/build-b --max 285000
# exit 0 才升 0.26.0、去掉 [待体积门]、填测试数与体积；否则保持 0.25.0 并报告数字
```

## 遗留

1. 等 A 组完成 rename 后 build + measure；`package.json` 仍是 0.25.0。
2. 安装包字节/SHA 与 README/AGENTS 的 `[待体积门]` 待定稿后清除。
3. rename 的自动验证（目标存在、大小写两段式、缓存迁移、最近记录失效、改名后保存写新路径）依赖 A 组实现后的探针。
---

## 定稿（build + measure 通过后）

- `npx vite build --outDir .tmp/build-b` → exit 0；`measure .tmp/build-b --max 285000` → JS 889,233 B（gzip 278,339）+ CSS 31,526 B（gzip 6,634）= **284,973 B**，PASS，余 27 B。
- `package.json` → **0.26.0**；CHANGELOG 去掉 `[待体积门]`，写首屏 284,973、测试 16/205、rename/树细节、aria-current 已修、P3 tablist 与 P4 展开态/空文件夹延后。
- README/AGENTS 定稿：0.26.0、ADR 0013/0014、预算 820,000（硬线 850,000）、旧最近记录失效、首屏 284,973。
- ADR-0013 更新延后项（aria-current 已完成；tablist 与树展开态/空文件夹延后）；ADR-0014 标「接受（0.26.0）」。
- `npm test` 16 文件 **205 条** exit 0。

## 剩余

1. 构建产物、安装包、便携 zip 的字节与 SHA256 留 `[TBD]`，等根代理出 0.26.0 包后回填 CHANGELOG/README/ADR。
2. `package-lock` 仍 0.25.0，等根代理同步。
3. 未验：真人右键重命名与确认框、大小写两段式失败后的临时名、网络盘/OneDrive 下的改名、trash 恢复、tablist/树展开态延后项。
---

## 收尾（0.26.0 最终产物）

- dist **1,434,502 B**；setup **817,347 B**（SHA256 `FE2EF144D06AAA4F9667ADB1934929082C77D78FE2A1BD690BD6B16F3F08A268`）；便携 zip **899,829 B**（SHA256 `9C18FC9CA29F7311010E3D2570F2C6AE6C6A8358EDD0C6951D24FAD232CB98BC`）。
- ADR-0004 载荷 **2,454,954 B**（1,020,452 + 1,434,502），`webview2-data` 19,576,985 B；README/CHANGELOG/ADR-0004/0008/0009/0010/0011/0012/0013/0014 已统一。
- 首屏 284,973 B（≤285,000，余 27 B）不变；安装包 817,347 B 在内部预算 820,000 内（硬线 850,000 不动）。
- 断言：旧数 `1,427,617 / 897,251 / 815,683 / BEAADB7A / 9DBC71B0 / 2,448,069` **0 命中**；`[TBD]` **0**。
- `verify-installer` **PASS**（3 项 HKCU/快捷方式 UNVERIFIED）；`package-lock` 已是 0.26.0。