# 第 19 轮 · 读者诚实性发现（finder）

- 快照：2026-11-16 09:41–10:10（Asia/Shanghai）。仓库 `D:\Documents\SidelightProgram`，读时 `package.json` 已到 **0.30.2**；CHANGELOG 已有 0.30.2 节；README 仍是 0.30.1 文案；`src/App.tsx` 在侦察期间被另一个子代理改动（行号会漂）。
- 只读侦察。写了本文件与 `.tmp/r19-reader/evidence.md`，未改任何产品/文档文件。
- 一手材料：README、CHANGELOG、AGENTS.md §6、PRIVACY、SECURITY、CONTRIBUTING、`scripts/release-notes.mjs`、v0.30.1 Release body（GitHub API `releases/446506849`）、第 17 轮 impl-a/test/findings-ship、`dist/` 实测、GitHub labels API。

## 结论

体积/性能数字里，**284,730 B、213,664 B 与三个安装包尺寸今天核对一致**；1078 ms / 4.47 ms 不可复现，且 4.47 在 0.30.2 的更正文案里仍被当作「波动下界」。v0.30.1 Release body 把「未签名/未公证」写清了，但**没有**写 100 KB/1 MB 未测、也没有写延后项，因为生成脚本只取 CHANGELOG 前 6 条。SECURITY.md 的唯一漏洞渠道按字面**做不通**：外部报告者不能打标签，仓库也没有 `security` 标签。

| 级别 | 发现 | 影响 |
| :--- | :--- | :--- |
| V1 | SECURITY 状态 B 渠道不可执行，且没有隐私联系渠道 | 漏洞/隐私问题无处私下报，可能被公开贴出 |
| V2 | README 写 6 MB 上限与「文件过大…（上限 6 MB）」，代码是 5.5 MiB、文案是「文件太大」 | 用户被拒时对不上说明，5.2–6 MB 范围被说成验过 |
| V3 | Release body 截断丢「未测/延后」；0.30.2 更正仍含未复现的 4.47 且缺口径 | 发布页是用户真正读的页，未测信息只在 README 深处 |
| V4 | FCP 单值、PRIVACY 草稿位置、77 KB/883 KB、ADR-/P2/B4 术语、ad-hoc 措辞 | 小偏差，累积后让数字与术语不可核对 |

---

## V1 SECURITY 的漏洞报告渠道按文档做不通；隐私问题没有渠道

**证据**

- `SECURITY.md:17-21`：状态 B（当前，`enabled=false`）要求「先开一个 Issue，**加上 `security` 标签**，标题写「需要私下报告渠道」，正文只写一句话」。
- `.github/ISSUE_TEMPLATE/config.yml:2`：`blank_issues_enabled: false`。报告者只能选 `bug.yml` 或 `feature.yml`，不能开空白 Issue。
- `bug.yml:3`：模板自带 `labels: [bug]`；`:45-54` 把「复现步骤」设为必填。报告者无法在表单里加 `security` 标签。
- 2026-11-16 查 `https://api.github.com/repos/XuJingye2022/SideLight/labels`：只有 10 个 GitHub 默认标签（bug、documentation、enhancement…），**没有 `security`**。外部报告者也没有打标签权限（需要 triage 及以上）。
- `.github/ISSUE_TEMPLATE/config.yml:5-10`：指向 `/security/advisories/new` 的入口仍是注释；`SECURITY.md:12-15` 的状态 A 因此用不了。
- `SECURITY.md:21` 明确「没有公开的安全邮箱」；`PRIVACY.md:44` 联系方式「待产品负责人确认」；CONTRIBUTING 全文没有提问/联系入口。结果是：**当前没有任何可用的私下报告路径**。

**影响**：发现漏洞的人按文档操作会卡在「加标签」这一步；他要么放弃，要么把细节写进公开 Issue。这是文档承诺与仓库设置不一致，不是措辞问题。

**改法**（本轮可做，不需要改 GitHub 设置）

1. `SECURITY.md:19` 改为：

   > 不要在公开 Issue 里写漏洞细节。选「缺陷报告」模板，**标题以 `[security]` 开头**，正文只写「我有一个安全问题，需要私下渠道」。**不要尝试添加标签**（报告者没有打标签权限，仓库当前也没有 `security` 标签）；维护者看到标题后会建标签、开私有通道或另约方式。

