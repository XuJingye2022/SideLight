# 第 80 轮计划审查·复核（critic）

判定：**PASS**。上一版 R80-1/2/3 已修；顺带核 R80-4/5/6 也已补（plan.md 6,129 B，仍 < 6 KB）。3 条均 P2，本批可执行。

## 上一版漏洞复核

| 编号 | 状态 | 证据 |
| :--- | :--- | :--- |
| R80-1 | 已修 | plan.md:19 全用 `getComputedStyle`，`null`/`''`/`'none'` 即 FAIL；plan.md:21 只比 `fill`/`stroke`/`color` 三字段；期望值不写死（附加查 `--paper-raised`，≤3 通道差记命中，否则记实测） |
| R80-2 | 已修 | plan.md:17 写明 `keyboard.type('```mermaid')`+Enter（输入规则写 `attrs.language`），失败退 `Ctrl+/` 源码填围栏；所引 `.tmp/e2e-r46-impl-t3-mermaid.mjs:55-75` 确为源码态播种段 |
| R80-3 | 已修 | plan.md:26 只断 `disabled===true` 且 `aria-pressed==='false'`，不点；与 `FindBar.tsx:87,97`、`findBarState.ts:24,28` 一致 |
| R80-4 | 已修 | plan.md:39 先量后判：≤64 达标、65–120 压一次间距复测、仍 >120 记实测留 `deferred` 不判未完成；1440×900 改「0 或 ≤8」 |
| R80-5 | 已修 | plan.md:25 A2 夹具写死（两词各 1 次、无 `==`/`<mark>`）；A1 plan.md:17 播种写死 |
| R80-6 | 已修 | plan.md:4 有批次号与队列；plan.md:21/30/41 各有证据文件与目标状态（fixed/verified/deferred） |

## 代码事实复核（执行者不用再查）

- 并发早退确在 `src/lib/mermaidLazy.ts:144`；`:141` 早退分支已 `configure`；`__setLoaderForTest` 内含 `__resetForTest`（`:213-216`），挂起 Promise 的新测可写，19→20 条成立。
- 主题键在 `src/lib/mermaidPreview.ts:110`（`主题|hash`，写进 `data-render-key` 见 `:91`），`[data-render-key^="sepia|"]` 可等；主题观察器 `:154-158`。
- 暖纸 `--paper-raised` = `#fbf3e3`（`src/styles.css:73`、`src/lib/themes.ts:20`）。
- `Ctrl+Shift+P` 预览在 `src/App.tsx:4356-4359`；`Ctrl+/` 恒切 edit/source `:4699`；两 `.find-input` 都带 readOnly/aria-describedby（`src/components/FindBar.tsx:60-61,118-119`）；预览/源码文案 `App.tsx:5686`/`:5684`；`.preview-pane` 在 `PreviewPane.tsx:128`；`__slState.viewMode` 在 `App.tsx:885`。
- A3 行号有漂移但不影响内容：`.dialog` 实为 `styles.css:1436-1445`（plan 写 1449-1458）、`.dialog-actions` `:1488-1499`（plan 写 1501-1512）；`.field` 12 / `.field-hint` 4 与 plan 的压缩值一致；`FOCUSABLE` 不含 `summary`（`useDialogFocus.ts:4-11`），首焦点仍是首个 theme 钮。

## 剩余 P2（不阻塞，执行时顺手改）

1. A1 硬门①拿第 58 轮常量 `rgb(236,236,255)` 当 light 期望值：light 实际值一变，「sepia ≠ light」会空过。改为同一次运行先记 light/dark 实测值再比，常量降为备注。
2. A3「两条 `.dialog-note`」有歧义：DeepSeek 计费 note 是条件渲染（`SettingsDialog.tsx:196-200`，仅 `searchProvider==='deepseek'`），若挪到②后会对所有 provider 显示。写明它留在①内并保留条件；外面只留顶部「密钥只存在…」与底部「协议按 OpenAI 兼容走」。
3. A2 的 `.preview-pane .find-hit` 0 与 `mark` 0 是空断言（`find-hit` 只由编辑态 `src/lib/decorations.ts:71` 生成，夹具无 `<mark>`）。删掉，或改断 `.find-bar` 看不到命中计数。
4. 批次账：队列余项实为 6（B-103/B-106/B-107/B-110 部分/B-121/B-126），plan.md:4 写「余 5」；本批 3 条只有 B-122 属 10 条清单，下一批优先清这 6 条。
