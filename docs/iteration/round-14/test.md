# 第 14 轮 · 独立验收（tester）

日期：2026-11-16。基线 `d941874`（v0.27.0），v0.28.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 P0 → 首次使用 → P3/P4 → 发布/文档 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，127 modules，**0 warning**，216 ms | `.tmp/r14-build.log` |
| `npm test` | **16 个文件、205 条断言、0 失败** | `.tmp/r14-test.log` |
| `measure --max 285000` | **PASS**，首屏 **283,775 B**（余 1,225 B） | `.tmp/r14-measure.log` |

- `dist` **1,436,795 B**；首屏 `index--6GMvm75.js` 885,498 raw / gzip 277,214 B，CSS 31,006 / 6,561 B；`SettingsDialog`/`ShortcutsDialog` 已进懒 chunk。

## P0 新建保存：**PASS**

`node scripts/newfile-acceptance.mjs` → **23/23 PASS**：

- 打开 a.md → ＋新建 → 输入 → Ctrl+S：写 `未命名.md`（含 NEW-DOC-MARKER），a.md SHA 不变；标题/树选中/`__slState` 全部是未命名.md。
- 不保存停 4 秒：a.md SHA 不变、新文件仍 0 字节、无「已保存 a.md」；首次保存后自动保存写新文件。
- 另存为后 Ctrl+S 写 c.md、a.md 不变；重命名后 Ctrl+S 写 b.md、a.md 不存在、picker 0。
- 外部删除/改名刷新后不写旧路径；删除后刷新再保存不写已删路径。
- 首屏焦点在正文可直接输入；空文档显示「从这一句开始写」；无工作区空态不再写示例；设置打开后焦点在对话框内。

## 首次使用：**PASS-WITH-UNVERIFIED**

- 23/23 覆盖：首屏焦点、空文档占位、无工作区空态、设置焦点不被抢。
- `grep` 无 `demoWorkspace|DEMO_FILES|demoTexts|.demo` 残留（0 命中）；`documentKind` 相关文案在空态/新建路径已验证。
- **UNVERIFIED**：三处文案逐字一致（顶栏/树空态/正文）未在同一脚本中做逐字段断言；「分析本段（模拟）」的 mock 批注未单独跑「已丢弃」断言（脚本未覆盖该按钮）。

## P3/P4 侧栏与树细节：**PASS-WITH-UNVERIFIED**

- `tree-acceptance` **45/45**：侧栏 `tablist/tab`、`aria-selected`、切回文件后展开态保留；导出菜单代码已给四项 `role="menuitem"`。
- **UNVERIFIED**：空文件夹提示、长名 `scrollWidth<=clientWidth`/`title`、1024 顶栏不换行未在 45 项中单独运行时断言；P3/P4 代码存在，属代码核对。
- 侧栏 tab 属性本轮已实现（45/45 的 `tablist/tab`），不再延后。

## 发布 / CI / 文档：**PASS-WITH-UNVERIFIED**

