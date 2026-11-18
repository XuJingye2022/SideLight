# 第 80 轮 A 轮执行报告（impl）

startSha `556e7ff`=HEAD；未 commit/push、未动 `release/`、未加依赖。

## A1（B-122）暖纸 Mermaid：主题竞态 + 真机颜色 — DONE

- `src/lib/mermaidLazy.ts:144` 并发分支落地后补 `configure(mermaid, theme)`（`appliedTheme` 幂等）。
- 单测 +1（`gatedLoader`）：19→**20/20**（挂起 loader；sepia→default 末次 default 无 vars，反序末次 base+vars）。
- 真机（ego CDP 54280，1440×900）`.tmp/e2e-r80-a1-mermaid.mjs` **18/18 PASS** → `.tmp/r80-a1-mermaid-sepia.json`。
- `getComputedStyle` 采样 `g.node rect`/标签/边：light fill `rgb(236, 236, 255)`、stroke `rgb(147, 112, 219)`、label `rgb(51, 51, 51)`；dark `rgb(31, 32, 32)` / `rgb(204, 204, 204)` / 同值；sepia **`rgb(251, 243, 227)`** / `rgb(203, 181, 142)` / `rgb(58, 47, 33)`。
- 硬门：①sepia≠light 且≠dark ✓；②sepia 标签对 fill **11.83:1** ✓；③第二次 dark/light 三字段逐值同 ✓；④0 pageerror ✓。附加：sepia fill 与 `--paper-raised` 通道差 **0**。
- 截图 `shots/round-80/mermaid-sepia.png`。B-122 留 fixed，交 tester 判 verified。

## A2（B-136）只读查找条：预览 + 源码 — DONE（产品代码未改）

第 77 轮实现已满足验收，只补证据。`.tmp/e2e-r80-a2-find-locked.mjs` **20/20** → `.tmp/r80-a2-find-locked.json`；夹具 `find.md`「丁节」「字数」各 1 次、无 `==`/`<mark>`。

- 预览：两 input readOnly、Aa/ab 各 1 disabled、note 含「预览是只读视图」且 `id` 与两 `aria-describedby` 同值 `find-locked-note`；真实键入后 value `["",""]`、count 空、`.preview-pane .find-hit` 0 / mark 0（空断言）；Aa 只断 disabled + `aria-pressed=false`；Esc 关条、`viewMode=preview`。
- 源码：先等 textarea visible 再 Ctrl+F，同锁 + note「源码模式下不支持」，键入无效，Esc 焦点回 `TEXTAREA.source-editor`。
- 编辑：readOnly 0、Aa/ab 可用、键入「字数」得 **1 / 1**。交 tester 判 verified。

## A3（B-150）设置面板分节折叠 — DONE

- `SettingsDialog.tsx`：两个原生非受控 `<details className="settings-group">`（不传 `open`）：①接口与模型（接口地址/Key/模型/联网核对/搜索 Key/计费 note 留组内并保条件）②批注提示词；字号上移常显；主题、三条开关、两条顶层 note、`.dialog-actions` 未动。
- `styles.css`：`.settings-group{margin-bottom:12px}`、`> summary`（6px 0 / --text-xs / --ink-soft / cursor:pointer）、`[open]>summary{margin-bottom:6px}`；`.dialog` max-height/overflow 未动。
- 真机 `.tmp/e2e-r80-a3-settings.mjs` **16/16** → `.tmp/r80-a3-settings.json`；溢出 `scrollHeight-clientHeight`：1440×900 **0**（前 152）、1024×700 **0**（前 352）、1000×620 **62**（前 432）→ 三档 ≤64 达标，未压间距。
- 另断：details 恰 2 初始 closed、首焦点首个 theme radio、`[role=radio]` 4 且 tabIndex=0 恰 1、3 checkbox、2 条顶层 note、footer 在框内+视口内且保存中心命中、点开①出接口地址 input、重渲染后仍 open、字号 19 生效。
- 截图 `shots/round-80/settings-1024x700.png`。B-150 达标 → fixed。

## 门禁

- `npx tsc --noEmit` 0；`npm test` **45 文件 580 条 0 fail**（基线 579，+1；`.tmp/r80-impl-npm-test.log`）；`npm run verify` gzip **303,975 B**（基线 303,914，+61；内部 310,000）PASS（`.tmp/r80-impl-verify.log`）。未跑 roundtrip（未改编辑器/序列化）。CDP 9222–9226 无监听，用 54280 ego 浏览器。

## CHANGELOG 建议

暖纸下 Mermaid 走 base + 暖色变量并修「首次加载中切主题不生效」；设置面板两组默认折叠、字号常显，1024×700 不再整框滚动。

## 新踩坑

1. 挂起 loader 的单测里 `let release` 在 executor 内赋值会被 TS 收窄成 `null`；改用闭包工厂返回。
2. readOnly input 上 `keyboard.type` 不改 value（可作锁定证据），但必须先 `.focus()` 并同帧断 `activeElement`。
