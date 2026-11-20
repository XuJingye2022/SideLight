# 第 114 轮 A2 验收清单（E2E，14 条）

口径：`S`＝`.sidelight/`，`R`＝`.sidelight/revisions/`；自造假 FSA，`ops` 记 `read:/create:/write:/remove:`；ego CDP 57270、1440×900。

1. 无 `.sidelight` 的新工作区点「在审」到渲染完：`S` 读 **0** 写 **0**、`root.dirs` 无 `.sidelight`、`.rail-snap-empty` 在（CR-1 的 E2E 对照）。
2. `Ctrl+S` 存一次 → `R` 恰 1 份。
3. 照首份名的 `<hash>` 补 7 份（新 base36 时刻、相邻 60 s、新 8 位 hex id；文件名与 JSON 的 `savedAt` 同值）+ 坏名 1 + 他键 1，其中 1 份 JSON `savedAt:0` 作「文件名优先」的对照（CR-3）。
4. 再开面板：`.rail-snap-row` 恰 **8**、`read:R` 恰 **8**（坏名/他键不读）、`S` 下 create/write/remove **0**（CR-4②）。
5. 8 行时刻严格降序。
6. 首行匹配 `/\d\d-\d\d \d\d:\d\d:\d\d/`（本地时区、补零）。
7. `savedAt:0` 那行仍显示文件名时刻，不是 1970（CR-3）。
8. 各行 `open` 数与种子一致。
9. `.rail-snap-note` 与 `README.md` 同一句（D2）。
10. 无工作区（单文件打开）：只出「先点「打开文件夹」」提示，`.rail-snap` **0**。
11. 读取中关闭面板 → 无过期行（CR-4③）。
12. 面板开着换文档 → `.rail-snap` **0**，无旧行（CR-4③）。
13. 1440×900 与 1024×700 两档：sheet 横向溢出 0。
14. 0 pageerror；`.rail-review-row` 行数与改前一致（在审列表未被影响）。

截图：`shots/round-114/revision-snapshots.png`（仅 1 张）。
