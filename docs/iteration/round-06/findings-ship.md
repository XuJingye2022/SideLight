# 第 06 轮 发布与优化发现（ship）

侦察对象：`D:\Documents\SidelightProgram`，HEAD `d8e84a4`（`2b031e8` 之后只有两份文档提交）。工作树干净，`package.json` 版本 0.18.0。本轮只读；没有跑 `npm run build`，没有写注册表，没有改产品文件。

方法：读指定文件与相关代码；用 `git diff 2b031e8..HEAD` 核对已合并改动；用 Python `gzip -9` / `lzma` 量体积；在 `.tmp/ship-spike/` 复制 `host/Program.cs` 并加一段 188 行的写回原型，用仓库同款 `csc.exe` 编译量增量（原型不是产品代码）；在 `.tmp/` 用 `npx vite build` 做了「无 KaTeX」A/B（没有跑 `npm run build`）；只读查看本机 `.md` 关联注册表。

## 版本建议

**升 0.19.0，不升 0.18.1。**

- 本轮改的是用户可见能力：双击/命令行打开的 `.md` 从「只读、只能另存为」变成「可编辑、`Ctrl+S` 写回原文件」。AGENTS §5 写明「功能 +0.1.0，修复 +0.0.1」。简报本身也写「CHANGELOG 0.19.0」（`docs/iteration/round-06/brief.md:16`）。
- 这不是补一句提示的修复。它新增宿主消息协议、写回生命周期与 ADR-0006，属于功能增量。
- 0.18.0 之后没有已合并的产品改动。`git diff --name-status 2b031e8..HEAD` 只有 `docs/iteration/STATE.md`（改）与 `docs/iteration/round-06/brief.md`（新增）。这两项不是用户可见变更，不进 CHANGELOG。
- 发布动作：`package.json` 从 0.18.0 改到 0.19.0；`installer.ps1` 只读这个版本号，产物名自动变 `Sidelight-0.19.0-win-x64-setup.exe`；`release/` 里旧的 0.18.0 包不要删错。

### CHANGELOG 草稿（0.19.0，日期 2026-11-15）

按现有格式，放在 0.18.0 上面。方括号是发布时由 releaser 填的实测值，不能预填。

```markdown
## 0.19.0 — 2026-11-15

双击或命令行打开的 `.md` 可以直接编辑并写回原文件，不再只读。

- 宿主新增写回通道：页面只发正文，宿主只写启动/转发时记住的当前路径；其他路径一律拒绝。
- 写回保留原文件的 BOM 与换行（CRLF/LF）；先写同目录临时文件再替换，失败不动原文件。
- 前端 `Ctrl+S` 走宿主写回；10 秒无响应按失败处理，保留未保存标记并可重试。
- 单实例转发打开的新文件也切换为可写；转发前仍先确认未保存改动。
- 另存为、新建、打开其他文件后清除宿主写回路径，不再写回旧文件。
- 只读横幅改成「写回原文件」说明；保存前格式对比与 `.sidelight` 草稿逻辑保持。
- 新增宿主写回冒烟与前端桥接测试（测试 [N] 个文件、[M] 条）。
- 文档：新增 ADR-0006；README 与 AGENTS 更新打开、保存与未验说明。
- 体积：构建产物 [X] B；安装包 [Y] B（SHA256 `[...]`）、便携 zip [Z] B（SHA256 `[...]`）。
- 未验：[按实测填，例如真人双击、文件被占用/只读、网络盘、中文路径写回、SmartScreen]。
```

### 0.18.0 之后要记的改动清单

| 改动 | 来源 | 进 CHANGELOG |
| :--- | :--- | :--- |
| 宿主写回通道（路径不外传、原子写、BOM/换行保留） | 本轮计划 | 是 |
| 前端宿主持久化检测、`Ctrl+S` 写回、10 秒超时、失败保留 dirty | 本轮计划 | 是 |
| 单实例转发文件可写；转发前确认不变 | 本轮计划 | 是 |
| 另存为/新建/打开其他文件清除写回路径 | 本轮计划 | 是 |
| 只读横幅改文案 | 本轮计划 | 是 |
| ADR-0006 与 README/AGENTS 更新 | 本轮计划 | 是（文档行） |
| 新增测试与测试条数 | 本轮计划 | 是 |
| 安装包/zip 字节与 SHA256 | 发布时实测 | 是 |
| 第 5 轮收尾文档、第 6 轮简报 | `d8e84a4` | 否（非用户可见） |

注意：`docs/CHANGELOG.md` 的 0.18.0 条目末尾（第 14–15 行）与下一个 `## 0.17.0` 之间缺一个空行。写 0.19.0 时顺手补上，否则渲染会把两节连在一起。

## 安装包体积预算

### 现状（2026-11-15 实测）

