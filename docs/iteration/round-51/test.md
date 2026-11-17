# 第 51 轮测试报告（tester，A 轮）

- 轮前 startSha `fb6fe9a`；验收时 HEAD `a523a58`（v2 流程提交）；验收对象 A1/A2/A3。
- 结论：**PASS-WITH-UNVERIFIED**。门禁全绿；A1/A2/A3 验收逐条复跑通过；`data-safety` 5 条 FAIL 属脚本别处过期，非本轮回归（§4）。
- 未读 `impl.md`；脚本 `.tmp/e2e-r51-a{1,2,3}.mjs` 由 tester 重跑，日志 `.tmp/tester-r51-*.log`。

## 1 门禁

- `npm run verify`：**PASS**。首屏 gzip **295,476 B**（内部 310,000 / 硬线 320,000，余 24,524）。
- `npm test`：exit 0，**34 个文件 442 条 fail 0**（新增 `src/lib/saveDisk.test.ts` 8 条、`settings.test.ts` +2 条）。
- `npm run roundtrip`：未跑（未改编辑器与序列化）。

## 2 A1（B-006）保存链

假 FSA 计数（`.tmp/r51-fsa.mjs`）：`File.text`=读全文、`createWritable`=写盘、`getFile`=只取元数据。日志 `.tmp/tester-r51-a1.log`，errors `[]`。

- 1 MB `big.md`（1,000,012 字符 / 44,446 顶层块）打「甲」Ctrl+S：`text=0`、`writable=1`、`close=1`，磁盘含「甲」，**1,648 ms**。
- 紧接着再 Ctrl+S：四项计数全 0，toast「没有改动，未写入。」。
- 空文件 `empty.md` 打「甲」保存：`text=0`、`writable=1`、磁盘 `"甲"`。
- 外部改动（`__externalEdit` 经 writable 写、mtime +1000）后打「乙」保存：`text=1`、`writable=1`，磁盘为应用新正文（含「乙」；外部那段被覆盖属既有语义）。
- 不动字点「另存为」：`dirtyBefore=false` → `writable=1`，写到 `另存为.md`、toast「已保存 另存为.md」、docName 变 —— 另存为不受新门拦。
- 静态：新门只在 `goal==='file'` + `dirtyRef`（`src/App.tsx:3089`），`saveAs` 在 :3056 先分派；`performCommit` 短路在 target 分支（:2882-2886），不进 `finishSaved`；读回改 `getFile()` 元数据 + `reusableDiskText`（:2889-2891）；`rememberDisk` 6 入口。

## 3 A2（B-001+B-011）整页缩放 + 键位分层

日志 `.tmp/tester-r51-a2.log`，console 0。截图 `shots/round-51/impl-a2-zoom-120.png`（本轮重跑覆盖，1440×900）。

- `--page-zoom`：三次 Ctrl+Shift+= → **1.1 / 1.2 / 1.3**；Ctrl+Shift+- → **1.2**；Ctrl+Shift+0 → **1**；六步 `--editor-size` 全 **17px**。
- Ctrl+= → `--editor-size` **17→18px**，`--page-zoom` 仍 **1**（pageZoom 100）。
- 100/110/120%：documentElement 与 body 的 `scrollWidth-clientWidth`、高度溢出全 0；`#root` rect 恒 1440×900。
- Ctrl+滚轮：1.1 → 1.2（110→120）且两次 `defaultPrevented:true`；键位证据 key=`+` code=`Equal`。
- 刷新后 `--page-zoom=1.2`、`#root` computed zoom 1.2、localStorage `pageZoom:120`。
- 静态：`src/styles.css:115-118`（`#root{zoom;height:calc(100vh/…)}`）；键位分支在字号两条之前（`src/App.tsx:3982-3986`）；`ShortcutsDialog.tsx:46-48` 三行。

## 4 A3（B-008+B-005）视图钮 aria + 选择器

日志 `.tmp/tester-r51-a3.log`，console 0。

- 四钮初始 `aria-pressed=false`；点源码 → 源码 true / 预览 false；点预览 → 源码 false / 预览 true；专注、打字机各自 true，再点回 false。
- `aria-pressed` 全文 **6→10**；改前 :4956-4999 区间 0、改后视图组在 :5049-5100 共 4（行号因 A1/A2 插入右移）。
- 容器 `role="group" aria-label="视图"`。
- `node scripts/data-safety-acceptance.mjs`（`SIDELIGHT_URL=http://localhost:5175`，先 reset）：**20 PASS / 5 FAIL，exit 1**。三处选择器已生效（引用式链接、普通文档、另存为、新建四节全 PASS，脚本能跑到第 5 节）；FAIL 全在「别处过期」：
  - 宿主 3 条：`window.__io.messages` 现在含 `annotations-save`/`draft-save`，脚本按 `length===1` 与 `messages[0]` 取 save id，回 save-result 回错 id → dirty 仍 true（`scripts/data-safety-acceptance.mjs:244-254`）。
  - 表格 2 条：第 10 轮起「没动过的表格整块写回原文」，表格外改字不再产生「表格分隔行」损失，故不弹框（:303-309）。
  - 本轮 diff 不碰 `prepareSave`/`activeLosses`/`pendingConfirm`/宿主消息类型；同节紧邻的「普通文档直接写盘 = 1」证明打字后 `dirtyRef` 为真、新门未截断 → 判脚本过期，非回归。建议下一轮刷新这 5 条期望。
- A3 未新增测试文件；`src/lib/saveDisk.test.ts` 属 A1 的被测模块。

## 5 回归

- 未再跑 keyboard/tree/session（额度花在 A1 1 MB E2E 与 data-safety）。
- A2 的字号链已实测（`Ctrl+=` 17→18px，与整页缩放互不影响）。
- 跑完已 `git checkout -- shots/round-07/`（data-safety 写历史截图，见 AGENTS「踩过的坑」）。

## 6 UNVERIFIED

- 写盘期间切换/删除触发 `previousText` 回滚：假 FSA 造不出「写盘进行中身份变化」，回滚分支（`src/App.tsx:2915-2923`）本轮未触发。
- 真实磁盘 `lastModified` 粒度（NTFS 1–2 s）下的同秒外部改动；假 FSA 固定 +1000 ms 测不出。
- 宿主 WebView2 内的 Ctrl+滚轮 / 整页 zoom。
- 真实 IME 组合输入下的 Ctrl+Shift+= 键位。