2. 在 `.github/ISSUE_TEMPLATE/` 增加 `security-contact.yml`：只有一个可选 textarea（label「只写需要私下渠道，不要写细节」），标题前缀 `[security]`，`labels: []`。这样不必占用缺陷模板的必填项。
3. 「开启 Private vulnerability reporting」写进 20 轮待办，标注**需要仓库管理员在网页设置**，agent 不做；开启后同步改 `SECURITY.md:12-21` 为单态、取消 `config.yml:5-10` 的注释。
4. `PRIVACY.md` 第 3 节第 8 条旁加一行临时渠道（不是承诺）：

   > 确认前如需询问数据处理，用 GitHub Issue（公开）：只写问题，不要贴正文、路径、Key 或任何个人信息。

---

## V2 README 的文件上限与错误文案都是旧的（6 MB vs 5.5 MiB）

**证据**

- `README.md:74`：「写回只在 UTF-8 / UTF-16LE / GBK 与 **6 MB** 以内文件上验过；超过 **6 MB** 显示「**文件过大**，暂不支持（上限 **6 MB**）」并清空正文」。
- `src/lib/workspace.ts:234`：`MAX_DOC_BYTES = 5 * 1024 * 1024 + 512 * 1024`（5,767,168 B = 5.5 MiB）；`:243` 的文案是「**文件太大**，暂不支持（上限 **5.5 MiB**）。」。
- `docs/CHANGELOG.md:21`（0.30.1）已写「文件上限下沉到 `readNode`（5.5 MiB）：6.1 MiB 拒绝，5.2 MiB 允许」；第 17 轮验收 `docs/iteration/round-17/test.md:28-30` 也是 5.2 MiB 通过、6.1 MiB 拒绝。
- `docs/CHANGELOG.md:180` 的 6 MB 是 0.18 前后历史条目，可以保留；README 是现状说明，不能留。

**影响**：三处不一致。用户拿 5.6 MB 的文件会看到 README 没写的拒绝；README 引用的错误文案在界面上根本不存在；「6 MB 以内验过」把只验到 5.2 MiB 的范围说大了。

**改法**（`README.md:74` 整句替换）

> 写回只在 UTF-8 / UTF-16LE / GBK 与 **5.5 MiB（5,767,168 B）**以内的文件上验过；超过上限显示「文件太大，暂不支持（上限 5.5 MiB）。」并清空正文。已验：5.2 MiB 可打开、6.1 MiB 被拒；未验：5.2–5.5 MiB 边界、文件被占用、网络盘、中文长路径、真人双击下的保存对话框与写回。

---

## V3 Release 页丢掉「未测/延后」；0.30.2 的更正仍把 4.47 当可复现值

### V3a 生成脚本只取前 6 条 CHANGELOG

- `scripts/release-notes.mjs:20-32`：`changelogSection()` 先 `filter(line.startsWith('- '))`，再 `.slice(0, 6)`。
- v0.30.1 的 0.30.1 节一共 12 条，性能（「载入 1078/4.47、100 KB 与 1 MB 未测」）排第 8 条，延后（「memo 化、B4/B5、2 MB 进度条」）排第 9 条（现 `docs/CHANGELOG.md:26-27`）。前 6 条里两类都没有，于是被截掉。
- 实际 Release body（API `releases/446506849`）核对：有「**未签名、未公证**（ad-hoc 签名）」（首行与「已知限制」各一次）；**没有**「100 KB/1 MB 未测」，**没有** P2 延后项，**没有** 1078/4.47。它只写「详见 README 的『现在不能做什么』」。
- 0.30.2 的 CHANGELOG 目前 5 条（`docs/CHANGELOG.md:9-13`），都会进 body；但脚本行为不改，下一轮还会漏。

**影响**：Release 页是用户和媒体实际读的页。签名状态写清了（这点达标），但「哪些没测」和「哪些延后」被结构性省略；愿意点进 README 的人才能看到。

**改法**：`release-notes.mjs` 在「本次更新」后加固定一节，不参与截断：

```js
const caveats = changelogSectionAll().filter((l) => /未测|未验|延后|不可复现/.test(l))
// 渲染为 '## 未测与延后'，无匹配时写 '本轮没有新增未测项；历史未验项见 README。'
```

同时把 `:30` 的 `.slice(0, 6)` 放宽到 8，或只对「修复/新增」计数。0.30.2 发布后要按 API 复核 body 含「性能数字更正」与「不升 1.0 的理由」两段。

### V3b 更正后的数字仍有不可复现项与缺口径

