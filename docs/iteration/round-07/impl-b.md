# 第 07 轮 · 实施报告 B（builder2）

执行人：builder2。顺序 T4（NSIS opt-in 关联）→ T5（0.20.0 文档），均完成。未 commit、未跑 `npm run build`、未写真实注册表；`src/**`、`scripts/**` 未改。结束 `Sidelight` 进程 0。

---

## T4 NSIS `.md` 关联 opt-in + `ASSOC_DRYRUN` —— 完成

### 改动

- `packaging/installer.nsi`
  - `MUI_PAGE_COMPONENTS` 插在目录页与安装页之间；页面顺序变成「目录 → 组件 → 安装」。
  - 新增 `Section /o "在「打开方式」中加入 Sidelight" SEC_ASSOC`：默认不勾。10 条写入全在 `HKCU "Software\Classes`（ProgID `Sidelight.md` 默认值 / `FriendlyTypeName` / `DefaultIcon` / `shell\open\command`；`.md\OpenWithProgids` 的 `Sidelight.md`；`Applications\Sidelight.exe` 的 `ApplicationName` / `ApplicationCompany` / `ApplicationIcon` / `shell\open\command` / `SupportedTypes\.md`）。
  - `MUI_FUNCTION_DESCRIPTION`：说明「不改变 .md 的默认程序」。
  - `ASSOC_DRYRUN` 编译开关：10 条 `WriteRegStr` 换成 `FileWrite "$INSTDIR\assoc-plan.txt" "键|值"`，**绝不碰注册表**；`!else` 分支才是真实写入。
  - 卸载对称 4 条：`DeleteRegValue …OpenWithProgids Sidelight.md` → `DeleteRegKey /ifempty …OpenWithProgids`（保留 `VSCode.md`）→ 删 ProgID → 删 `Applications\Sidelight.exe`。不碰 `UserChoice`、`FileExts`、`.md` 默认值。
  - `OutFile` 改成可用 `!define OUTFILE` 覆盖，dry-run 输出到 `.tmp`，不进 `release/`。
- `packaging/installer.ps1`：加 `param([switch]$AssocDryRun)`；dry-run 用 `/DASSOC_DRYRUN /DOUTFILE=..\.tmp\assoc-dryrun-setup.exe` 编 `.tmp\assoc-dryrun-setup.exe`，打印字节后 exit 0；默认路径仍打 `release/`，不传任何新开关。
- `packaging/verify-installer.ps1`：新增静态断言与 dry-run 安装段（见下）。

### 证据

```text
默认包（含关联节，编到 .tmp 量体积）  797,212 B（794,843 → +2,369 B，硬线 850,000 余量 52,788）
dry-run 包（ASSOC_DRYRUN）            797,250 B
.nsi 静态计数：WriteRegStr HKCU "Software\Classes = 10
               对称 DeleteReg（Software\Classes）= 4
               WriteRegStr/WriteRegDWORD HKLM = 0（允许的 ReadRegStr HKLM = 2）
               UserChoice = 0；MUI_PAGE_COMPONENTS = 1；Section /o = 1
verify-installer.ps1：PASS（3 UNVERIFIED）
  PASS 关联静态断言：10 写 / 4 删 / 无 HKLM 写 / 保留 HKLM 读 / 无 UserChoice / 组件页 + Section /o
  PASS dry-run /S 安装：组件默认不勾，assoc-plan.txt 不存在（静默不写关联）
  PASS dry-run 包卸载清理
  UNVERIFIED HKCU 卸载项、开始菜单快捷方式、删除（沙箱 HKCU 不可观测）
```

真实 HKCU 的三条（勾选后「打开方式」出现、卸载后消失、`VSCode.md` 仍在）**UNVERIFIED**：本沙箱写不进真实 HKCU。`FileExts` 的 MRU 若用户手动选过一次可能残留，属已知限制（写进 ADR-0007 与 packaging 说明）。

---

## T5 0.20.0 文档 —— 完成（数据保真段留 `[T3 后确认]`）