- `.github/workflows/release.yml` 有 preflight / windows-build / macos-build / release 四个 job；tag `v*` 与 `package.json`/CHANGELOG preflight；release job `if: push || inputs.publish`、`contents: write`、`sha256sum -c`、`softprops/action-gh-release@v3`、`overwrite_files`、`fail_on_unmatched_files`；`publish` 默认 false。
- `ci.yml` 的 `continue-on-error` **0 处**；`install-verify` 仍只在 `workflow_dispatch`。
- 版本/lock **0.28.0**；README/AGENTS/CHANGELOG 写 0.28.0、283,775、本机 setup 817,886 / zip 901,866；无 `[TBD]`、无 `Sidelight-0.27.0-win` 旧包名；ADR 索引/说明已更新。
- **UNVERIFIED**：实际 Release v0.28.0 尚未由 workflow 生成；本地 `release/SHA256SUMS-0.28.0.txt` 与 mac zip 不存在，无法验证 Release 资产/校验和；本地 `release/SHA256SUMS.txt` 仍是 0.26 的旧文件（release 忽略，不进库）。
- 本机 setup **817,886 B**、zip **901,866 B**，均低于内部 820,000 / 硬线 850,000；`verify-installer`/`portable` PASS。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| newfile-acceptance | **23/23 PASS** | `.tmp/r14-newfile.log` |
| tree-acceptance | **45/45 PASS** | `.tmp/r14-tree.log` |
| rename-acceptance | **22/22 PASS** | `.tmp/r14-rename.log` |
| acceptance dev 5173 | **11/11 PASS** | `.tmp/r14-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp/r14-acceptance-prod.log` |
| fidelity-acceptance | **19/19 PASS** | `.tmp/r14-fidelity.log` |
| math-ready-acceptance | **10/11 后崩溃**：找不到 `HTML` 按钮 | `.tmp/r14-math.log` |
| keyboard-acceptance | **26/28 FAIL**：首 Tab 不是 skip link、焦点不在正文 | `.tmp/r14-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r14-theme.log` |
| draft-acceptance | **58/58 PASS** | `.tmp/r14-draft.log` |
| recent-acceptance | **57/57 PASS** | `.tmp/r14-recent.log` |
| host-save-acceptance | **64/64 PASS** | `.tmp/r14-host-save.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp/r14-host-smoke.log` |
| fcp-probe | **6/6 PASS** | `.tmp/r14-fcp.log` |
| verify-installer 0.28.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r14-verify-installer.log` |
| verify-portable | **6/6 PASS**、34 条目 | `.tmp/r14-verify-portable.log` |

- **math-ready 失败**：导出菜单四项已从 button 改成 `role="menuitem"`，脚本仍用 `getByRole('button', { name: 'HTML' })` 查找，超时；前 10 项（首屏无 KaTeX、失败态、插入/预览/块级）均过。这是 T3 P3/P4 变更后脚本未同步。
- **keyboard 失败**：新首次使用把首屏焦点主动放进正文；第一下 Tab 从正文出发，skip link 不再是第一站，脚本仍按「body→Tab=skip link」断言。这是 T2 首次使用与既有键盘验收的冲突，需产品/测试定策略（例如保留 skip link 首站或在无操作时不抢先焦点）。

## 范围与卫生

- `git status`：27 个已跟踪文件改动（回归脚本重写的历史截图，diff 0 insertions/0 deletions，均为二进制）、0 删除、1 项未跟踪（本报告）；`git diff --stat` 27 文件，0 insertions / 0 deletions。
- `release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`package-lock` 0.28.0；`__slMarkdown` 0。
- `release/` 本地另有 0.27.0 两个 Windows 资产与旧 `SHA256SUMS.txt`；release 忽略，不进库；0.28 正式资产待 workflow。

## 与实施报告对照

- `impl-a.md` 的 P0 23/23、tree 45/45、rename 22/22 与实测一致；P3/P4 的 tablist/展开态已实测，空文件夹/长名/顶栏为代码核对。
- `impl-b.md` 的 release.yml/CI/文档与静态检查一致；实际 Release 尚未生成，不能验证资产和 SHA 文件。
- 未发现验收项造假；失败集中在两个旧回归脚本与首次使用焦点策略。

## 最终判定

**FAIL（keyboard 26/28、math-ready 10/11；P0 与其余回归通过）**

- 最严重：T2 首屏自动聚焦正文后，第一下 Tab 不再落到 skip link；keyboard 验收 26/28。需明确「自动聚焦」与「skip link 首站」的优先级，或让 skip link 始终是第一站。
- 次严重：T3 导出菜单改 `menuitem` 后，`math-ready-acceptance` 仍按 button 查 HTML，导出项未跑完；应改为 `getByRole('menuitem')` 并重跑 11/11。
- **UNVERIFIED**：实际 Release v0.28.0 资产/SHA256SUMS-0.28.0、macOS zip、T2 mock 批注/三处文案逐字、P3/P4 空文件夹/长名/1024 顶栏、真实 macOS/签名、HKCU/IME/网络盘。
