# 第 11 轮 · 独立验收（tester）

日期：2026-11-16。基线 `4878030`，v0.24.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，123 modules，**0 warning**，215 ms | `.tmp/r11-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r11-test.log` |
| `npm run roundtrip` | exit 0；**rich 5/7、source 7/7、firstSaveBlocked 1/7** | `.tmp/r11-roundtrip.log` |

- `dist` **1,413,750 B**；首屏 JS `index-CAfvmVZ8.js` 882,666 B / gzip 276,413 B，CSS 30,510 B / gzip 6,396 B；KaTeX chunk gzip 77.66 kB、CSS 7.46 kB。

## T1 KaTeX 惰性：**PASS**

- `node scripts/math-ready-acceptance.mjs` → **11/11 PASS**：
  - 无公式文档首屏请求无 `katex*.js` / `katex*.css`；
  - 含公式文档出现排版态、占位清零、不闪裸 `$…$`；
  - 阻断 chunk 后出现 `math-fallback`，不是空白、原文可复制，点击可重试（2 次请求）；
  - 插入/预览/块级 display/导出 HTML 含 `<math` 均过。
- `node --experimental-strip-types src/lib/katexLazy.test.ts` → **7/7 PASS**；fake element 已能处理 `addEventListener` 能力判断，失败态契约通过。
- 块级公式 `display:block`、居中，不压字；截图 `shots/round-11/t1-block.png`。
- 打印路径：当前环境无打印机，**UNVERIFIED**。

## T2 构建：**PASS**

- `node scripts/measure-first-screen.mjs dist --max 285000` → **PASS**：首屏只有 `index-CAfvmVZ8.js` 276,413 gzip + `index-D-NrJbEJ.css` 6,396 gzip，合计 **282,809 B**；raw 913,176；省 630,367 B（69.0%）。
- `dist/assets`：**2 个 CSS**、**15 个 woff2**；首屏集合无 `katex`/lazy chunk。
- `vite.config.ts`：`alias: [{ find: /^katex$/, replacement: .../katexLazy.ts }]`，数组 + 正则；`chunkSizeWarningLimit` 保持 1200。
- `vite-woff2-only` 在 2 个 CSS 资产下不抛，16 face / 15 woff2 保持。

## T3 文档 / 产物：**PASS**

- 版本/lock **0.24.0**；release 只有 0.24.0：zip **891,471 B / `E06F2E2E…`**、setup **811,756 B / `4F06530B…`**（≤815,000）。
- README/AGENTS/CHANGELOG 写 0.24.0、205、282,809、1,413,750、两个 SHA；旧数 1,413,711 / 891,456 / 811,616 / F9AA0104 / 2BDD6E33 0 命中；`[TBD]` 0。
- ADR-0012 存在，含 281,471 / 271,360「不可达」/ Kill 结果；ADR-0004 载荷 **2,434,202 B**（1,020,452 + 1,413,750）。
- **非阻断文案**：ADR-0012 第 21 行的括号仍写 `index JS 276,401 + CSS 6,396`，而当前实测 JS gzip 是 **276,413**；总量 282,809 与其余文档正确，建议只改这一处子值。
- 安装包 **811,756 B ≤ 815,000**，硬线 850,000 未动；`verify-installer` PASS。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| acceptance dev 5173 | **11/11 PASS** | `.tmp/r11-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp/r11-acceptance-prod.log` |
| fidelity-acceptance | **19/19 PASS** | `.tmp/r11-fidelity.log` |
| keyboard-acceptance | **28/28 PASS** | `.tmp/r11-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r11-theme.log` |
| draft-acceptance | **58/58 PASS** | `.tmp/r11-draft.log` |
| recent-acceptance | **57/57 PASS** | `.tmp/r11-recent.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp/r11-host-save.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp/r11-host-smoke.log` |
| fcp-probe | **6/6 PASS** | `.tmp/r11-fcp.log` |
| verify-installer 0.24.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r11-verify-installer.log` |
| verify-portable | **6/6 PASS**、28 条目 | `.tmp/r11-verify-portable.log` |

## 范围与卫生

- `git status`：30 个已跟踪文件改动、0 删除、16 项未跟踪（`docs/adr/0012`、`docs/iteration/round-11/**`、两个新验收脚本、`katexLazy*`/`katexLoader*`、`scripts/measure-first-screen.mjs`、`shots/round-11/**`、本报告）；`git diff --stat` 30 文件，181 insertions / 52 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`__slMarkdown` 0 命中；`katexLazy.test.ts` 未挂入 `npm test`（16 文件 205 条，已知决定）。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-{window,fsa}.png`、`shots/round-02/t4-portable.png`、`shots/round-06/t1-host-error.png` 被回归脚本重写（既有行为）。

## 与实施报告对照

- `impl-a.md` 的 T1 功能结论与 `math-ready` 11/11 一致；`katexLazy.test.ts` 已修到 7/7。
- `impl-b.md` 的 T2/T3 数字与实测一致；282,809、1,413,750、两个 SHA、811,756 均符。
- 未发现验收项造假；T1–T3 与全部回归通过，ADR-0012 子值 12 B 文案待顺手修。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1 7/7 + math-ready 11/11；T2 首屏 **282,809 B ≤285,000**；T3 0.24.0/205、release/SHA、旧数 0、TBD 0、setup 811,756 ≤815,000。
- 回归全部通过：acceptance dev/prod 11/11、fidelity 19/19、keyboard 28/28、theme 16/16、draft 58/58、recent 57/57、host-save 64/64、host-smoke 7/7、fcp 6/6、installer/portable PASS。
- 非阻断：ADR-0012 第 21 行括号仍写 JS gzip 276,401，实际 276,413；总量 282,809 正确，建议只改这一处。
- **UNVERIFIED**：真实宿主冷启动、离线时 KaTeX chunk 失败、打印路径、真实 IME、HKCU/双击。