| 项 | 字节 | 说明 |
| :--- | ---: | :--- |
| 安装包 `release/Sidelight-0.18.0-win-x64-setup.exe` | 788,878 | 硬线 850,000 |
| 剩余 | **61,122** | 7.7% |
| 便携 zip | 866,981 | 无硬线 |
| `dist` 合计 | 1,373,690 | 18 个文件 |
| `host\bin` 五件载荷 | 991,780 | `Sidelight.exe` 54,272 |
| 载荷合计 | 2,365,470 | 安装包/载荷 ≈ 33.4% |

### 写回增量（原型实测）

在 `.tmp/ship-spike/` 把 `Program.cs` 复制一份，加 188 行 C#（字段、消息解析、原子写、BOM/换行、中文错误文案、回复）；`Writeback.cs` 单独成类会略高估，属于保守估计。

| 项 | 增量 | 依据 |
| :--- | ---: | :--- |
| `Sidelight.exe` 原始字节 | **+4,608 B** | 54,272 → 58,880 |
| `Sidelight.exe` LZMA-9 压缩后 | **+1,688 B** | 20,296 → 21,984；安装包用 solid LZMA，量级一致 |
| 前端 JS（估计） | +2,000–4,000 B 原始 / +800–1,500 B gzip | 桥接、超时、提示文案约 120–200 行 TS |
| 安装包合计（估计） | **+2.5–3.5 KB** | 791.4–792.4 KB |

C# 字符串不是大头。188 行原型里用户可见中文 5 段，日志字符串 5 条；编译后 4.6 KB（含 JSON 解析代码），压缩后 1.7 KB。真正的实现即使写到 250 行、增加 10 条错误文案，原始增量也在 8 KB 内，安装包增量 ≤3 KB。

### 结论

- **850,000 B 的硬线够本轮。** 预计 0.19.0 安装包 791–793 KB，剩 57–59 KB。
- 建议把内部预警线定在 **840,000 B**（硬线下留 10 KB），而不是等 850,000 才报。理由：NSIS/WebView2 SDK 升级、图标或清单变化都会吃字节；留 10 KB 比事后砍功能便宜。
- 写回不新增安装文件，只改现有 `Sidelight.exe`。`ESTSIZE` 由 `installer.ps1` 按载荷自动算，不用手改。
- 关联方案只加 NSIS 页与注册表代码，估计 +1.5–3 KB，仍在余量内。
- KaTeX 惰性化**不减小安装包**。所有 chunk 仍要进 `www`，只是首屏不下载；不要把它当体积优化。
- 最终数字以 `packaging\installer.ps1` 的实测为准。本报告是原型预算，不是打包结果。

## S1 冷启动打开 `.md` 会覆盖未保存草稿（高）

**证据**

- `host/Program.cs:447-451`：启动时若 `pendingFile` 存在，注入脚本后导航；脚本在页面加载前执行。
- `host/Program.cs:595-601`：脚本直接 `localStorage.setItem('sidelight.doc.v1', ...)`，把 argv 文件正文写进文档键。
- `src/App.tsx:270-288`：应用启动只读这个键，读到什么就显示什么。
- `src/App.tsx:479`：每次编辑把当前正文写回同一个键（草稿）。
- `host/Program.cs:668-693`：脏检查只用于「第二个实例转发」，冷启动路径不检查。

**影响**

用户上次退出时有未保存正文（草稿在 localStorage），这次双击任意 `.md`，草稿被静默替换。第 06 轮把「双击打开」变成主流程后，这个窗口会更大。写回本身不制造它，但会让用户更放心地依赖双击。

**建议**

在宿主注入前检查 `sidelight.doc.v1` 是否存在且带 `savedAt > 0`。有则先备份到 `sidelight.doc.recovery.<时间戳>`，或弹宿主确认框「有未保存草稿，打开 x 会替换」。ADR-0006 必须写这条。不要把「恢复草稿」只放在前端——前端拿到新正文时旧草稿已经被覆盖。

**难度** M（1–2 小时，C# + 注入脚本 + 一个失败用例）。

## S2 写回信息若塞进固定注入脚本，转发后会过期（高）

**证据**

- 当前宿主还没有 `window.__sidelightHost`；第 06 轮要新增。`host/Program.cs:447-451` 用 `BuildApplyScript` 生成一份固定脚本并 `AddScriptToExecuteOnDocumentCreatedAsync`，只在启动时注册一次。若照简报把 host 信息塞进这份脚本，它就会是固定字符串。
- `host/Program.cs:581-606`：脚本把 `readOnly:true` 写死；文件名/路径在生成时固化。
- `host/Program.cs:668-708`：第二个实例转发只改 localStorage 再 reload，不更新已注册脚本。
- `src/App.tsx:276-287`：`readOnly` 从 localStorage 恢复；`:292-295` 成为 React 状态。
- 首次启动脚本用 `sessionStorage['sl:argv-done']` 守卫（`Program.cs:589-602`）。转发触发的 reload 中，注册脚本看到 done=1 直接返回，所以启动时注入的 host 信息不会随新文件更新。

