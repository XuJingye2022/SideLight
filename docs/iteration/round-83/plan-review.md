# 第 83 轮计划审查（critic，复审 rev.1）

结论：**PASS**（上一版 2 条 P1 + 2 条 P2 已按修法落地；剩 6 条 P2，不阻塞）。A2 的 `\=` 保真路径已由 planner 探针 9/9 字节同验证，可行；A1/A3 属复核与文案，25 分钟够。基线核对：HEAD `13cf1a3`、`git status` 只有 `docs/iteration/round-83/` 未跟踪；单测实点 `inlineSyntax.test.ts` 14、`settings.test.ts` 14、`mathReveal.test.ts` 10、`mathStyle.test.ts` 4、`mathInput.test.ts` 5、`mermaidLazy.test.ts` 20；`npm test` 46 文件 591 条、gzip 304,307 B（round-82 报告）；`scripts/roundtrip.mjs:30` 的 `EXTENSIONS` 确无 inlineSyntax marks。红线未违反。

## 上一版漏洞检查

- **P1-1 已修**：B-122 压成预检 2 行（`mermaidLazy.test.ts` 实点 20 条），空出槽位=`A3 B-212`；B-212 确在 10 条内（`BACKLOG.md:109`），且 `要恢复`/`文件管理器` 在 `src` 只有 `src/components/TreeActions.tsx:292` 一处，`src/App.tsx` 0 处（计划对 `App.tsx:2762-2771` 的更正属实：那几行是新建文件夹与 `removeFile` 注释）。
- **P1-2 已修**：预检 3 行各带单测路径与缺口归属；CSS 更正正确——`.katex-display` 规则实为 `src/styles.css:2137-2141`（`2119-2123` 已过期），`margin:0 auto; width:fit-content; min-width:100%` 逐条在。
- **P2-3 已修**：三列（字节/二次可见文本/eq 节点）已落表，并写明 `eq 2` = 两个文本节点各 1 个 eqHighlight；改前 9 行与 `.tmp/r83-rev-before.log` 逐值一致（含 `\===a===` 二次 eq 0）。
- **P2-4 已修**：`getHTML()` 的 `.sl-eq-escaped` span 检查进步骤 6，roundtrip 不覆盖的依据进第 59 行；`markdownOptions` 退路已删。

## 新 P2（均不影响本轮开工）

1. **P2-1 探针「与 App 同口径」不实**：`.tmp/r83-rev-probe6.ts:44-46` 只有 StarterKit + inlineSyntaxMarks + `escapeHtmlForParse` + `disableSingleTildeStrike` + `serializeDocumentBody`，缺 App 的 `protectMathPairs`（`src/lib/math.ts:18`，App 载入链）、表格/任务列表。修法：计划第 5 句改成「复刻保存链的 escape/serialize + tilde 注册」；A2 补 1 条 `$\alpha \= x$`（或块级）字节同用例，锁公式内 TeX `\=` 不被 eqEscaped 抢。
2. **P2-2 A1 断言 ③ 读数口径脆**：`min-width:100%` 的 resolved value 在 Chrome 可能是 `100%` 而非 px，`min-width = 容器宽` 会假红。修法：改断 `margin-left/right` 为 `0px`、`getBoundingClientRect().width >= .block-math-inner 的 clientWidth`，或允许 `minWidth` 为 `100%`/px 两种。
3. **P2-3 A3 文案会拼出「。，」**：`deleteDialogLead(dirty)` 以「。」结尾、`DELETE_RECOVER_TAIL` 以「，」开头 → 「撤销会一起搬回。，不会当场永久删除」。修法：lead 去句末标点或 tail 去首逗号；单测加一条 dirty 文案不含「。，」。
4. **P2-4 A3 丢掉可执行提示**：「用文件管理器把 trash 里的文件移回原位」被改成「把 trash 里的文件移回原位」，且验收 `git grep '文件管理器' 改后 0` 会把它判成必须删。修法：恢复句保留「在文件管理器里」，验收只断「两分支恢复句相同 + 含撤销」。
5. **P2-5 A2 粘贴路径会再丢 `\`**：`parseHTML: () => []` 使复制 `\=` 文本再粘回时 mark 不重建，序列化写回 `=`。计划风险①只写「不影响渲染」，建议明写这条残余（导出/预览已验证，剪贴板未覆盖）。
6. **P2-6 跟踪口径**：A2 的 `\=` 问题没有 BACKLOG ID；A3 验收「B-212 落地后改 fixed」与「BACKLOG 由批末 scribe 统一」自相矛盾；`BACKLOG.md:60` 的 `2119-2123` 也要改。修法：本轮给 A2 开一条 B-213（或复用 ID），B-212 由 tester 收口时改 `fixed`，行号更正一并记。

补充：本轮只清 1 条 P2（10 条按此速度要 10 轮），用户原话是「每 3 条一小批」；建议下一轮起每轮并联 2–3 条纯前端 P2（B-211、B-107、B-126），不必占 A1 类复核位。
