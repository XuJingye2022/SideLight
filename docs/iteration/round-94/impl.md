# 第 94 轮 impl（executor）· 右侧双页签：对话 / 批注（B-221）

轮前 `1e99d82`。A1/A2 完成，回滚 0；未 commit/push、未动 `release/`，版本 0.32.1。

## A1 tablist + 对话占位 + 批注面板收口（DONE）

- `MarginRail.tsx`：新 props `railTab`/`onTabChange`；`.rail-head` 后插 `.rail-tabs[role=tablist]` + 两个 `button[role=tab]`（`id=rail-tab-<tab>`、`aria-selected`/`aria-controls`、roving `tabIndex`、`is-active`；←/→/Home/End 切页签 + rAF 聚焦）。原批注内容包进 `#rail-panel-notes[role=tabpanel]`，`hidden` 控显隐，不加 `position`/`overflow`（卡仍绝对定位、整体评价仍 sticky）；新增 `#rail-panel-chat[role=tabpanel]`：空态 + `.rail-chat-compose`（input/发送钮 disabled）。`aside` 标签改中性的「侧灯」（P2-3）。
- `App.tsx`：`railTab` state（默认 `notes`）；布局 effect 的 `flowBottom`/`tops`/`railSpace` 只在 notes 面板可见时算，chrome 底 = `max(.rail-head 底, .rail-tabs 底)` 再扫 `panel.children`（跳卡/整体评价/spacer）；`top` 删硬底 40 → `max(natural, floor+12)`；气泡段留 guard 外；dep 加 `railTab`。
- `.tmp/e2e-r94-a1-rail-tabs.mjs`（ego CDP 57270，1440×900）**38/38 PASS**（`.tmp/r94-a1-rail-tabs.json`）：2 页签/默认「批注」/chat `hidden`/roving `-1,0`；四键换选焦点跟、面板同步；对话 input 1 + button 1 都 disabled、Tab ×4 不落进；3 卡 top 135/293/469 逐项 = `max(natural, 上卡底+12)`、首卡 ≥ 页签底+2、中心 `elementFromPoint` 命中；往返首卡 135→135、`scrollHeight/scrollTop` 不变；末卡底 615 ≤ 整体评价顶 627；自然位分支 237 = natural 237 且 `natural − flowBottom` 114 ≥ 40；场景 B 三提示全 0、卡 1、首卡 70 = flowBottom 58+12（natural 4）；0 pageerror。截图 `shots/round-94/rail-tabs-notes.png`。
- 静态：`role="tablist"` = 1；`railTab|rail-panel-notes|rail-panel-chat` 17 行（≥6）。

## A2 列宽 320px + 页签 / 对话样式（DONE）

- `styles.css`：`.doc-layout` `260px → 320px`（该块 260px 1→0、全文件 0）；`.rail-empty-sub` 后 8 条：`.rail-tabs`（flex/gap 2/margin/底边）、`.rail-tabs button`（flex 1/5px 8px/上圆角/`--text-xs`）、`.is-active`（`--paper-raised` + `inset 0 -2px 0 var(--accent)`）、`.rail-chat-empty`/`-hint`/`-compose` + input/button。≤1119px 抽屉未动。
- `.tmp/r94-a2-css.mjs` **13/13**（对照用 `git show HEAD:src/styles.css > .tmp/r94-styles-head.css`，node 不能 spawn git）；`.tmp/e2e-r94-a2-width.mjs` **10/10**：1440 栏 320.0、scroll 1222 无横溢、钮 159×28、列 576；1120 栏 320.0、902、列 490；1024 栏 `display:none`；0 pageerror。截图 `shots/round-94/rail-width-1120.png`。

## 门禁

- `tsc --noEmit` exit 0；`npm test` **57 文件 778 条 fail 0**（`.tmp/r94-npm-test.log`）；`npm run verify` PASS，首屏 gzip **312,566 B**（基线 312,423，净 +143；硬线 320,000 余 7,434，超内部 310,000 只 WARN，`.tmp/r94-verify.log`）；`roundtrip` 未跑（没动编辑器/序列化）。

## CHANGELOG 建议

`- 右侧栏加「对话 / 批注」双页签（对话页签为空态 + 禁用输入占位），列宽 260 → 320 px。`

## 新踩坑

1. 改完 `styles.css` 后 dev 5175 仍交付旧 CSS（`.rail-tabs` computed `display:block`、按钮 `flex:0 1 auto`），磁盘与静态探针已是新规则——第 54 轮同坑。`LastWriteTime = Get-Date` 后立刻生效，别重启 dev server，先量 computed。
2. `sidelight.settings.v1` 只在挂载时读一次：加载后写无效，场景 B 退回模拟流（3 卡 + 两条提示）。写完必须 reload 再装 `showOpenFilePicker` stub。
3. 场景 B 的 `top === flowBottom+12` 只在锚点靠文首时可达：段 1 三句 ~80 字时段 2 的 natural ≈120 > floor+12 ≈70。脚本因此分析第一段；换夹具的正确期望是 `max(natural, floor+12)`。
