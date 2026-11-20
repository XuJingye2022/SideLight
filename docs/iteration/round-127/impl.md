# 第 127 轮执行报告（executor）

轮前 `e2ac1a8`。A1、A2 全 PASS，0 回滚；`git diff --stat` 恰 2 个 src 文件、8 行插入 0 删 0 改。

## 任务状态
- **A1 PASS**：`.dialog-inline button` 补 `min-height: 24px` + 按块静态门 1 条。
- **A2 PASS**：真机 before/after 量两条钮 + 布局/行为/回归取证。

## 改动
- `src/styles.css:3400` 1 行注释；`:3401` 起 `.dialog-inline button` 块首行加 `min-height: 24px`（+2 行；padding / font-size 11.5px / 颜色 / 下划线逐字未动）。
- `src/lib/touchTargets.test.ts:26-27` 新常量 `DIALOG_INLINE`、`:145-147` 第 6 条 `assertTapTarget`（+6 行）。
- 未动 `SettingsDialog.tsx`、`package.json`、BACKLOG、CHANGELOG、README。

## 命令与结果
- `node --experimental-strip-types src/lib/touchTargets.test.ts` → 6/6 pass exit 0；负向改 20px → pass 5 / fail 1 exit 1，报文含「可点高度必须 ≥24px，现在：min-height: 20px」，改回 6/6。
- `npm test` → **66 文件 930 条 930 pass / 0 fail**（`.tmp/r127-npm-test.log`）；`npx tsc --noEmit` exit 0。
- `npm run verify -- --max 316000` → PASS exit 0：raw 1,024,697 / gzip 315,796（基线 315,792，净 +4 B ≤5）；`dist/assets/MarginRail-D2G2cRcL.js` gzip9 **7,847**。
- `keyboard-acceptance` → **52/52 PASS**（`.tmp/r127-keyboard.log`）；跑后 `git checkout -- shots/round-05/`，status 只剩两个 src 改动与两个未跟踪目录。未跑 roundtrip。

## A2 真机（ego CDP 57270、1440×900，先 `node .tmp/reset.mjs 57270`）
脚本 `.tmp/e2e-r127-dialog-inline.mjs`；JSON `.tmp/r127-dialog-inline-{before,after}.json`（before 5/5、after 18/18 PASS）。

- 混版门（`fetch('/src/styles.css')` 断块内 `min-height`）：before attempt 1 不含（旧字节）、after attempt 1 含；均未 touch、未重启。
- before（`git stash push -- src/styles.css`，stash 1→0，pop 后 status 回 `M src/styles.css`）：**69×19 / 46×19**，收起态 `.dialog` 竖向溢出 0，设置态小目标扫描恰 2 条。
- after：**69×24 / 46×24**，computed `min-height: 24px`，宽 69 / 46 不变，字号与文本不变；`.dialog` 横向溢出 0（收起/展开）；收起态竖向溢出 0（≤0+2）；两个含钮 details 展开后竖向溢出 268→**278（+10 ≤+12）**；设置态小目标收起/展开均 **0 条**（改前 2），同次 5 界面状态其余 4 态全 0。
- 行为：点「全部恢复默认」→ `.keybinding-status`「已全部恢复默认」；Esc 后 `.dialog` 0、`[inert]` 0；`createWritable` / `showSaveFilePicker` / `Storage.setItem` 三探针 0 次；`sidelight.settings.v1` 前后均 null；0 pageerror。
- 截图：`shots/round-127/dialog-inline-buttons.png`（两个 details 展开）。

## 计划审查 P2 落实
P2-1 before 先反向断块内不含 `min-height` 并记 stash 1→0、pop 后 status；P2-2 展开含钮的两个 details 量 0→0 与 268→278；P2-3 口径写「同次 5 个界面状态」；P2-4 量测/点击/截图前先展开 details；P2-5 证据按「矩形 24 + computed min-height 24 + 按钮行为未回归」。

## 偏差
1. 截图用 1440×1200 视口（仅截图阶段）：900 时 `.dialog` clientHeight 858 < scrollHeight 1136，第二钮在框外；量测全在 1440×900，JSON `behavior.shotGeometryTall` 已记。
2. 展开的是含钮的两个 details（快捷键 / 批注提示词），非全部 3 个；+10 即两钮各 +5。

## CHANGELOG 建议
设置面板「全部恢复默认」「恢复默认」两条文字链钮可点高度 19 → 24 px（B-260）。

## 新踩坑
1. 收起 `<details>` 的内容在 Edg 157 仍有布局盒：设置面板收起时也能量到两钮 69×19（r123 的 2 条即收起态量的）。别按「收起就量不到」判可见性。
2. `.dialog` 内容超出自身滚动视口时，元素截图只截可见区；两钮同框只能临时加高视口，量测不能一起改。
3. 第 54 轮 Vite `/src/styles.css` 缓存坑反向成立：stash 掉修复后 dev 仍可能交缓存里的新字节，before 相必须先反向断言「不含」。