**影响**

按简报直接实现后：先双击 A，再双击 B，B 的正文进来了，但 `window.__sidelightHost.fileName` 还是 A。首次启动没有 argv 时，转发 B 后页面完全没有 host 信息。写回实现若按启动路径写，可能把 B 的正文写进 A；若按 `fileName` 找文件，则提示错误。`readOnly` 写进 localStorage 还会让重启后出现「上次是只读」的幽灵横幅。

**建议**

- 协议加一条 `hello` / `host-info`：页面加载后 `postMessage({v:1,type:'hello'})`，宿主回当前 `{writable,fileName}`。这是唯一能跨转发更新信息的干净做法；不要靠重新注册脚本（SDK 没有对称的移除 Async 包装，`AddScriptToExecuteOnDocumentCreatedAsync` 只能加）。
- 写回路径只存在宿主字段 `writablePath`，页面永远拿不到完整路径。
- 删掉 localStorage 里的 `readOnly` 字段，横幅状态从 `__sidelightHost` 派生；旧键做一次清理即可。
- ADR-0006 的协议表要写 `hello`，否则实现者会照简报只做 `save`，S2 必现。

**难度** M（宿主 30–50 行，前端 20–40 行，加转发用例）。

## S3 发布文档与事实不符，0.19.0 会继承错误（中）

**证据**

