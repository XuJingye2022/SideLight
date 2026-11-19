# 第 100 轮执行报告（executor，B-227）

startSha `537c633`；A3 归 tester。不 commit/push、不改版本与 `release/`。

## A1 纯函数 + 单测 —— DONE

- 新 `src/lib/diffView.ts`：`diffView(before, after, {context=2,maxRows=400,maxLine=500})` → `{rows,added,removed,truncated}`；只调 `diff.ts` 的 `diffLines`。改动块前后留 `context` 行、重叠/相邻窗口合并、超 `maxRows` 截后段置 `truncated`、计数按全文、单行超 `maxLine` 截 500+「…」、无改动空 rows。
- 新 `src/lib/diffView.test.ts` **14 条**；`package.json` 的 `test` 链尾追加。
- `node --experimental-strip-types src/lib/diffView.test.ts` → 14/14；`npm test` → **60 文件 848 条 0 fail**（日志 `.tmp/r100-impl-npmtest.log`）；`git diff --stat src/lib/diff.ts` 空。

## A2 UI 接线 —— DONE

- `MarginRail.tsx`：`.rail-head` 末尾 `button.rail-diff-open`（「对比」、`aria-haspopup`、`title`，仅批注页签）；`getDiff` prop；portal 面板 `.rail-diff-overlay` + `.rail-diff-sheet`（`role=dialog`/`aria-modal`/`aria-labelledby=rail-diff-title`/`tabIndex=-1`）；点入口现算；三支空态；关闭钮 / Esc（document 级 + `stopPropagation`）/ 背板关闭；`useDialogFocus(…, '.rail-diff-overlay', railTab === 'notes')`，切页签清空面板让 hook 走清理。
- `App.tsx`：新 `openedBaselineRef`（`:661`），写 4 处（初始恢复 `:1362`、宿主正文 `:1414` 用 `hostSerialized`、宿主不可用 `:1474`、`loadIntoEditor` `:2605`），写盘 `:3314` 与宿主回包 `:4272` 不写；只加 `getDiff` prop（`:6012`）。
- `styles.css`：新 **13 组**规则（`.rail-diff-*` + `.rail-count ~ .rail-diff-open`），git diff 0 删除行 → `.rail-head`/`.rail-tabs` 规则块未动。
- 静态：`rail-diff` 2 文件、`getDiff` 5 处、`diffView` 在 `App.tsx` **0**。
- 体积：`npm run build` exit 0；`measure-first-screen --dir dist --max 315500` → **gzip 315,022 B**（raw 1,021,819、余 478）**PASS**；对 314,726 **净 +296 B**；超内部预算 5,022（只 WARN）。
- 未跑 `roundtrip`（未碰编辑器/序列化）。

## 自测（非验收；ego CDP 57270）

页面 **1432×882**（窗口 1456×974；深色主题）。
- 合成 drop 载入 `diff.md`（走 `loadIntoEditor`）后首开面板：rows 0、无计数、空态「与打开时相比，没有改动。」。
- 改第二段 + 文末加一行：**+3 −1**，added 3 / removed 1 / same 4，含「新增的一行。」。
- 面板 ARIA 四件齐；可编辑控件 **0**；无横溢。
- 关闭钮与 Esc 都关闭、`[inert]` **0**、焦点回 **`.rail-diff-open`**；Esc 时同屏的「切换文档」框未被连带关（未冒泡到 App 链）。
- 页签：对话入口 **0**、批注 **1**。几何：head 高 15（无钮）/16（有钮，≤16.5）；tabs 底 − head 底 **39**。
- 1016×714 抽屉态：面板宽 760、无横溢、仍 +3 −1。
- 截图 `shots/round-100/diff.png`。

## 未验（交 tester）

假 FSA + `autoSave:true` 2.6 s 落盘后仍 +3 −1、3 卡几何、⑦ 的 parse/dirty/0 写、⑧ 1 MB 计时与 rows ≤400、精确 1440×900 与 1024、宿主 `/__doc` 路径（P1-1 只做代码级修法）。

## CHANGELOG 建议

`- 侧灯栏新增「对比」：只读面板按行显示「与打开时相比」的改动（+N −M 行），保存不清零，重开文件回到空态。`

## 新踩坑

1. **脏文档下 `location.reload()` 被 beforeunload 拦下，页面原样不动**：先看到的 `before === ''` 是「原 mount 的空草稿」，不是新代码坏了。判真刷新看 fiber 里 `initial.text` 长度，别只看 `.ProseMirror.innerText`。
2. **合成 drop 能走通「拖入 .md 打开」全链**（`new DataTransfer()` + `DragEvent('drop')`）：脏文档先弹「切换文档」，选「不保存」直接切；「保存并切换」会弹系统 picker。
3. **`ego_snapshot` 的 ref 会连续 `STALE_REF`**（页面在动时）：改用 `xpath=//button[normalize-space(.)='…']`；整窗 `ego_screenshot` 偶发拼进陈旧合成帧，等 600 ms 重拍即干净。
