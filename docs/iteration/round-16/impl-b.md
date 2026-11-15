# 第 16 轮 · 实施报告 B（builder2）

执行人：builder2。T4：构建/首屏门 → 0.30.0 文档与版本。未 commit、未重打产物。

---

## 首屏门 —— PASS

```text
npx vite build --outDir .tmp/build-b   -> exit 0
   886298   277480  /assets/index-D5FFY4-c.js
    31543     6730  /assets/index-DlJVb4gA.css
total raw=917841 gzip=284210 files=2 max=285000   -> PASS（余 790 B）
```

- 0.29.0 基线 283,826 → **284,210**（+384 B，A 组估算 +250–400 B 内）。
- 首屏集合仍只有 index JS + CSS，无 `katex`/lazy chunk。

## 版本与文档 —— 完成

- `package.json` / `package-lock.json` → **0.30.0**（lock 三处齐全）。
- `docs/CHANGELOG.md` 加 `## 0.30.0 — 2026-11-16`：
  - 大纲页签：文件树真正隐藏（`display:none`、rect 高 0、节点仍在 DOM），切回恢复滚动（`tree-acceptance` **49/49**）。
  - 深色：token 化对比度，浅/深 × 8 组 × 3 状态 **48/48**（`theme-acceptance` **26/26**）。
  - 焦点环统一（含源码模式）；`prefers-reduced-motion` 不播动画。
  - 输入边界 3:1；正文 `aria-label="正文编辑器"`；保存失败 toast `role="alert"`，一次 notice 只更新一个 live region。
  - `keyboard-acceptance` **35/35**；`npm test` 16 文件 **205 条**。
  - **P2 延后**（不计达标）：骨架 `role="dialog"`/`aria-busy`、批注卡 `tabIndex`/Enter 跳句、正文开头 Tab 回环删除。
  - 首屏 283,826 → **284,210 B**（≤285,000，余 790）；体积与 SHA 见 Release `SHA256SUMS-0.30.0.txt`。
- README：安装包名 0.30.0；两处 checksum 指针改 `SHA256SUMS-0.30.0.txt`；首屏 284,210（−22.1%）；「现在不能做什么」加 P2 延后项。
- AGENTS §6：0.30.0、首屏 284,210 / 余 790、未验加 P2 延后项。

## 负向断言

```text
[TBD]（README/AGENTS/CHANGELOG）           = 0
Sidelight-0.29.0 / SHA256SUMS-0.29.0       = 0
CHANGELOG 0.30.0 关键词                     = 49/49、26/26、48/48、35/35、284,210、P2 延后、SHA256SUMS-0.30.0 全中
npm test                                   = 16 文件 205 条，exit 0
```

## 遗留

1. 安装包 / zip / macOS Universal 的字节与 SHA256：等 root 出 0.30.0 包后，把 CHANGELOG 的「见 Release」换成实际字节（SHA 仍引用 `SHA256SUMS-0.30.0.txt`）。
2. P2 延后项（骨架 role/aria-busy、批注卡 Enter 跳句、正文开头 Tab 回环）留待下一轮。
3. 本机不是 macOS：签名/公证、真实 Intel 等仍 UNVERIFIED。