- `README.md:32`：出现字面量 `` `n- 双击 ``。这里本应是换行加列表项，现在整段是一行，反引号也不配对。
- `README.md:44`：「还没有 Mermaid 图表、主题切换」。0.18.0 已发三档主题（`docs/CHANGELOG.md:9`），这句已假。
- `README.md:69`：「16 个文件、171 条断言」。实测 `npm test` 是 **16 个文件、177 条**（本次侦察重跑，16 次 `pass` 合计 177，fail 0）。
- `README.md:38`：安装包名还写 `0.18.0`。
- `docs/CHANGELOG.md:10`：「清单见 README 的快捷键段」。README 里没有快捷键段；只有 `README.md:132` 提到「自定义快捷键」。
- `README.md:101`：ADR 范围写「0001–0005」，加 ADR-0006 后过期。
- `docs/typora-gap.md:81`：主题仍写「只有跟随系统的明暗」，与三档主题矛盾；`:89` 的优先项也还把主题列为待做。

**影响**

发布说明、验收清单、README 会互相打架。用户按 README 找不到快捷键清单，也会以为没有主题。第 07 轮 planner 若照 README 排优先级，会把已完成项再排一遍。

**建议**

把「文档必须改的句子」一节当成本轮验收项，逐条勾。不要只改 CHANGELOG。

**难度** S（0.5 小时）。

## S4 `.md` 关联不能承诺「双击即用 Sidelight 打开」（中）

**证据**

- 本机只读查看：`HKCU\Software\Classes\.md\OpenWithProgids` 已有 `VSCode.md`；`HKCU\...\FileExts\.md\UserChoice` **不存在**；`HKCR\.md` 默认值为空。
- `packaging/README.md:55`：「不做 `.md` 文件关联（是否做，待产品负责人确认）」。
- `packaging/verify-installer.ps1:94-109`：本沙箱里 HKCU 写入不可观测，只报 UNVERIFIED。关联的安装/卸载同样无法在这里验。
- Windows 8 起默认程序由 `UserChoice` + 校验 Hash 决定，程序不能可靠地替用户设置；Win10/11 的部分版本还有 UCPD 保护。见 [NSIS Section 参考（`/o` 默认不勾）](https://nsis.sourceforge.io/Reference/Section)、[UserChoice 由用户 GUI 决定的说明](https://stackoverflow.com/revisions/f077026a-f118-4584-837e-75e7eac67d18/view-source)。

**影响**

如果复选框文案写「关联 .md」，用户会理解成「双击 .md 用 Sidelight 打开」。实际只能把 Sidelight 加进「打开方式」候选；默认程序仍要用户在资源管理器或设置里自己选。承诺过头比不做更伤信任。

**建议**

- 复选框文案写「在「打开方式」中加入 Sidelight（不改变默认程序）」，不写「关联 .md」。
- 安装器只写 `HKCU\Software\Classes\Sidelight.md` 与 `.md\OpenWithProgids`，绝不动 `UserChoice`。
- 卸载对称删除自己的 ProgID 与 `OpenWithProgids` 值；用 `/ifempty` 清空键，别删掉 `VSCode.md`。
- 真实验证必须由人在干净用户配置里做；沙箱结论只能写 UNVERIFIED。

**难度** S（决策与文案）；实现见「关联方案」。

## S5 STATE 里的截图数字已过期，清理不能照它执行（低）

**证据**

- `docs/iteration/STATE.md:73`：43 个零引用、约 3.1 MB；`shots` 164 个 / 12.2 MB。
- 本轮实测（写就时；另一个 finder 仍在加图）：零引用 **36 个 / 2,275,457 B**，其中 `round-05` 30 个 / 2,007,292 B 是历史清理对象，`round-06` 6 个是临时图；`shots` 合计 **231 个 / 17,201,003 B**；round-05 一个目录就 **50 个 / 3,561,174 B**。
- `git ls-files shots` 214 个（历史图全部已跟踪），`git ls-files --others shots` 17 个（本轮新图，尚未提交）。

**影响**

照 STATE 的 43 个执行而实际只有 30 个零引用，会多删 13 个（其中可能有引用）。照「3.1 MB」估收益会高估约 1 MB。数字过期本身也会让下一轮误判仓库重量。

**建议**

清理前重新生成清单（步骤见「shots 清理」）。先修 STATE，再执行删除。

**难度** S。

## 关联方案（NSIS per-user 安装器）

当前 `packaging/installer.nsi` 只有目录页与安装页（`:30-33`），主节 `SEC_MAIN` 不可取消（`:52`），卸载节只清自己的快捷方式、安装目录与 HKCU 卸载项（`:106-112`）。三种 opt-in 实现如下。

| 维度 | A. 组件页（推荐） | B. 自定义页 | C. MessageBox |
| :--- | :--- | :--- | :--- |
| 改法 | 加 `!insertmacro MUI_PAGE_COMPONENTS`；新增 `Section /o "在「打开方式」中加入 Sidelight" SEC_ASSOC` | `nsDialogs` 写一个自定义页，复选框变量，`MUI_PAGE_CUSTOMFUNCTION_*` 挂接 | 主节里 `MessageBox MB_YESNO ... /SD IDNO`，选是才写注册表 |
| NSIS 增量 | 约 20–30 行 | 约 50–70 行 | 约 8–12 行 |
| 工作量 | 1.5–2.5 小时（含卸载与验证脚本） | 3–5 小时 | 0.5–1 小时 |
| 默认状态 | `/o` 默认不勾；`/S` 静默安装也不装 | 默认不勾；静默跳过页面，不装 | `/SD IDNO` 默认否；静默自动答否 |
| 卸载清理 | 对称：删 ProgID、删 `OpenWithProgids` 值、`/ifempty` 清空键 | 同 A | 同 A |
| 可解释性 | 组件名后可跟说明；用户能看到代价 | 可写多行说明与「默认程序仍需自己选」 | 只有一行，容易被点错 |
| 风险 | 新增一页，改变安装流程；页面顺序要调 | 自绘页面本地化、布局、键盘可达都要自己保证 | 模态框打断安装；无法解释 UserChoice；不适合自动化 |
| 结论 | **推荐** | 需要更长的解释文案时才选 | 不推荐 |

### 推荐实现（组件页）

1. 页面顺序：`MUI_PAGE_DIRECTORY` → `MUI_PAGE_COMPONENTS` → `MUI_PAGE_INSTFILES`；组件页必须存在，`/o` 才会显示为未勾。
2. 主节保持必装；关联节用 `Section /o`，默认不勾。
3. 勾选后只写四类值（三个 ProgID 值 + 一个 OpenWithProgids 值）：
   - `HKCU\Software\Classes\Sidelight.md` 默认值「Sidelight Markdown 文档」；
   - `...\Sidelight.md\DefaultIcon` 指向 `$INSTDIR\Sidelight.exe,0`；
   - `...\Sidelight.md\shell\open\command` 为 `"$INSTDIR\Sidelight.exe" "%1"`；
   - `HKCU\Software\Classes\.md\OpenWithProgids` 增加值 `Sidelight.md`（空字符串）。
4. 不写 `UserChoice`，不改 `.md` 默认值，不写 HKLM。
5. 卸载：`DeleteRegKey HKCU "Software\Classes\Sidelight.md"`；`DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md"`；`DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"`（保留 `VSCode.md` 等其他值）。不要删 `.md` 根键。
6. 便携 zip 不做关联；在 `packaging/README.md` 说明。

### Windows UserChoice 的现实

- 默认程序记录在 `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice`，带 `Hash`。Windows 校验 Hash，程序无法可靠伪造；Win10/11 的 UCPD 还会拦第三方改这个键。
- 安装器能做的只有「注册候选」：`OpenWithProgids` + ProgID。第一次双击仍可能弹「你要如何打开」，用户勾「始终使用」后才写 UserChoice。
- 本机现状正好证明这一点：`.md` 没有 UserChoice，`OpenWithProgids` 只有 `VSCode.md`。装完勾选后，Sidelight 会出现在这个候选列表里，但不会自动变成默认。
- 卸载不会删用户的 UserChoice。如果用户曾把 Sidelight 设为默认，卸载后 UserChoice 会指向已删除的 ProgID，Windows 会退回选择框或提示应用不存在。这个残留要写进 `packaging/README.md`，不要尝试在卸载器里改 UserChoice。

### 验证影响

- `packaging/verify-installer.ps1` 现在断言 HKCU 卸载项 7 值、开始菜单、目录、卸载后清理。关联要加两条：静默安装默认**不**写 `Sidelight.md`；测试时临时把关联节改成默认选中（或加一个测试专用开关）安装后写入，卸载后删除且 `VSCode.md` 仍在。沙箱里 HKCU 不可观测，这两条只能记 UNVERIFIED，需真人复核。
- 静默安装命令不带组件选择时，`/o` 保持不勾。不要把关联放进默认节，否则 `/S` 会静默改用户关联，违反 opt-in。

## 文档必须改的句子

### README.md

| 位置 | 现状 | 必须改成 |
| :--- | :--- | :--- |
| `:32` | 字面量 `` `n- ``，整段一行；「双击 .md 由宿主打开时显示只读横幅，保存走另存为」 | 拆成两条列表项；改成「双击/命令行打开的 `.md` 可直接编辑，`Ctrl+S` 写回原文件；另存为后不再写回旧文件」 |
| `:38` | `Sidelight-0.18.0-win-x64-setup.exe` | `0.19.0`；并在未验列表加「宿主写回（真人双击、文件占用）未验」 |
| `:44` | 「还没有 Mermaid 图表、主题切换」 | 删「主题切换」；保留 Mermaid 与「不能换字体」 |
| `:47` | 已有 21 / 缺 18 | 改主题行后复核；若数量变了同步改 |
| `:51` | `dist` 1,373,690 B | 0.19.0 实测值 |
| `:53` | 「0.18.0 不做」拆 KaTeX | 保留历史事实，补一句「第 07 轮评估 alias 惰性包装，见 ADR/报告」 |
| `:62` | 安装包 788,878 / zip 866,981 与两个 SHA256 | 0.19.0 实测值与新校验和 |
| `:69` | `npm test # 16 个文件、171 条` | `177` 加本轮新增条数；以 `npm test` 输出为准 |
| `:73` | `acceptance # 11 项` | 按 `scripts/acceptance.mjs` 的实际 `check` 数更新（当前 11） |
| `:101` | ADR「0001–0005」 | `0001–0006` |
| `:106-114` | 已定决策清单 | 加一条：宿主写回只写 argv 路径，见 ADR-0006 |
| `:124-131` | 下一步：行内 HTML、IME、`.md` 关联；末尾「之后是主题与自定义快捷键」 | 主题已完成；下一步改成「KaTeX 惰性 spike → 行内 HTML 渲染 → IME」；`.md` 关联仍待产品负责人定，且只能进「打开方式」 |
| 全文 | 没有快捷键清单，但 `CHANGELOG:10` 说「见 README 的快捷键段」 | 二选一：补一节快捷键表，或删掉 CHANGELOG 那句话 |