- `docs/CHANGELOG.md:26`（0.30.1 节，已被改为）：「**仅 10 KB 冒烟，重复测量波动 4.47–6.77 ms，未达稳定**」。
- `docs/CHANGELOG.md:10`（0.30.2 节）：「tester 复跑落在 5.0056–6.7697 ms / 910 ms；统一改为「…波动 4.47–6.77 ms…」」。
- 原始记录：`docs/iteration/round-17/impl-a.md:36` 写 T4「UNVERIFIED…无法给可信数字」；`docs/iteration/round-17/test.md:34` 两次复跑是 **p95 5.0056 / 6.7697 ms、载入 910 / 906 ms**，并明确「两次均达不到 4.47」。
- 也就是说 4.47 是发布前一次运行的值，没有日志留在 `.tmp/`（全仓 `.tmp` 搜不到 4.47 与 1078 的来源行），复跑没重现。把它写成「波动 4.47–6.77」等于把未复现值当成了区间的可信下界。

**影响**：这是本轮要修的核心诚实性问题，但修完仍留一个可被追问的点；而且「ms」没说是**每键输入 p95** 还是载入，载入 906–910 ms 从 CHANGELOG 里消失了。

**改法**（0.30.1 与 0.30.2 两节统一成同一句，并保留「更正」痕迹）

> 性能：只跑了 10 KB 文档冒烟。每键输入 p95 两次复跑为 **5.01 ms 与 6.77 ms**，载入 906–910 ms；0.30.1 曾记 4.47 ms，**复跑未重现，不作为基线**。100 KB 与 1 MB **未测**（perf 脚本在 1 MB 挂起），不得引用为验收数字。

0.30.2 的条目再加一句「本条更正 0.30.1 已发布数字；Release 页同步说明」。不要只悄悄改历史节，否则 tag `v0.30.1` 里的 CHANGELOG 与 `main` 对不上，读者无法判断哪个是原记录。

---

## V4 其余数字、位置与术语（按读者可见度排序）

1. **FCP 单值且已过期**。`README.md:105`「首屏 FCP 304 ms、转发 reload 52–64 ms」。第 17 轮 `docs/iteration/round-17/findings-ship.md:183` 记最近实测 **208 ms**（`.tmp/r15-fcp.log`），并指出 README 304 / ADR-0005 296 三者不一致。改法：写「本机三次独立测量 208–304 ms（不同构建），未在低配机与真机安装环境验证」；首次出现写「首次内容绘制（FCP）」。
2. **PRIVACY 的草稿位置漏了「打开文件夹」分支**。`PRIVACY.md:13` 只写「文档同目录 `.sidelight/drafts/`」；`README.md:59` 写明「打开文件夹时在工作区根目录」。用户按 PRIVACY 去文档旁边删，删不到。改法：表格该格加「打开文件夹时写工作区根目录 `.sidelight/drafts/`」。同一错误在 v0.30.1 Release body 的「数据与卸载」节（「草稿、批注、trash：文档同目录」），`release-notes.mjs:113-115` 要一起改。
3. **PRIVACY 的「保存成功后自动删」要先拿到证据**。`PRIVACY.md:13` 这句在 0.30.1 实测为假（`docs/iteration/round-17/test.md:20-24`，draft 57/58，缺 `draft-clear`）。0.30.2 的修复点在宿主的 `hostSaveSuccess`（`src/App.tsx` 的 `void clearHostDraft()`，行号在改，按函数名找）；发布前必须由 tester 复跑 `draft-acceptance` 到 58/58，并在报告里写「宿主路径 + 浏览器句柄路径各验一次」。没拿到就保持「0.30.2 起保存成功后会删」并标未验范围。
4. **KaTeX chunk 的 77 KB 说小了**。`README.md:94`「JS/CSS 拆成独立 chunk（gzip 约 77 KB）」。今天实测 `dist`：KaTeX JS gzip **76,553 B**、CSS gzip **7,365 B**，合计 **83,918 B（约 84 KB）**。77 KB 只等于 JS。改法：写「gzip 约 84 KB（JS 76.6 KB + CSS 7.4 KB）」。
5. **主 chunk 883 KB 与实测差 5 KB**。`README.md:96`「主 chunk 约 883 KB」；今天 `dist/assets/index-*.js` 为 887,896 B（约 888 KB）。改「约 888 KB」，或改成「主 chunk 未拆，仍在 900 KB 以内」。
6. **术语混用**。`README.md:161-177` 同一列表里「ADR 0001」「ADR-0004」「[ADR-0006]」三种写法；`README.md:65` 对读者使用内部代号「P2 延后项」「B4/B5」；`README.md:74` 用 MB、`CHANGELOG.md:21` 用 MiB；`README.md:23` 与 Release body 写「未签名、未公证（ad-hoc）」自相矛盾。统一为：`ADR-0001`；「本轮推迟：保存与刷新并发、保存撞刷新、2 MB 载入进度条」；容量统一 MiB（1 处例外说明）；签名写「**未用 Developer ID 签名、未公证**（只有 ad-hoc 签名）」。
7. **工程内部语气进了下载路径**。`README.md:94`「内部预算 820,000 B（硬线 850,000 B 未调）」、`:105`「首屏 FCP 304 ms」对下载的人没有用；第 18 轮 `docs/iteration/round-18/findings-reader.md:203` 已提过。建议把安装包预算/硬线移到 `docs/` 或 `packaging/README.md`，README 只留「安装包小于 1 MB」。
8. **模板里的版本占位过期**。`.github/ISSUE_TEMPLATE/bug.yml:16` `placeholder: 0.30.0`。改 `0.30.2`，以后随版本改；或写「见 Release 页」。

