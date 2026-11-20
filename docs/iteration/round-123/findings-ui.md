# 第 123 轮 界面与可访问性复查（finder-ui）

前置：dev 5175、ego CDP 57270、1440×900 + 1024×700；轮前 `dcc31f1`（= HEAD）；只读。探针 `.tmp/r123-finder-ui*.mjs` → `.tmp/r123-finder-ui{,2,3}.json`、`.tmp/r123-finder-ui{6,9,10}.log`；0 pageerror。本轮 **0 条新 P0/P1、3 条新 P2**；B-229、B-253 与「已修」清单不重复。

## F1（P2，可访问性）窄窗抽屉不困焦点：Tab 4 次即走出抽屉，Enter 打开的「字数明细」还在背板下

复现（1024×700，`-ui10.mjs`）：点顶栏「侧灯」开抽屉（焦点自动落 `.rail-close`），Tab×4 焦点序 `.rail-close → .rail-diff-open → .rail-review-open → #rail-tab-notes → .stats-trigger`；第 4 次已在抽屉外，`.stats-trigger` 中心 `elementFromPoint` 命中 `DIV.rail-backdrop`（背板 z **44**、抽屉 z **45**）。抽屉无 `role`/`aria-modal`，`[inert]` 0（`-ui2.json` 的 `ariaModal:null`）。

后果（`-ui6.log`）：焦点在 `.stats-trigger` 按 `Enter`，约 900 ms 后字数面板打开、抽屉不关（`## +920`：`stats:true`）；面板 `zIndex:40`（`src/components/StatsDetail.tsx:22`）在背板 44 之下 → 面板发灰，点它命中背板先关抽屉（`-ui7.log` 的 `## afterPanelClick`：`railOpen:false`）。

本条与 B-253（确认框被抽屉盖住）不同因：键盘从抽屉走到被压暗的控件并激活了背板下的面板。修法：抽屉打开时给主区 `inert`（或 `aria-modal` + 焦点环回），或 `.stats-detail`/`.overlay` 的 z 提到 46。顺带：`.rail-close` 的 `aria-label` 是「关闭批注」（`MarginRail.tsx:432`），在「对话」页签也这么念。

证据：`src/styles.css:3706-3714`、`src/App.tsx:6212`；`shots/round-123/drawer-enter-stats.png`（面板在背板下发灰）。

## F2（P2，触达）设置面板两个文本链钮 19 px 高，低于 24×24 口径

1440×900 开设置实测：`全部恢复默认` **69×19**、`恢复默认` **46×19**（`-ui3.json`；同次全应用扫描其余 0 条）。源：`src/styles.css:3400-3407` 的 `.dialog-inline button{padding:2px 0;font-size:11.5px}` 无 `min-height`；两钮在 `src/components/SettingsDialog.tsx:212-221`、`:309-313`。`touchTargets.test.ts` 的 5 个选择器不含 `.dialog-inline button`；同类 B-110 / B-236 / B-251 都按 24 补过。修法：该规则加 `min-height:24px` + 补一条静态门。

## F3（P2，外观/可读）批注卡两个下拉没有可见标签，紧急度默认只显示 `-`

模拟批注 3 卡实测（1440×900）：每卡 `.note-priority` **70×24**、默认 `-`（选项 `-|Low|Medium|High|Urgent`），`.note-status` **86×24**、默认 `Open`（`Open|In progress|Resolved|Won't fix`）；卡头只有「评价/修订 模拟」徽标，没有「紧急度 / 状态」字样，`aria-label` 只在读屏可及。英文串是队列原文（规格内），但单个 `-` 看不出是「紧急度」。修法：两枚 select 前加可见小标签，或默认项 `-` → `无`。

证据：`-ui.json` 的 `notesGeometry`；`shots/round-123/note-long-token.png`；`src/components/MarginRail.tsx:558`、`:575`。

## 复查未发现新问题的面

- 三主题对比度全量扫描（`.margin-rail *`，对话开着）：light / dark / sepia 全 **0** 条失败。
- 长不可断串：对话用户气泡 320 px、`overflow-wrap:anywhere`、`scrollWidth=clientWidth=320`；`.margin-rail`/`.doc-scroll`/`body` 横溢 0；批注卡 `scrollWidth=clientWidth=316`、两 select 与动作钮均 24 高；`.rail-diff-rows` `tabIndex=0`。
- 全应用可点扫描（默认/查找/字数/文件菜单/设置）除 F2 外 **0** 条 <24。在审空态与 `aria-current` 正常；抽屉 Esc / 背板 / × 三路关闭且焦点回 `.rail-toggle`。

UNVERIFIED：真 WebView2 宿主、真实中文 IME、原生打印；有工作区时的「在审」行与「修订快照」段（无假 FSA）。`-ui4`/`-ui7` 中途出现的「在审」sheet 属共用 CDP 的外部污染，`-ui9`/`-ui10` 未复现，不入结论。

`actionable_count`: 0（无 P0/P1）。`p0p1_count`: 0。
