# 第 13 轮 · 独立验收（tester）

日期：2026-11-16。基线 `0842c3b`（产品代码 `971e1ca`），v0.26.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4/T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，126 modules，**0 warning**，254 ms | `.tmp/r13-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r13-test.log` |
| `npm run roundtrip` | exit 0；**rich 5/7、source 7/7、firstSaveBlocked 1/7** | `.tmp/r13-roundtrip.log` |

- `dist` **1,434,502 B**；首屏 `index-DILcd-eH.js` 889,233 raw / gzip 278,339 B，CSS 31,526 / 6,634 B；首屏合计 **284,973 B**（`.tmp/r13-measure.log` PASS）。

## T1 重命名：**PASS**

`node scripts/rename-acceptance.mjs` → **22/22 PASS**：

- `a.md`→`b.md`：旧路径消失、新路径内容不变、move 1 次、树选中 b.md；`document.title`/顶栏/`__slState`/active 全为新名；Ctrl+S 写新路径、picker 0 次。
- 重名拒绝：目标 `b.md` 内容仍 `keep`、`a.md` 仍在且就地报错；探测后插入 `b.md` 的二次探测也拒绝，不覆盖。
- 非法名逐条拒绝：`a<b.md`、`con.md`、`a.md.`、`.hidden.md`、`a.txt`、`a\b.md`（反斜杠文案单独）；大小写 `a.md`→`A.md` 成功。
- 第二段失败保留临时名并如实提示「已改为临时名…第二段改名失败…」；move TypeError 保留原名、无新文件、无删除。
- Esc/失焦不提交；IME Enter 不提交；目录行右键无重命名入口。
- 缓存迁移：新键有内容、旧键已删（`{"next":"旧草稿内容","old":false}`）。

## T2 文件树细节：**PASS-WITH-UNVERIFIED**

`node scripts/tree-acceptance.mjs` → **43/43 PASS**：

- 深文件 `aria-level=3`、`paddingLeft=34px`（`6+(level-1)*14`）、`aria-selected=true`、树内 1 个 tab 站；折叠祖先后仍有 1 个 tab 站。
- P4「展开态跨页签 / 空文件夹提示」已记录延后（ADR-0013/CHANGELOG）；不计本轮达标。
- **UNVERIFIED**：长名 `scrollWidth <= clientWidth` 与 `title=node.name` 未在 43 项中单独断言；代码有 `nowrap/ellipsis/title`，但未跑该运行时检查。

## T3 大纲与侧栏：**PASS**

- 大纲活动项 `aria-current="location"`（tree 43/43 实测）；`Outline` 仍在懒加载 chunk：build 输出 `Outline-BODvLGYP.js`，首屏测量集合只有 index JS/CSS，不含 Outline。
- 侧栏 `tablist` 与文件树展开态/空文件夹一并**延后并已记录**（ADR-0013/CHANGELOG），按计划不计本轮达标。

## T4/T5 文档 / 产物：**PASS**

- 版本/lock **0.26.0**；release 只有 0.26.0：zip **899,829 B / `9C18FC9C…98BC`**、setup **817,347 B / `FE2EF144…A268`**；首屏 **284,973 B ≤285,000**，setup ≤820,000；ADR-0004 载荷 **2,454,954 B**（1,020,452 + 1,434,502）；ADR-0014 存在；CHANGELOG 0.26 条目完整，`[TBD]` 0。
- 预算口径已统一：README/AGENTS/CHANGELOG/ADR 中 `815,000` **0 命中**，`820,000` 在 README/CHANGELOG/ADR-0013/ADR-0014 一致；setup 817,347 ≤820,000。
- ADR-0013 已指向 ADR-0014；旧产物数（1,427,617 / 897,251 / 815,683 / 9DBC71B0 / BEAADB7A / 284,134）在 0.26 条目 0 命中；历史 0.25 条目保留属正常。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| acceptance dev 5173 | **11/11 PASS** | `.tmp/r13-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp/r13-acceptance-prod.log` |
| fidelity-acceptance | **19/19 PASS** | `.tmp/r13-fidelity.log` |
| math-ready-acceptance | **11/11 PASS** | `.tmp/r13-math-ready.log` |
| tree-acceptance | **43/43 PASS** | `.tmp/r13-tree.log` |
| keyboard-acceptance | **28/28 PASS** | `.tmp/r13-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r13-theme.log` |
| draft-acceptance | **58/58 PASS** | `.tmp/r13-draft.log` |
| recent-acceptance | **57/57 PASS** | `.tmp/r13-recent.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp/r13-host-save.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp/r13-host-smoke.log` |
| fcp-probe | **6/6 PASS** | `.tmp/r13-fcp.log` |
| verify-installer 0.26.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r13-verify-installer.log` |
| verify-portable | **6/6 PASS**、32 条目 | `.tmp/r13-verify-portable.log` |

## 范围与卫生

- `git status`：30 个已跟踪文件改动、0 删除、12 项未跟踪（`docs/adr/0014`、`docs/iteration/round-13/**`、`scripts/rename-acceptance.mjs`、`src/lib/rename.ts`、`shots/round-13/**`、本报告）；`git diff --stat` 30 文件，371 insertions / 35 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`package-lock` 0.26.0；`tree-acceptance` 43/43。

## 与实施报告对照

- `impl-a.md` 的 T1 22/22、T2 43/43、T3 aria-current 与懒 chunk 结论一致；它没有覆盖长名 title/省略的运行时断言。
- `impl-b.md` 的数字/产物一致；README 与 ADR-0013 的 820,000 已替换旧 815,000，五处口径一致。
- 未发现验收项造假；T1–T4/T5 与全部回归通过。

## 最终判定

**PASS-WITH-UNVERIFIED**

- T1 重命名 22/22、T2 树 43/43、T3 aria-current/懒 Outline、T4/T5 0.26.0/205/284,973/817,347/SHA 与 820,000 预算一致；全部回归通过。
- **UNVERIFIED**：T2 长名 title/省略的运行时断言；真实盘 `move()`/大小写/OneDrive、真实 IME、最近旧记录 FILE_GONE、缓存迁移写失败、屏幕阅读器实录、HKCU/双击。
