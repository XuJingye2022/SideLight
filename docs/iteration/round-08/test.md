# 第 08 轮 · 独立验收（tester）

日期：2026-11-15。基线 `94ceeda`，v0.21.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173` 全程 200；CDP 9222。

方法：先按 T1 → T2 → T3 → T4 → T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，118 modules，**0 warning**，206 ms | `.tmp/r8-build.log` |
| `npm test` | **16 个文件、192 条断言、0 失败** | `.tmp/r8-test.log` |
| `npm run roundtrip` | exit 0；**3 / 7 完全保真**（03/05/07） | `.tmp/r8-roundtrip.log` |

- `dist` **1,398,672 B**；主 chunk `index-C0kUIWmF.js` **1,128.20 kB / gzip 352.98 kB**；CSS 55.30 kB / gzip 13.70 kB。

## T1 草稿：**PASS**

- `node scripts/draft-acceptance.mjs` → **57/57 PASS**：编辑后 800 ms 一条 `draft-save`（LF）；继续编辑只新增一条；`/__draft` 更新时弹恢复框；恢复正文=草稿、`dirty=true`、源码仍是原文件正文；丢弃发 `draft-clear`；保存成功先 `draft-save` 再 `draft-clear`，迟到回包不二次 clear。
- `node host/draft-probe.mjs` → **13/13 PASS**：草稿键 `.sidelight/drafts/note.md`、内容 LF、mtime 新于原文、`/__draft` no-store、clear、重开仍在；真实关窗四路。
- `cache.test.ts` 27 条（含长名 4 位哈希、旧键回读迁移、40 字符内与旧算法逐字节相同）；57/57 的宿主段长名键与前端算法一致，键不撞。
- 真实文件长名两端一致：`长长…-56d8`（57/57 宿主段）；只写文档目录 `.sidelight`。

## T2 关闭：**PASS**

- 57/57：自动保存排队时 `onbeforeunload` 为 null；有脏改动注册；关页触发 beforeunload；宿主 `close-request` 弹框、焦点在「取消」；取消回 `cancel` 后可继续编辑；「保存草稿并关闭」回 `save-draft` 且 text 无 `\r`；「放弃并关闭」只回 `discard`；设置打开时关闭请求排队，关设置后才弹。
- `draft-probe` 13/13：dirty=0 直接关；dirty=1 只发一次 `close-request`；5 s 无答案窗口保持且不重复；cancel 后可再次询问；discard 先清草稿再关；save-draft 写草稿后关；`.sidelight` 只在文档目录。
- 真实 × 关窗/Alt+F4/注销/关机、真实 IME 关窗：**UNVERIFIED**。

## T3 自动保存：**PASS**

- 57/57：文件停笔 2 秒写 1 次、chip「已自动保存」、dirty=false；有结构损失写入 0 次、chip「需手动保存」、不弹框；排队后改出损失不写；`pendingConfirm` 打开时 auto 不写；设置关闭 2.5 秒无写入；写失败 chip 红色、只试 1 次、落一次草稿、连续 3 次后停；IME 组合期间不写、结束后可写。
- 手动保存只发 1 条 save；**2.6 秒内 auto 不再补发**（57/57）；`host-save` 保存中切文档后新文档 `dirty=false`，旧回包不误清除。
- 自动保存不绕过差异门；手动保存仍弹确认。

## T4 UI：**PASS**

- 1366×768：设置面板 top **20**、保存按钮底 **727/768**、内容可滚动；文件菜单四项高度 **30**、`white-space: nowrap`、`scrollWidth-clientWidth=0`。
- 自测 1280×800、1024×768：设置 top 20、保存按钮在视口内、可滚动；菜单四项 30、不折行、无横向溢出。
- 1440×900：面板完整显示、无滚动条（内容未超高，`scrollable=false` 是正确结果），保存按钮底 852/900；菜单同样正常。

## T5 文档 / 产物：**PASS**

- `package.json`/`package-lock.json` **0.21.0**；`release/` 只有 0.21.0 zip/setup；zip **880,851 B / `AFA109BF…C674`**，setup **803,335 B / `C9F9793F…23C0`**。
- README/AGENTS/CHANGELOG 写 0.21.0、192 条、1,398,672 B、两个 SHA；`[TBD]`/`[T3 后确认]` **0 命中**；旧 799,631 / 43465FB0 / 876,034 / FED66CAF **0 命中**。
- ADR-0004 载荷 **2,406,836 B**（1,008,164 + 1,398,672）与实测一致；ADR-0008 含 FormClosing/close-answer/draft-save/5 s/UNVERIFIED。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| keyboard-acceptance | **28/28 PASS** | `.tmp/r8fix-keyboard.log` |
| theme-acceptance | **16/16 PASS** | `.tmp/r8-theme.log` |
| export-math-acceptance | **10/10 PASS** | `.tmp/r8-export-math.log` |
| host-save-acceptance（连跑两次） | **64/64 PASS / 64/64 PASS** | `.tmp/r8fix-host-save-1.log`、`-2.log` |
| host/save-probe | **21/21 PASS** | `.tmp/r8-save-probe.log` |
| host-smoke --fsa | **7/7 PASS** | `.tmp/r8-host-smoke.log` |
| fcp-probe | **6/6 PASS**（FCP 216 ms、reload 56 ms） | `.tmp/r8-fcp.log` |
| acceptance dev 5173 | **11/11 PASS** | `.tmp/r8fix-acceptance-dev.log` |
| acceptance preview 4173 | **11/11 PASS** | `.tmp/r8fix-acceptance-prod.log` |
| verify-installer 0.21.0 | exit 0；装/启/卸/数据保留 PASS；3 项 HKCU/快捷方式 UNVERIFIED | `.tmp/r8-verify-installer.log` |
| verify-portable | **6/6 PASS**、26 条目 | `.tmp/r8-verify-portable.log` |

- 复验修复：三个脚本已把「放弃改动」改为「不保存」，断言未放宽；`host-save` 只统计 `type==='save'` 并加严为 1 条，连跑两次均 **64/64**。
- 产品抽查：手动保存只发 1 条 save，2.6 秒内 auto 不再补发；保存中切文档后新文档 `dirty=false` 且不被旧回包清除（`draft-acceptance` 57/57 与 `host-save` 64/64 覆盖）。

## 范围与卫生

- `git status`：26 个已跟踪文件改动、0 删除、13 项未跟踪（`docs/adr/0008`、`docs/iteration/round-08/**`、`scripts/draft-acceptance.mjs`、`host/draft-probe.mjs`、`src/components/CloseGuardDialog.tsx`、`shots/round-08/**`、本报告）；`git diff --stat` 26 文件，1017 insertions / 70 deletions。
- 无越界删除；`release/`、`host/bin/`、`dist/` 未入库；无密钥/调试残留；`package-lock` 0.21.0。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-{window,fsa}.png`、`shots/round-02/t4-portable.png`、`shots/round-06/t1-host-error.png` 被回归脚本重写（既有行为）。

## 与实施报告对照

- `impl-a.md` 的 T1/T2/T3/T4 结论与 57/57、13/13、T4 测量一致；三个旧回归脚本已同步「不保存」。
- `impl-b.md` 的 T5 结论与 release/文档/ADR 实测一致；宿主草稿/关窗探针 13/13。
- 未发现验收项造假；T1–T5 与全部回归通过。

## 最终判定

**PASS-WITH-UNVERIFIED**

- 复验五项全部通过：`keyboard-acceptance` **28/28**；`acceptance` dev **11/11**、4173 **11/11**；`host-save` **64/64 连跑两次**；`draft-acceptance` **57/57**；`npm test` **16 文件 192 条**。
- 产品抽查：手动保存后 2.6 秒内 auto 不再发 save；保存中切文档后新文档 `dirty=false`，旧回包不误清。
- T1–T5 与其余回归（theme 16/16、export 10/10、save-probe 21/21、host-smoke 7/7、fcp 6/6、installer 0.21、portable 6/6）保持通过；三个旧脚本已同步「不保存」，断言未放宽。
- **UNVERIFIED（不凑 PASS）**：真实 × 关窗/Alt+F4/注销/关机、真实 IME 关窗、只读目录 save-draft 失败、localStorage 配额、真人双击/系统对话框、文件占用/网络盘/中文长路径。
