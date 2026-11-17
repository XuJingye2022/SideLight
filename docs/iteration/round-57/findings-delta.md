# 第 57 轮轮间回归检查（finder-delta）

只查回归，不改产品代码。轮前 `startSha` = HEAD `c5fa04a`，工作区干净；上一轮改动面 `git diff 882eb49 c5fa04a`：`src/App.tsx`（+18/−6）、`src/components/SettingsDialog.tsx`（1 行）、`src/lib/inlineSyntax.ts`（+41/−3）。CDP 9226（先 `node .tmp/reset.mjs 9226`）；dev 5175 未重启。

**结论：无新回归。** `actionable_count` = 0，不写 BACKLOG。

## 一、B-119 行内定界符守卫 — 通过

`.tmp/e2e-r57-delta.mjs` → `.tmp/r57-delta.json`：开态 8 例，拖入 → 点正文 → `Ctrl+S` → 读假 picker 字节并数 mark。写盘 8/8 与输入逐字节相同，0 pageerror。

- 合法标记不坏：`==高亮== 与 ^上标^ 与 H~2~O` 得 eq/sup/sub 各 1；`~~甲~~ ==乙== ^丙^ H~2~O` 得 1/1/1 + 删除线 1（同段落混排不互吃）。
- `~` 不守连续段后 `~~…~~` 仍走 marked `del`：`~~删除线~~ 还在` 删除线 1；`~~甲~~ 与 H~2~O 与 ~~乙~~` 删除线 2、sub 1。
- 字面条目不误伤：`== a ==`、`a====b==c`、`^^ 与 ==== 都按字面`、单侧 `~` 与 `^` 四例 eq/sup/sub 全 0，写盘同源。
- 提示真渲染（`.tmp/e2e-r57-hint2.mjs`）：新句「成对且不贴空白才解析」在，旧句「写回字节两种状态都一样」0 命中。

## 二、B-116 逐键脏判定 — 通过

同脚本 `dirty` 段：初态干净 → 打字后 **13 ms** 出 `.dirty` → 脏时 `Ctrl+S` 写盘且存后 **0 ms** 干净 → 再打字 1 ms 又脏 → 一次 `Ctrl+Z` 回基线 **331 ms** 干净 → `Ctrl+S` 不写盘、提示「没有改动，未写入。」 → `Ctrl+Shift+Z` 重做 **33 ms** 又脏 → `Ctrl+S` 写回撤销前内容。

脏时切文档守卫（`.tmp/e2e-r57-guard.mjs`）：打字后拖入新文件，「切换文档」弹出，三钮「取消 / 不保存 / 保存并切换」齐全。

## 未覆盖
未跑 100 KB / 1 MB 逐键与撤销时延（上轮已量）；源码/预览/表格/公式/Mermaid 未单独跑（上轮 diff 未触及）。