### AGENTS.md

| 位置 | 现状 | 必须改成 |
| :--- | :--- | :--- |
| `:38` | 「0.18.0 记 16 个文件、177 条」 | 0.19.0 的新文件/条数；或改成「以 `npm test` 输出为准」并只留当前数 |
| `:70` | 「当前 0.18.0」；功能清单没写写回 | 0.19.0；在「新建与另存为」段前加「双击/命令行打开 `.md` 可写回」 |
| `:72` | 「双击 `.md` 由宿主打开时显示只读横幅，只能另存为」 | 改成「双击/命令行打开 `.md` 可直接编辑，`Ctrl+S` 写回原文件；写回失败保留未保存标记」；未验列表加写回的真实场景 |
| `:72` | 未验清单没有写回 | 加「文件被占用/只读、网络盘、中文路径写回、真人双击」 |
| `:38`/`:72` | 「`.md` 关联」仍写在未验 | 保持；若本轮只做方案不做实现，明确写「未实现」 |

### 新 ADR-0006（建议文件名 `docs/adr/0006-argv-writeback.md`）

必须写清以下内容，否则实现者会漏掉 S1/S2：

1. **背景**：第 04 轮把 argv 文件设成只读，是为了避免「假写回」；第 06 轮补上宿主写回。
2. **决定**：宿主是唯一写者；页面只拿 `{v, writable, fileName}`，不拿完整路径；页面发 `save`，宿主回 `save-result`；只允许写启动/转发时记住的那一个路径。
3. **协议**：`hello`/`host-info` 用于转发后刷新信息（S2）；`save`/`save-result` 用 `id` 配对；版本 `v:1`；10 秒超时。
4. **写入**：同目录临时文件 + `File.Replace`；失败回退 copy；失败不动原文件；保留 UTF-8 BOM；按原文件 CRLF/LF；不做编码转换以外的规范化。
5. **生命周期**：新建、打开其他文件、另存为成功后清除 `writablePath`；单实例转发成功且用户确认脏改动后切换路径；冷启动有旧草稿时先备份/确认（S1）。
6. **不持久化 `readOnly`**：横幅状态从实时 host 信息派生；旧 localStorage 字段清理。
7. **边界与风险**：只覆盖 argv 一个文件；便携 zip 无宿主；拖放/文件夹打开仍走 FSA；文件锁、只读属性、ACL、符号链接、网络盘失败要给中文原因并保留 dirty；渲染进程被攻破时最多覆盖这一个文件。
8. **否决的替代方案**：把完整路径传给 JS；宿主把 FSA handle 传给页面；每次编辑自动写盘；用文件监视器代替 IPC；卸载器改 UserChoice。
9. **验收**：宿主冒烟（正常写、BOM、CRLF、路径不符拒绝、写入失败保留 dirty、转发后换路径）、`npm test`、真人双击（UNVERIFIED 时写清）。
10. **状态**：2026-11-15 接受；若实现改变协议，先改 ADR 再改代码。