---

## 任务 2 对照：三项事实在 README 与 Release body 的落点

| 事实 | README | v0.30.1 Release body | 判定 |
| :--- | :--- | :--- | :--- |
| 未签名、未公证 | `README.md:16-23`（macOS 首次打开）、`:66`（Windows 无签名） | 首行「**未签名、未公证**（ad-hoc 签名）」+「已知限制」第一条 | **已写清**（除 ad-hoc 措辞矛盾，见 V4-6） |
| 100 KB / 1 MB 未测 | `README.md:65`（「100 KB 与 1 MB 载入未测，perf 脚本在 1 MB 挂起」） | **没有**；只链到 README | **Release 缺**（V3a） |
| P2 延后 | `README.md:65`（P2 三项 + memo/B4/B5/2 MB 进度条） | **没有**（CHANGELOG 第 8 条被截断） | **Release 缺**（V3a） |

## 任务 3：0.30.2 升级说明该写什么

用户动作只有两件，其余是实现变更。建议 Release body 的「本次更新」保留 CHANGELOG 三条，并加一节「升级须知」：

1. **Windows**：下载 `Sidelight-0.30.2-win-x64-setup.exe` 覆盖安装，数据保留；SmartScreen 仍会拦一次（无代码签名）。
2. **macOS**：下载 `Sidelight-0.30.2-macos-universal.zip`，**每次更新后重做首次打开步骤**（`README.md:16-19`）；仍是 ad-hoc，未用 Developer ID 签名，未公证。
3. **草稿清理（行为变化）**：0.30.2 起，保存成功后删除该文档的 `.sidelight/drafts/<key>.md`。0.30.1 因漏发 `draft-clear` 可能留下**含文档正文的旧草稿文件**；升级不会自动清历史文件，打开该文档再保存一次即可清掉，或手动删 `.sidelight/drafts/`。介意磁盘残留的人建议手动清一次（这也是隐私说明里「保存成功后自动删」的补证）。
4. **数字更正**：0.30.1 CHANGELOG 里的 1078 ms / 4.47 ms 不可复现，0.30.2 已改为冒烟区间并标未测；如果引用过旧数字，请改用 0.30.2 的说法。这一条**不需要用户做任何操作**。
5. **不升 1.0 的原因**保留一句：macOS 真机、签名/公证、Intel 运行、100 KB–1 MB 性能、隐私声明确认都未完成。

不建议在 Release body 写「隐私声明待产品负责人确认」——用户不知道谁是产品负责人；改成「隐私说明仍是草案，确认前不作为承诺」（`PRIVACY.md:1` 的既有口径）。

## 任务 4：PRIVACY 醒目度与 SECURITY 可用性

- 醒目度**达标**：`PRIVACY.md:1` 是加粗首行「草案。待产品负责人确认；确认前不得作为对外承诺。」，标题也是「隐私说明（草案）」；`README.md:80` 与 `:191` 两处都标了草案。§3 八条承诺逐条带「待确认」，第 5 节写明确认后才去掉标记。没有把草案说成已生效。
- 缺的是**渠道与位置**：无联系方式（V1），草稿位置漏工作区分支（V4-2）。另建议在 `PRIVACY.md` 开头加一句「本文件不是法律文件；事实表按代码写，承诺句未生效」，避免读者把事实表当承诺。
- SECURITY 的其余部分**可用**：支持的版本、两态说明、报告应写什么、范围、信任边界、密钥边界、日志脱敏都具体；响应时限与披露窗口诚实地写「待确认」。唯一阻断是状态 B 的操作步骤（V1）。

## 任务 1：性能数字清单（file:line + 可复现性）

