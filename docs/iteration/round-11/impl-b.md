# 第 11 轮 · 实施报告 B（builder2）

执行人：builder2。T2（alias + CSS 双资产 + woff2 插件 + 首屏测量）→ T3（条件发版 0.24.0 + ADR-0012）。未重打安装包、未 commit。

---

## T2 构建与首屏测量 —— 完成

### 文件

- `vite.config.ts`：`resolve.alias = [{ find: /^katex$/, replacement: path.resolve('src/lib/katexLazy.ts') }]`（数组 + 正则，只认裸说明符）；其它配置未动，`chunkSizeWarningLimit` 保持 1200。
- `scripts/vite-woff2-only.mjs`：遍历全部 CSS 资产，允许 1–2 个；只对**含 `@font-face`** 的那个做收窄，其余原样；找不到/多个含 face 的资产会 throw。
- `scripts/measure-first-screen.mjs`（新）：解析 `index.html` 的 `script[src]`、`link[rel=stylesheet]`、`modulepreload`、`preload as=script|style`；逐 URL 打印 raw 与 gzip level 9，合计并打印省下的字节与百分比；**预算按 gzip**（`--max 285000` 超线 exit 1）；首屏含 `katex`/lazy chunk 也 exit 1。

### 构建与实测

```text
npx vite build --outDir .tmp/build-b   -> exit 0
CSS 资产 2 个：index-D-NrJbEJ.css 30,510 B（0 个 @font-face）
              katexLoader-lxMheimU.css 26,627 B（1 个 @font-face）
woff2 15 个；KaTeX chunk：katexLoader-CNO5m-uY.js 258.78 kB / gzip 77.66 kB
```

```text
   882627   276401  /assets/index-C7xutjkT.js
    30510     6396  /assets/index-D-NrJbEJ.css
total raw=913137 gzip=282797 files=2 max=285000
gzip 省下 630340 B（69.0%）
PASS
```

- 首屏 gzip **282,797 B ≤ 285,000**，集合只有 index 的 JS 与 CSS，**无 katex/lazy chunk**。
- 与阶段 B 记录的 **281,471 B** 相差 **+1,326 B**（构建内容不同）；与「两文件拼接后整体 gzip」282,763 相差 34 B，验收用逐文件求和。
- 265 KiB（271,360）**不可达**：差 11,437 B；全量 stub 上限 279,087 B。

---

## T3 条件发版 0.24.0 —— 完成（门禁通过，已升版）

- `package.json` → **0.24.0**（`package-lock` 由根代理同步）。
- `docs/CHANGELOG.md`：`## 0.24.0 — 2026-11-16`（首屏 364,960 → 282,797 B、−22.5%；265 KiB/271,360 未达成、差 11,437；CSS/字体按需；非阻塞预取与失败态；displayMode 推断；导出兜底；测试 16/205；安装包 `[TBD]`、预算 ≤815,000）。
- `README.md`：体积段改「364,960 → 282,797 B（−22.5%），KaTeX 独立 chunk gzip 约 77 KB 按需加载，安装包预计 ≤815,000」；「为什么不拆 KaTeX」段落改写为惰性方案与 265 KiB 不可达、指向 ADR-0012；依赖行改「JS/CSS 与字体都按需加载」。
- `AGENTS.md §6`：0.24.0、功能加「KaTeX 惰性加载（首屏 gzip 282,797 B）」、未验加真实 WebView2 冷启动、离线 chunk 失败、CLI 下 `npm test` 看不到 alias、`katexLazy.test.ts` 未挂入。
- `docs/adr/0012-katex-lazy-loading.md`（新）：背景、决定（数组正则 alias、深路径 loader、CSS 随动态 chunk、注册表/订阅、非阻塞预取、displayMode 推断）、实测表（含 281,471 与 282,797 的口径说明）、被否决方案、Kill criteria 与结果、下一轮第二杠杆、UNVERIFIED。

### 门禁

```text
node scripts/measure-first-screen.mjs .tmp/build-b --max 285000   -> PASS, exit 0
npm test                                                          -> 16 文件 205 条，exit 0
node -e version                                                   -> 0.24.0
Select-String CHANGELOG '## 0.24.0 — 2026-11-16'                  -> 1
ADR-0012 含 281,471 / 271,360 / 不可达 / Kill                      -> 全中
README/CHANGELOG 无「已达标」「≤265 KiB」                            -> 0
```

---

## 遗留

1. **安装包字节与 SHA256**：根代理重打后回填 CHANGELOG 的 `[TBD]`；预算 ≤815,000（当前 0.23.0 是 810,456），硬线 850,000 不动。
2. `package-lock.json` 仍 0.23.0，等根代理同步。
3. 265 KiB 目标未达成：下一轮把 `@tiptap/extension-mathematics` 移出首屏注册链（ADR-0012「下一轮第二杠杆」）。
4. 未验：真实 WebView2 冷启动、离线时 KaTeX chunk 失败与重试、CLI 下 `npm test` 看不到 alias、`katexLazy.test.ts` 尚未挂入 `npm test`。

---

## 收尾（0.24.0 最终产物）

- dist **1,413,711 B**；setup **811,616 B**（SHA256 `2BDD6E331F4DD181BA5867092A39C1DCD1BE39CF573A10AF49770959F55124E5`）；便携 zip **891,456 B**（SHA256 `F9AA010495B3EEFF6FB875BF1451DCAC1020A101E819BECE9422FD923DEE83A5`）。
- ADR-0004 载荷 **2,434,163 B**（1,020,452 + 1,413,711），`webview2-data` 19,553,253 B；README/CHANGELOG/ADR-0004/0008/0009/0010/0011/0012 已统一。
- 首屏数字不变：JS 882,627 B（gzip 276,401）+ CSS 30,510 B（gzip 6,396）= **282,797 B**（≤285,000）。
- 负向断言：`1,408,866 / 889,108 / 810,456 / 4208F677 / 11E37B5E / 2,429,318` **0 命中**；`[TBD]` **0**。
- `packaging/verify-installer.ps1` **PASS**（3 项 HKCU/快捷方式 UNVERIFIED）；`package-lock` 已是 0.24.0。