## KaTeX spike 前置（第 07 轮可直接用）

### 基线（本轮实测）

| 项 | 字节 | 说明 |
| :--- | ---: | :--- |
| 首屏 JS `dist/assets/index-*.js` 原始 | 1,105,529 | 0.18.0 产物 |
| 首屏 JS gzip-9 | **339,751** | 331.8 KiB |
| 首屏 CSS gzip-9 | 13,184 | 含 KaTeX CSS |
| JS+CSS gzip-9 | 352,935 | |
| 无 KaTeX A/B：JS 原始 / gzip | 845,714 / **263,525** | 同一份源码，alias 到 stub；`npx vite build` 到 `.tmp` |
| 无 KaTeX A/B：CSS 原始 / gzip | 26,376 / **5,732** | 去掉 `katex.min.css` 的静态 import |
| 无 KaTeX A/B：JS+CSS gzip | **269,257** | |
| KaTeX 实际贡献（gzip） | JS 76,226 / CSS 7,452 / 合计 **83,678** | 339,751−263,525；13,184−5,732 |

A/B 是实打实的删包构建，不是按 `katex.min.js` 单独压缩估算：源码不动，把 `katex` alias 到 `.tmp/katex-stub.js`、把 `katex/dist/katex.min.css` alias 到空 CSS，构建到 `.tmp/build-nokatex`；同配置的基线也构建到 `.tmp/build-baseline`，两者入口哈希与 `dist` 一致。基线构建复现了 `dist` 的 `index-Cshe1Cx0.js` 与 `index-CfeOyNxQ.css`。

`src/App.tsx:12` 静态 import `Mathematics`；`src/lib/export.ts:1`、`src/components/PreviewPane.tsx:2`、`src/components/MathDraftPreview.tsx:2`、`src/components/MathInlineEditor.tsx:3` 各自静态 import `katex`；`src/main.tsx:6` 静态 import KaTeX CSS。`node_modules/@tiptap/extension-mathematics/dist/index.js:139,311` 调的是 **`katex.render`**（DOM 版），不只是 `renderToString`。alias 惰性 shim 必须同时伪装 `render` 与 `renderToString`，这是本轮最大的技术风险。

### 成功标准（必须可测）

