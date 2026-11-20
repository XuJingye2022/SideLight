# 第 115 轮验收（tester 独立，未读 impl.md）

轮前 `ad2cd11`；判定 **PASS**（26/26 自写 E2E、门禁全过、0 回滚）。

## 1. 缺陷与改法（只按 `git diff` 复核）

- `src/App.tsx:5886-5895` 的 `main#editor` `onKeyDownCapture` 只改 **3+/1−**：`:5888` 补 `editor.isDestroyed`，新 `:5890` `if (!editor.view.dom.contains(event.target as Node)) return`，+1 行注释。`git diff --stat` 只 `src/App.tsx` 与 `BACKLOG.md`，`MarginRail.tsx`/`styles.css` 0 改动。
- 侧栏在 `main` 内：`MarginRail.tsx:420` 由 `App.tsx:6000` 渲染，`</main>` 在 `:6089`。

## 2. after 验收（自写 `.tmp/r115-tester-b241.mjs`，ego CDP 57270、1440×900）

先 `node .tmp/reset.mjs 57270`；**26/26 断言、0 pageerror、0 console error**（`.tmp/r115-tester-b241.json`）。脚本先查 `/src/App.tsx` 交付字节含两条守卫（防 HMR 旧模块假绿）。

- 批注路：焦点 `.rail-diff-open` → Tab×3 = `[button.rail-review-open, button#rail-tab-notes, button.stats-trigger]`，与任务书逐项相等、无 `.skip-link`。
- 对话路：点 `#rail-tab-chat` → `.rail-chat-input` 填「草稿」（发送钮随即可用）→ 焦点回输入框 → Tab×3 = `[button.rail-chat-send, button.rail-chat-generate, button.stats-trigger]`，逐项相等、无 `.skip-link`。
- 对照：打 1 字（`from=2`）→ `Ctrl+End`（`from=2`）→ 两路重跑，站头身份相同（比 tag/id/class；`.stats-trigger` 文案变「1 字…」不算路径变化）。
- 正控：`Ctrl+Home` 后 `{1,1}`；window 冒泡相读到 `defaultPrevented===true`、Tab 落 `A.skip-link`——正文 1/1 的劫持仍生效。
- 反向：`.rail-chat-send` → `Shift+Tab` 回 `.rail-chat-input`。
- 预览态：`.preview-pane` 1，`main#editor.focus()` 后 Tab **0 新 pageerror**，焦点落 `.stats-trigger`（`contains` false 早退）。
- 几何：`.margin-rail` 宽 **320**，`.doc-scroll` 与页面横溢 0。

## 3. before 证据（三条互证，未替换文件/stash）

按 `plan.md` §5.2：① `.tmp/r115-b241-before.json` 记 `head:"ad2cd11"`、`sel1={1,1}`、`notesStops[0]`/`chatStops[0]` 均 `.skip-link`、`prevented:true`；② `git grep -nF 'view.dom.contains' ad2cd11 -- src` 与 `'editor.isDestroyed'` 均 **0（exit 1）**；③ 正控在改后代码上仍复现「1/1 + Tab → skip-link」。dev server 只能跑工作树版本、另起 server 违规，故 before 不在浏览器重跑。

## 4. 静态门（改前 → 改后）

- `git grep -nF 'view.dom.contains' -- src`：HEAD **0 exit 1** → **1 行**（`src/App.tsx:5890`）。
- `git grep -nF 'editor.isDestroyed' -- src`：HEAD **0 exit 1** → **1 行**（`:5888`）。
- 正向对照：`git grep -nF 'editor.view.dom' ad2cd11 -- src` 改前 **1 行**（`:4108`），复用既有引用、非新依赖。

## 5. 门禁与体积

- `npm run verify -- --max 315600` **exit 0 PASS**：门 gzip **315,492 B**（raw 1,023,600、files 3、headroom 108），对第 114 轮基线 315,464 **净 +28 B**；`target=310000 gap=-5,492` 只 WARN。
- 常驻懒 chunk `MarginRail-e5V9wo-A.js` raw 20,820 / **gzip9 7,337**（同第 114 轮）。
- 合计（B-229 口径）**315,492 + 7,337 = 322,829**，超硬线 320,000 **2,829 B**（B-229 仍 `open`，只记）。
- `npm test` **62 文件 892 条 0 fail**（`.tmp/r115-tester-test.log`，逐文件求和）。未加测试文件：2 行守卫由 E2E + 静态门覆盖、体积余量只 108 B。提交前同步 CHANGELOG 区间到 29–115（`changelog.test.ts` 3/3）后复跑仍 **62/892 0 fail**（`.tmp/r115-tester-test2.log`）。
- 回归 `keyboard-acceptance`（`SIDELIGHT_CDP=57270`、URL 5175）**52/52**（`.tmp/r115-tester-keyboard.log`）；跑完 `git checkout -- shots/round-05/`，`git status` 无截图改动。
- `roundtrip` 不跑：未动编辑器/序列化。

## 6. BACKLOG

`B-241`（`BACKLOG.md:75`）已置 `fixed`，四组证据与实测一致（before/after JSON、keyboard 52/52、三数 315,492 / 7,337 / 322,829、静态门 0→1）。

## 7. 偏差与 UNVERIFIED

- 偏差（不判 FAIL）：自写脚本首版把 `.stats-trigger` 文案算进「逐项相等」，报 2 红，改比 tag/id/class 后全绿；首次用 PowerShell 改脚本致中文乱码（AGENTS §8 已记），改用 write 重写。
- 未独立复验 impl 记的两条侧效应（skip-link Enter 后 Tab、源码 textarea Tab 去向）：不在验收标准内。
- UNVERIFIED：真实 WebView2 宿主、真实中文 IME、原生打印（环境限制、与本轮无关）；before 不在浏览器重跑（见 §3）。