- `package.json` → **0.20.0**；`package-lock` 未动（根代理 `npm install --package-lock-only`）。
- `docs/CHANGELOG.md` 顶部加 `## 0.20.0 — 2026-11-15`：数据保真段 `[T3 后确认]`；关联 opt-in（组件页、默认不勾、`/S` 不装、只写 HKCU、卸载 `/ifempty` 保留 `VSCode.md`、不碰 `UserChoice`/`FileExts`）；ADR-0007；测试 `[N] 文件 [M] 条`；体积 `[TBD]`。
- `README.md`：按 findings-ship 的替换句改（引用式链接提示、保存拦截、关联 opt-in、`0.20.0` 包名、未验清单加「打开方式是否出现/卸载残留」、ADR 0001–0007、ADR-0007 决策行、下一步删掉 `.md` 关联）；数据保真 5 处留 `[T3 后确认]`；打包体积 `[TBD]`；宿主层字节与 SHA 改成「见 CHANGELOG 0.20.0」；`npm test` 注明以实际输出为准。
- `AGENTS.md`：0.20.0；功能清单加「`.md` 打开方式候选（opt-in）」「数据保真拦截」；未验清单加「勾选关联后打开方式是否出现、卸载是否残留、真人交互安装、数据保真真实样本」；测试 16 文件 177 条。
- `docs/adr/0007-markdown-association.md`（新）：背景（UserChoice + Hash + UCPD）、决定、10 条键表、安装 UX、`/S` 不装、卸载 4 条、否决方案、dry-run + 真人三条 UNVERIFIED。
- `packaging/README.md`：表格加「关联 opt-in，默认不选」、安装步骤加组件页一步、卸载加「删关联登记但不改默认程序」、限制段改写（opt-in 已实现、`/S` 不写、`FileExts` MRU 可能残留）、体积预算 +2,369 B。
- `packaging/README.txt`：便携版说明加「装到系统的版本安装时可选择加入『打开方式』」。

### 门禁

```text
npm test                                  exit 0
node -e version                           -> 0.20.0
Select-String '## 0.20.0 — 2026-11-15'    -> 1
README 禁用句（保存不会改坏原文 / 支持引用式链接 / 保存前会把所有改动给你看 / 关联 .md，双击打开 / 794,843） -> 0
README [T3 后确认] -> 5；CHANGELOG -> 1（等根代理按 T3 结果替换）
ADR-0007 含 OpenWithProgids / UserChoice / /ifempty / UNVERIFIED
AGENTS 0.20.0 -> 2
```

---

## 遗留

1. **`[T3 后确认]`（README 5 处 + CHANGELOG 1 处）**：等 A 组 T3 落地，根代理按「修到保真」或「拒绝静默保存 + 源码模式原文」替换；替换后应为 0。
2. **`[TBD]`**：README 打包产物、CHANGELOG 0.20.0 体积与安装包/zip 字节 + SHA256；根代理重建后回填（预算 850,000，默认包实测 797,212，预计 +前端增量）。
3. `package-lock.json` 仍 0.19.0；`release/` 里的 0.19.0 包未替换（本轮默认包只编到 `.tmp\assoc-default-setup.exe` 量体积，不覆盖发布物）。
4. 真实 HKCU 关联三条、真人交互安装、`FileExts` MRU 残留均 **UNVERIFIED**。

---

## 收尾补记（0.20.0 最终产物 + A 组 T1–T3 落地）

- **数据保真段已定稿**：README 5 处 + CHANGELOG 1 处 `[T3 后确认]` 全部替换成实际（引用式链接 / 表格 / 多行脚注等保存前显示差异类别并要求确认；roundtrip 02/04 被拦截、03/05/07 保真；正常编辑改值/删行不弹）。措辞统一为「不静默改写，保存前确认」。
- **最终产物**：dist **1,389,367 B**；setup **799,631 B**（SHA256 `43465FB09DD5CC3CEF807E60F1B62F7D4B7D2E69E2515B84F6261C6BD3BB3507`）；便携 zip **876,034 B**（SHA256 `FED66CAF49C726386C9C8EC7DD3A46CD112999E365C21D46BDFF0A1EB0CC1B77`）。README / CHANGELOG 的 `[TBD]` 已回填；ADR-0004 载荷实测 **2,391,387 B**（1,002,020 + 1,389,367），webview2-data 19,449,583 B。
- **测试数** 177 → **188**（README / AGENTS / CHANGELOG）；版本 0.20.0；旧数 `1,382,298 / 873,775 / 794,843` 与旧 SHA 在文档中 0 命中（CHANGELOG 的 `## 0.19.0` 标题作为历史保留）。
- **复验**：`packaging/verify-installer.ps1` **PASS**（3 UNVERIFIED：HKCU、快捷方式；关联静态断言与 dry-run 静默安装均 PASS；首次运行遇到一次 `Start-Process` 瞬时失败，重跑通过）；`node scripts/data-safety-acceptance.mjs`（dev 5173）**34/34 PASS**。