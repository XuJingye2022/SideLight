# 第 75 轮 finder-code 补充（并行产出，不重复主表）

- 同角色主表已在 `docs/iteration/round-75/findings-code.md`（8 条提案，我未改动它）。本文件只放我独立跑出来的**增量证据**与**新发现**，避免重复计数。
- 基线（本会话实测）：`npx tsc --noEmit` exit 0（0 输出）；`npm test` exit 0。轮前 `startSha` `e5dd887`，工作区仅 `docs/iteration/BACKLOG.md` 改动 + `docs/iteration/round-75/` 未跟踪。
- 主表 8 条的引证行号已逐条对齐当前 HEAD：`src/App.tsx:6013`（`countText` 在 render 里）、`:3037`（`finishSaved`）、`:4817`（`editor.getHTML()`）、`src/lib/assetImage.ts:56`（`waitResolve`）、`src/lib/mermaidLazy.ts:64`（`mermaidTheme`）全部命中，可放心采用。

## 排除项：公式 / `==` 露出不是性能问题（不要为它排批次）

探针 `.tmp/r75-finder-probe.ts` → 输出 `.tmp/r75-finder-probe.json`。文档 542,000 字符 / 20,000 段 / 200 处 `eqHighlight`，`createRangeRevealPlugin` 同一套 `scan`/`apply`：

| 口径 | p50 | max |
| :-- | --: | --: |
| `collectEqRanges`（全篇重扫） | 0.62 ms | 3.86 ms |
| `decorateEqReveal` 200 处 | 0.28 ms | 0.74 ms |
| `eqTouchesTransaction`（高亮内插入） | 0.05 ms | 0.07 ms |
| 高亮内插 1 字整条 `state.apply` | **0.56 ms** | 1.34 ms |
| 高亮外插 1 字 `state.apply`（只映射） | 0.12 ms | 0.45 ms |

结论：`eqTouchesTransaction` 在「高亮里打字」确实回 `true`（`touchesInsideHighlight:true`）并触发全篇重扫，但 1 MB 量级也只有 ~1 ms 级，远低于 B-116 的逐键 p50 148 ms；第 73/74 轮的露出实现**不需要**性能返修。

## 新发现（建议入池 P2）：默认开后 `\==` 字面会变真高亮

- 探针 `fidelity.escaped`：源 `\==a== 结尾` → 解析出 `eqHighlight` mark **0**（正确，是字面），但保存写回 `"==a== 结尾\n"`（`byteEqual:false`）——转义被丢掉。
- 默认开（`src/lib/settings.ts:57`、`:122`）之后，这份写回的文件**重新打开时 `==a==` 会解析成高亮**：同一份磁盘内容语义变了（第 75 轮前只是字节被规范化，不影响渲染）。
- 代码侧：`src/lib/escapes.ts` 里没有 `=` 的重转义（`Select-String -SimpleMatch "'='"` 0 命中）。
- 口径：探针 manager 只带 `StarterKit + 三个 mark`（不含公式/表格扩展），**产品路径（App 的 manager + `serializeDocument`）未验 → UNVERIFIED**。验收建议：含 `\==x==` 的文档打开→保存→重开，mark 数 0 且字节不变。

## 供用户第 2 条（`==高亮==`）定位的证据（不占提案位）

- `==` / `^` / `~` 只有 marked 行内 tokenizer（`src/lib/inlineSyntax.ts:107-119`），**没有输入规则**：`git grep -n "InputRule" -- src` 仅 3 处——`src/lib/mathInput.ts:36`、`:56`、`src/lib/taskListInput.ts:21`。
- 因此「默认开」只修了**打开文档**这条路径；编辑器里新打的 `==文本==` 仍要存盘再打开才变高亮，键入当下不会即时转 mark。这与用户第 2 条同源，已由该条队列覆盖，本表不重复提案。

## UNVERIFIED

- CDP 9222–9226 全部无监听（5 个端口 `TcpClient` 300 ms 全 False），按规则未重试；浏览器侧数字一律未复测。
- 未跑 `npm run verify` / `npm run roundtrip`（只读提案轮）。