1. **首屏指标先定义单位。** 实测无 KaTeX 下限：入口 JS gzip **263,525 B**，JS+CSS **269,257 B**。按 265 KiB（271,360 B）计，JS 余 7,835 B，合计只剩 2,103 B；按 265,000 B 计，JS 余 1,475 B，合计还差 4,257 B。建议口径写成「入口 JS gzip ≤265,000 B；JS+CSS ≤272,000 B 作守门」，两个数都留 1.5–2.7 KB 余量。若产品坚持「JS+CSS 合计 ≤265,000」，必须再找 ≥4.3 KB 的削减点，只拆 KaTeX 不够。
2. **A/B 构建**：用 `npx vite build --outDir .tmp/build-katex`（不跑 `npm run build`），入口 JS gzip 从 339,751 B 降到 ≤265,000 B（降幅 ≥74,751 B；实测可到 76,226 B）；入口 chunk 内不再出现 `katex`/`KaTeX` 符号，另生成独立的 math chunk。构建必须过 `scripts/vite-woff2-only.mjs`：它现在要求产物恰好 1 个 CSS 资产、16 个 face、裁掉 4 个 face（`:114-119`、`:141-143`）；KaTeX CSS 拆走后会直接报 `裁掉的 face 数为 0，期望 4`（本轮 stub 构建实际撞到）。插件要改成按 CSS 资产分别处理，不能靠放宽断言绕过。
3. **加载时机**：打开无公式文档时，首屏不请求 math chunk；打开有公式文档或点「公式」时按需加载。用 devtools/`PerformanceResourceTiming` 断言。
4. **公式功能不回归**：`src/lib/math.test.ts` 13/13；`export.test.ts` 的 MathML 用例通过；`scripts/acceptance.mjs` 第 3 项「公式渲染」与第 3b 项「字体已加载」通过（等待条件改成 `waitForSelector('.katex')`，不用固定 500 ms）；手工矩阵：`$x^2$` 打字、空行 `$$` 回车、行内/块级点开编辑、预览、源码往返、HTML 导出 MathML、纯文本导出 TeX、重载含公式文档。
5. **启动不倒退**：宿主 FCP ≤304 ms + 10%（≤334 ms）；首次打开含公式文档，公式在挂载后 ≤300 ms 内出现；不出现空白/闪烁超过 1 帧的占位。
6. **复杂度约束**：不新增运行时依赖；shim 与改动 ≤300 行、改动文件 ≤8 个；不改编辑器内核；`npm run roundtrip` 仍 3/7。
7. **体积不倒退**：安装包增量 ≤5 KB（惰性化不应改变总字节，只改变加载顺序）。

### Kill criteria（任一触发就停，记录原因）

- shim 无法保持 `katex.render` / `renderToString` 的同步语义；必须把 3 处以上调用改成异步，或加载后出现重复节点/占位残留。
- 为了达标必须在首屏前预加载 math chunk（那等于没有拆）。
- 入口 JS gzip >265,000 B（若采用 265 KiB 口径则 >271,360 B），或 JS+CSS >272,000 B。
- `scripts/vite-woff2-only.mjs` 不能在拆出多个 CSS 资产后继续保证「16 face、裁 4、只留 woff2」，且改动超过 1 小时。
- `math.test`、`export.test` 或 acceptance 的公式/字体项失败，且两次修复内不能恢复。
- 首次公式渲染 >300 ms、FCP 回退 >10%，或出现可见闪烁。
- 需要新运行时依赖、改 Tiptap 内核、或改动超过 300 行/8 个文件。
- 导出 HTML 的 MathML 保真退化（`export.test.ts` 的 `.katex`/`<math>` 断言变红）。

### 测试影响（planner 直接排）

- `src/lib/math.test.ts`（13 条）：纯函数 `protectMathPairs`/`repairMath`，理论上不受影响；若 shim 有纯逻辑（如「文档是否含公式」），加 2–3 条单测；DOM 行为不要塞进 node test。
- `scripts/vite-woff2-only.mjs`：拆 KaTeX CSS 会打破「恰好 1 个 CSS 资产 + 16 face + 裁 4」三个断言（`:114-119`、`:141-143`）。必须改成按资产处理，或在 KaTeX 自己的 CSS chunk 上单独跑；这是构建门禁改动，不是可选项。`vite.config.ts:26-33` 的注释与 `chunkSizeWarningLimit` 也要复核。
- `src/lib/export.test.ts`：MathML 输出断言是硬门槛。若导出路径改成 `await loadKatex()`，测试要改成 async，且 `src/App.tsx` 的导出调用点（`:46` 引入 `buildHtmlDocument`）要跟着改；这是本轮最容易被低估的改动面。
- `scripts/acceptance.mjs`：第 3 项固定 `waitForTimeout(500)` 要换成显式等待；第 3b 项按 5173/4173 区分字体 face 数的逻辑要复核（CSS 若拆成 math chunk，preview 下 face 数可能变）；`check` 数从 11 起算，若加首屏体积断言变 12。
- 新增 `scripts/size-check.mjs`：读 `dist/assets/index-*.js` 与 CSS，gzip 后断言 ≤阈值；建议挂进 `npm run acceptance` 或 CI，否则下一轮会回退。
- `host/fcp-probe.mjs`：需要真实 `host/bin/www`；本轮若只改 `dist` 不重编宿主，probe 仍测旧产物。planner 要安排「根代理最终 build → 重编宿主 → probe」的顺序。
- 文档：成功后 README `:53`「为什么不拆 KaTeX」改成「怎么拆、怎么验」；若 kill，把结论写进 README/ADR，别只留在 round 报告。

## shots 清理

### 现状