| 数字 | 位置 | 今天能否复现 | 处理 |
| :--- | :--- | :--- | :--- |
| 首屏 gzip **284,730 B** | `README.md:94`、`:96`、`AGENTS.md` §6、`CHANGELOG.md:12`（0.30.2） | **能**。今天用 `dist` 复算：主 JS gzip 278,000 + CSS gzip 6,730 = 284,730 | 保留；0.30.2 重新构建后重跑 `measure --max 285000` 再写 |
| KaTeX 字体 **213,664 B / 15 个** | `README.md:94` | **能**。`dist/assets/*.woff2` 15 个、合计 213,664 B | 保留 |
| KaTeX chunk **约 77 KB** | `README.md:94` | **不能**（JS 76,553 + CSS 7,365 = 83,918 B） | 改约 84 KB（V4-4） |
| 主 chunk **约 883 KB** | `README.md:96` | 近似（实测 887,896 B ≈ 888 KB） | 改 888 KB 或删除（V4-5） |
| 宿主 **FCP 304 ms** | `README.md:105` | **不能作为单值**：另有 208 ms 实测、ADR 296 ms | 改区间 + 环境 + 日期（V4-1） |
| 转发 reload **52–64 ms** | `README.md:105` | 未复测（第 17 轮无该探针） | 标「一次测量」或删除 |
| **载入 1078 ms、p95 4.47 ms** | 原 0.30.1 第 8 条（现 `CHANGELOG.md:26`）、`CHANGELOG.md:10` | **不能**：复跑 906/910 ms、5.0056/6.7697 ms；4.47 无日志 | 按 V3b 改；不要只把 1078 删掉 |
| **10 KB 冒烟** | `CHANGELOG.md:26`、`README.md:65` | 口径「10 KB 文档」能复现；但没写测的是每键 p95 | 加「每键输入 p95」与载入值（V3b） |
| 100 KB **245 ms / 1 MB 挂起** | 只在 `docs/iteration/round-17/test.md:35` | 不可信/未测 | 不对外；README 已写未测，保持 |
| 安装包 **818,553 B / 902,786 B / 890,510 B** | Release v0.30.1 资产 | 能（API `size` 字段一致） | 0.30.2 出包后回填，不手写 |

> 结论：**不可复现的是 1078 ms 与 4.47 ms**（以及可选的 304 ms 单值、52–64 ms）；**没标「未测」的**只有 0.30.1 已发布的旧 CHANGELOG 条目（0.30.2 节已补）。0.30.2 的更正文字还差口径与 4.47 的复现标注。

## 发布前检查表（读者视角）

- [ ] `package.json`、README 下载/依赖段、AGENTS.md §6、CHANGELOG 顶部四处都是 0.30.2；README 里两处 `SHA256SUMS-0.30.1.txt` 改 0.30.2。
- [ ] `measure --max 285000` 重跑，README/CHANGELOG 写新构建的实测值，不沿用 284,730。
- [ ] v0.30.2 Release body 里能看到：签名状态、100 KB/1 MB 未测、延后项、草稿清理、数字更正、不升 1.0 一句。
- [ ] `draft-acceptance` 复跑到 58/58（宿主 + 浏览器各一次），否则 PRIVACY 的「保存成功后自动删」仍算未证。
- [ ] SECURITY 状态 B 的步骤改成可执行（标题前缀，不打标签）；`security` 标签或专用模板至少有一个。
- [ ] README 6 MB 三处改为 5.5 MiB + 实际文案。
- [ ] 全仓 `grep -n "1078\|4\.47\|6 MB\|文件过大"` 只剩历史条目与「未复现」标注。
- [ ] Release body 与 README 的 macOS 首次打开步骤逐字一致（两处都要求每次更新重做）。

## 未做 / 未验证

- 没有读 `docs/adr/0005`（FCP 296 ms 的出处），只按第 17 轮 findings-ship 的转述引用。
- 没有复跑 `perf-longdoc.mjs` 或 `measure`；284,730 是用 `dist` 现有文件复算，不是重新构建。
- 没有登录 GitHub 验证私有漏洞报告的真实开关状态；按 `SECURITY.md:17` 与 `config.yml:5-10` 的注释判为关闭，证据是二手的。
- `src/App.tsx` 在侦察期间被并发修改，宿主草稿清理的结论按函数名（`hostSaveSuccess` 内的 `clearHostDraft`）与 `host/Program.cs` 的 `draft-clear` 分支读得；发布前以 tester 的脚本输出为准。
- 未截图（本轮无界面变化）；证据数字见 `.tmp/r19-reader/evidence.md`。
