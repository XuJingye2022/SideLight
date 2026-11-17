# 第 54 轮计划审查（critic，revision 1）

判定：**PASS**（无 P0/P1；6 条 P2 见末节）。B3 仍未审（与前版一致，B 轮可砍）。

## 上一版 6 条均已修

- P1-1 A1 ⑤ 依赖改 `[show, requestLoad]`，验收加「脏文本拖入→切换确认、正文与名不变、取消仍原篇」；`App.tsx:2397` 的 `requestLoad` 依赖含 `dirty`（`:2384`），可行。
- P1-2 B1 ⑤ 只注册一次、tokenizer 读实时 ref；验收写「同会话关开关不刷新」；`tilde.ts:5/13-16` 的 WeakSet 与 `:801` 的 ref 写法对得上。
- P1-3 B2 三条限定文件断言，改前数已核：README:96=1、AGENTS:74=1、typora-gap:7/:44=2。
- P2-4 B2 ④ 改 README:45 与 AGENTS:72 的 100–300%→50–200%（`settings.ts:35-37`；`git grep 100–300` 现只剩这两处），全屏写「F11 有入口、宿主内未验」。
- P2-5 B1 ③ 三个 `<span data-sl>` 独立 mark（不与真标签共 tag），可行；roundtrip 路径实测 `<mark>/<sub>/<sup>` 逐字节同（`.tmp/r54-critic-roundtrip.mjs`）。
- P2-6 A2 档位走 `sidelight.settings.v1`（`settings.ts:29/104`），末位取可见按钮：对。

## 本轮实测（1440×900，CDP 9222）

- A2：溢出基线 0/26/250/586/810（100/130/150/180/200%）与 plan 一致；注入 `#root .app{min-width:calc(1120px/var(--page-zoom,1))}` 后全 0，17 个可见按钮出屏 0，rightMost 1430→1420 ≤1440，200% 下按钮不被压扁（最小 42、`scrollWidth>clientWidth` 0）。② 有实现路径。
- A1：合成 `DataTransfer` drop 可达 window 监听（旧提示出现），E2E 方案可行。

## 剩余 P2

1. R54-1 B1 缺样式落点：新 mark 用非标准 `<span data-sl>`，无 UA 默认样式；`styles.css` 与 `export.ts:78` 的 `STYLES` 都没有 → 「出真样式」、预览、打印、HTML 导出会退化成纯文本。修：B1 文件表加 `styles.css`、`export.ts`；验收加「导出 HTML 有 data-sl 规则」。
2. R54-2 A1 句柄回落要判 falsy：实测合成项 `getAsFileSystemHandle()` 返回 **undefined**（不是 null）。判 `=== null` 会让 E2E 进 handle 分支崩。修：验收写「无句柄（null/undefined）→ 仍打开、Ctrl+S 走另存为」。
3. R54-3 B2 验收口径：改后 typora-gap 两条标题是 2 处（非「新句 1」）；最终数取决于 B1（35/7 或 34/7），README/AGENTS 必须选同一数。修：改「node 数行数=标题数（35/7 或 34/7）+ 三处同数」；顺手改第 89-91 行「建议的下一批」。
4. R54-4 B1 开状态缺「不误判」验收：只写「`~` 须成对」，`==`/`^` 的边界（左右不贴空白、内容非空、不跨行）没写。补 `a == b`、`甲 ^ 乙`、`== 甲 ==` 保持字面。
5. R54-5 25 分钟：B1 单任务（新 lib+3 mark+tokenizer+输入规则+设置项+单测+fixture+E2E）已接近上限，B2/B3 会挤。写明砍单顺序（B3 先砍；E2E 可交 tester）。
6. R54-6 finder-code F1（草稿双写，P1）仍未落 BACKLOG 编号，请根代理本轮结束前补登。
