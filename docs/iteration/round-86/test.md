# 第 86 轮 tester 报告（A1/A2/A3）

未读 `impl.md`，只读 `plan.md`、`git diff`、BACKLOG。起点 HEAD `8b0c1f5`（=startSha）。

## 门禁（一次）
- `npm test`：**51 文件 659 条 0 fail**（基线 50/641，门槛 51/≥656）。日志 `.tmp/r86-tester-npm-test.log`。
- 单文件：`inlineSyntax.test.ts` **37/37**（≥36）、`export.test.ts` **30/30**（≥30）、`noteA11y.test.ts` **8/8**（新，≥6），均 exit 0。
- `npm run verify`：**PASS**，首屏 gzip **306,276 B**（内部 310,000／硬线 320,000，余 13,724）；`www` 镜像 98 文件。`.tmp/r86-tester-verify.log`。
- `npm run roundtrip`：rich **7/9**、source **9/9**、首存拦 1/9 —— 与第 84 轮同（未回退）。`.tmp/r86-tester-roundtrip.log`。

## 静态（改前→改后，改前均 0/未命中）
- `git grep -c addPasteRules -- src/lib/inlineSyntax.ts` 0→**1**；`markPasteRule` `src` 0→**2 文件**（`inlineSyntax.ts` + 其测试）。
- `export.ts`：`sl-eq` 0→**4**、`sl-sup` 0→**2**、`sl-sub` 0→**2**（对照 `nav.sl-toc` 11）。
- `MarginRail.tsx`：`tabIndex` 0→**1**、`role="group"` 0→**1**（`aria-label` 3→4；`Outline.tsx` 用的是 `role="tree"`/`treeitem`）。
- `package.json` test 链尾挂 `noteA11y.test.ts`（50→51 文件）。

## 真机（自写 `.tmp/r86-tester-e2e.mjs`，ego 浏览器 CDP 54280 + 假 FSA，dev 5175）
结果 **30/30 PASS，pageerror 0，console error 0**，`.tmp/r86-tester-e2e.json`。
- A1：手打 `==红== 与 ^上^ 与 ~下~` → 1/1/1（对照）；**粘贴同一串 → 1/1/1** 且正文无定界符字面；`==a== 与 ==b==` → **.sl-eq 2**；负向 `a == b`／`====`／`\==a==`／`2^10` → 0/0/0；`~~删除线~~` → `s` 1、`.sl-sub` 0。
- A1 **硬门**：围栏内粘 `==红==` → `.sl-eq` **0**，`Ctrl+S` 落盘 `# 门\n\n```\n原始==红==\n```\n\n行内：\`原样\`\n`（去掉 4 字逐字节 = 基线）；行内代码内粘 `^上^` → `.sl-sup` **0**，落盘再 + 字面 `^上^`；普通段落粘 `==红==` → `.sl-eq` **1**。
- A2（拦 `URL.createObjectURL`）：导出串正文 `class="sl-eq"/"sl-sup"/"sl-sub"` 各 1，`.sl-eq{s`/`.sl-sup{s`/`.sl-sub{s` 三条规则都在；导出 HTML 挂 iframe 后 `.sl-eq` 计算背景 **rgb(240, 224, 189)**、`.sl-sup` fontSize **12.75 < 17**（body）、`top -6.375px`（负）。
- A3：模拟批注卡 `article.note`，`role=group`/`tabindex=0`、`aria-label` = `第 1 处 评价：「第一句用来做批注，这句话够长可以分析。」`（含前 8 字）；`card.focus()` → activeElement 是卡片；**真实 Tab**（从 DOM 序前一个 tabbable 按 Tab）落卡且 `outlineStyle:solid`/`outlineWidth:2px`；Enter → activeElement=`.ProseMirror:not(.preview-pane)`、选区文字 = 引文；焦点在「追问」上 Enter → 焦点仍在「追问」、正文选区不变；源码态焦点在 `textarea.source-editor` 按 Enter 后仍在 textarea。

## 回归
- 相关既有脚本两条均**过期**（非本轮引入，未改）：`scripts/keyboard-acceptance.mjs` 硬走 `localhost:5173`（僵尸 server，运行即 `navigating to 5173` 失败，`.tmp/r86-tester-keyboard.log`）；`scripts/draft-acceptance.mjs` 仍按 800 ms 防抖断 T1（现 2,500 ms，`900/0` 三条红）并在 host 段 `draftSave.id` 崩（`.tmp/r86-tester-draft.log`，8 PASS 后 crash）。按 common.md「已知过期脚本」处理，不判产品回归。
- 替代回归：`npm test` 51/659、roundtrip 同值、真机打字/粘贴/`Ctrl+S` 落盘/源码切换四条主链在 A1–A3 内自跑通过。

## UNVERIFIED
- CDP **9222–9226 全无监听**；本轮真机走 ego 浏览器 CDP 54280（沿用第 79–85 轮口径）。真 WebView2 宿主、真实 IME、原生打印/另存 PDF 未跑（A2 只看导出 HTML 的计算样式）。
- 残余（计划已记，不作门槛）：`<mark>` 仍 UA 黄底；粘贴段紧邻已有 `=`（`x =` 后粘 `==红==`）看不到前一字符；`Input.insertText` 路径不转。
- 两条既有回归脚本过期，未修（属 B-209 同类）。

## 判定
**PASS**：三条任务门槛全过，其余为环境/脚本陈旧所限的 UNVERIFIED，无产品回归。
