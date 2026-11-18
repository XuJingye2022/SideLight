# 第 80 轮 A 轮验收报告（tester）

- 轮前 startSha `556e7ff…900d8`；未读 `impl.md`，读 `plan.md`/`git diff`/`BACKLOG.md`。
- 门禁（独立跑）：`npm test` → **45 文件 580 条 0 fail**（基线 45/579）；`npm run verify` → gzip **303,975 B**（内部 310,000，余 6,025）。未改编辑器/序列化，不跑 roundtrip（计划同）。
- 浏览器：CDP 9222–9226 与 54280 均无监听（`Get-NetTCPConnection` 0 条）→ 用 ego-browser 真机页 `localhost:5175` 自写脚本复验；交付 `.tmp` 脚本未按 CDP 执行。

## A1（B-122）暖纸 Mermaid

- 静态：`src/lib/mermaidLazy.ts:144-152` 的 `loading` 分支改成落地后 `configure(mermaid, theme)`；`configure` 按 `initialized && appliedTheme === theme` 幂等（`:110`）。
- 单测：`node --experimental-strip-types src/lib/mermaidLazy.test.ts` → **tests 20 / pass 20**。新条用挂起 loader：release 前 `inits 0`，release 后 `inits 2` 且末次为后设主题（正序末次 `default` 无 `themeVariables`，反序末次 `base`+暖色变量）。
- 真机自跑（ego；Ctrl+/ 源码填 ```mermaid 围栏→退出源码→等 `.mermaid-preview.is-ready svg`）：light→dark→sepia→dark→light，每档 `data-render-key` 前缀 `default|`/`dark|`/`sepia|` 且 `is-ready`；采样全 `getComputedStyle`、无 null/''/'none'：
  - light：fill `rgb(236,236,255)` stroke `rgb(147,112,219)` color `rgb(51,51,51)`
  - dark：fill `rgb(31,32,32)` stroke `rgb(204,204,204)` color `rgb(204,204,204)`
  - sepia：fill `rgb(251,243,227)` stroke `rgb(203,181,142)` color `rgb(58,47,33)`
- 硬门① sepia ≠ light/dark ✓；② 11.83:1（自算 WCAG，底色 `#fbf3e3`）✓；③ dark2/light2 三字段逐值同 dark1/light1 ✓；④ 0 pageerror ✓。附加：sepia `--paper-raised` 计算值 `#fbf3e3`＝fill，通道差 0/0/0（≤3）✓。
- 截图 `shots/round-80/mermaid-sepia.png`（已看：米黄卡片、暖色节点）。

## A2（B-136）只读查找条

- 产品代码无改动（`git status` 无 FindBar/findBarState）；该条 77 轮已修，本轮补「正文 0 高亮」与源码视图。交付 `.tmp/r80-a2-find-locked.json` 21/21 PASS；脚本 `.tmp/e2e-r80-a2-find-locked.mjs` 已核含夹具 `find.md`（丁节/字数各 1 次、无 `==`/`<mark>`）与 `previewHitCount`/`mark` 断言。
- 我自跑（ego，另用一篇含 mermaid 的正文）：预览 Ctrl+Shift+P→Ctrl+F：两输入 readOnly、Aa/ab 各 1 disabled、note 含「预览是只读视图」、id 与 aria-describedby 同为 `find-locked-note`、键入 `abc` 后 value 仍 `''`、`.find-count` `''`、`.preview-pane .find-hit` 0、mark 0、Aa disabled 且 aria-pressed=false、Esc 后 `viewMode='preview'`。
- 源码：先等 `textarea.source-editor` visible 再 Ctrl+F，同锁、note 含「源码模式下不支持」、键入无效、Esc 后焦点回 textarea。
- 回编辑：readOnly 0、Aa 可用、键入 `A` 得 `1 / 2`（该文 2 处 A；夹具档 1/1）。夹具原文未由我重跑。

## A3（B-150）设置面板分节折叠

- 静态：`SettingsDialog.tsx:140-224` 两个 `<details className="settings-group">` 不传 `open`；DOM 序＝主题→三条开关→字号→①接口与模型→②批注提示词→两条 `.dialog-note`→`.dialog-actions`；`useDialogFocus.ts:4-11` 的 `FOCUSABLE` 不含 summary；`styles.css:1531-1546` 加 `.settings-group`(12px)、`> summary`(6px 0 / 12px / pointer)、`[open] > summary`(6px)。
- 三档实测（ego 设备指标覆盖，先量后判）`scrollHeight-clientHeight`：**1024×700＝0**、**1000×620＝62**、**1440×900＝0**（改前 352/432/152 → 差 −352/−370/−152）；三档 ≤64 达标，1440 档 0 ≤8。
- 其余真机：details 恰 2 初始 `open=false`；点开①出可见「接口地址」input（`https://api.deepseek.com/v1`），勾选框触发重渲染后仍 open；footer 三档都在框内与视口内，`保存` 中心 `elementFromPoint` 命中 `BUTTON.primary`；`[role=radio]` 4、`tabIndex=0` 恰 1、首焦点「浅色」；3 checkbox / 2 条顶层 dialog-note / actions 三钮在；改字号 17→18px、localStorage `fontSize` 18、保存后关闭；summary 计算 12px / pointer / padding 6px 0 / `[open]` 6px。
- 截图 `shots/round-80/settings-1024x700.png`（已看：字号常显、两个 ▶ 折叠、footer 完整）。

## 回归

- 真机已覆盖：mermaid 五档切主题、设置保存、查找条三态、Esc 焦点落点、视图切换。`scripts/` 唯一设置相关选择器 `scripts/draft-acceptance.mjs:483` 用 `.dialog-actions button`（仍在）；`.field input` 0 条。

## 判定

- A1 PASS-WITH-UNVERIFIED（硬门全过；交付脚本未按 CDP 跑）；A2 PASS-WITH-UNVERIFIED（锁语义全过；夹具原文未重跑）；A3 PASS（0/62/0 达标）。BACKLOG：B-122、B-136 → `verified`；B-150 → `fixed`。
- UNVERIFIED：①交付 `.tmp/e2e-r80-*.mjs` 未在 CDP 9222–9226/54280 执行；②A2 夹具原文未由 tester 重跑（只核脚本与 impl JSON）；③真实 FSA/IME/WebView2/原生打印未验。