- 全仓文本扫描（174 个文本文件，排除 `.git`/`node_modules`/`release`/`.tmp`/`shots`）后，历史部分零引用 **30 个 / 2,007,292 B**，全部在 `shots/round-05`。加上本轮临时图共 36 个 / 2,275,457 B；临时图不列入清理。
- `shots` 共 **231 个 / 17,201,003 B**；`round-05` 50 个 / 3,561,174 B。214 个已跟踪，17 个本轮新图未跟踪。
- STATE `:73` 的 43 / 3.1 MB、164 / 12.2 MB 都已过期。

### 执行步骤（本轮不做）

1. 重新生成清单，不照 STATE 的数字：

   ```powershell
   cd D:\Documents\SidelightProgram
   $root = (Get-Location).Path
   $files = Get-ChildItem shots -Recurse -File | Where-Object { $_.Directory.Name -ne 'round-06' }
   $docs = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
     $_.FullName -notmatch '\\(\.git|node_modules|shots|release|\.tmp)\\'
   }
   $text = ($docs | ForEach-Object { Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue }) -join "`n"
   $zero = $files | Where-Object { $text -notmatch [regex]::Escape($_.Name) }
   $zero | Select-Object @{ n = 'Path'; e = { $_.FullName.Substring($root.Length + 1) } }, Length |
     Sort-Object Length -Descending | Export-Csv .tmp\shots-zero.csv -NoTypeInformation -Encoding UTF8
   ```

2. 逐个人工抽查 2–3 个文件，确认它们不是被「目录名 + 序号」间接引用，也没有被外部 issue/PR 引用。
3. 记录清单与当前 HEAD 到 `docs/iteration/round-05/impl.md` 或 STATE 的决策记录；写明「删除后可用 `git show <commit>:path` 恢复」。
4. 如果目标是工作区/zip 变小，执行删除并单独提交：

   ```powershell
   $paths = (Import-Csv .tmp\shots-zero.csv).Path
   git rm -- $paths
   git commit -m "chore(shots): drop unreferenced round-05 screenshots"
   ```

5. 删除后复测：`Get-ChildItem shots -Recurse -File | Measure-Object Length -Sum`，应约 184 个 / 14.38 MB；更新 STATE `:73`。
6. 如果是「保留证据」优先：不要删，改为在 `shots/round-05/INDEX.md` 给每个文件一行说明，让它们变成有引用。代价是仓库不变小，但证据可追溯。

### 风险

- 文件名匹配会漏掉「只写路径不写文件名」的引用，也会误伤被外部链接引用的图。删前抽 2–3 个确认。
- 删除不会缩小 `.git` 历史，只缩小工作区与源码 zip。要缩小 clone 体积必须重写历史（`filter-repo`），这不在本轮范围，也会破坏 commit 哈希。
- `shots/acceptance.png` 每轮被覆盖（`2b031e8` 里它从 60,149 B 变 60,082 B）。二进制反复改会持续增历史。以后每轮证据写 `shots/round-NN/`，不要覆盖根目录的 `acceptance.png`。
- 本轮 builder 还会新增截图，执行前必须重跑清单。

## 优化机会（最多 3 条）

1. **宿主注入脚本与写回逻辑合并**：`Program.cs:581-606` 既写 localStorage 又写死 `readOnly:true`，与 S2 同源。改成一份 `HostInfoScript` + `hello/host-info`，删除重复的 JSON 拼接与 `readOnly` 字段，可同时修 S2、减代码。
2. **CSS 字号变量**：`src/styles.css` 有 77 处 `font-size`，其中 15 处是 11/11.5px，0 个字号变量。收敛成 12/13/14 三档变量，能减少漂移，也略减 CSS 字节；和 0.18.0 的「小字统一 12px」目标一致。
3. **截图二进制翻新成本**：根目录 `acceptance.png` 每轮覆盖，`shots` 已 16.4 MB。把生成图固定写 `shots/round-NN/`，根目录只留一张稳定封面；可避免历史里同一文件反复变大。

## 未验证与限制

- 没跑应用、CDP、安装器；界面行为均来自代码与文档，不是实测。
- 体积增量是 `.tmp` 原型编译 + Python LZMA 估算，不是 NSIS 产物；最终以 releaser 实测为准。
- 关联方案没有编译验证；NSIS `Section /o` 的行为来自官方参考，注册表写入未在本机执行（只读查看）。
- KaTeX A/B 是用 alias stub 构建的，故意不含 `woff2Only` 插件（该插件在无 KaTeX face 时会直接失败）；269,257 B 是「KaTeX 全拆」的下限。真实惰性实现还要拆 CSS chunk、改插件，首屏可能多 0.5–2 KB，仍应以真 A/B 为准。
- UserChoice 的 Hash/UCPD 结论来自 Windows 公开行为与引用资料；未在本机尝试写入，也不应尝试。
- `npm test` 已重跑：16 个文件、177 条、fail 0。
