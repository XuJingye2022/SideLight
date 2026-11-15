# 第 05 轮 · 独立验收（tester）

日期：2026-11-15。基线 `11c3348`，v0.18.0。环境：Windows 11、Node 24.21.0、npm 11.19.0、无管理员；dev `http://localhost:5173`（验收开始时掉线，已告知 lead 并由 tester 启动一次；之后稳定 200）；CDP 9222/9224。

方法：先按 T1 → T2 → T3 → T4 → T5 → 回归 → 范围的顺序自己跑，得出每项结论后才读 `impl-a.md` / `impl-b.md` 对照。未改产品代码、未 commit。

## 门禁

| 命令 | 结果 | 证据 |
| :--- | :--- | :--- |
| `npm run build` | **exit 0**，116 modules，**0 warning**，211 ms | `.tmp/r5-build.log` |
| `npm test` | **16 个文件、177 条断言、0 失败**，exit 0 | `.tmp/r5-test.log` |
| `npm run roundtrip` | exit 0；当前应用 **3 / 7 完全保真**（03/05/07 保真，02/04/空行仍有 diff） | `.tmp/r5-roundtrip.log` |

- `dist` 合计 **1,373,690 B**；主 chunk `index-Cshe1Cx0.js` **1,105.52 kB / gzip 345.91 kB**；CSS **53.00 kB / gzip 13.34 kB**。
- `vite.config.ts` 的 `chunkSizeWarningLimit: 1200`；构建日志无 `Some chunks are larger`。

## T1 键盘与焦点：**PASS（浏览器保留键 UNVERIFIED）**

`node scripts/keyboard-acceptance.mjs` → **28/28 PASS**：

```text
PASS 第一下 Tab 是 skip link；skip link 后焦点在 #editor 内
PASS Ctrl+Alt+S 调 picker、正文无 <s>、文档名变化、dirty=false
PASS Ctrl+S 写回当前文件、不再弹 picker
PASS Ctrl+Shift+S 不划删除线、不调 picker、不出现新的已保存/已取消提示
PASS Ctrl+Alt+N 得到空 未命名.md、dirty=false、焦点在正文
PASS 脏文档 Ctrl+Alt+N 弹未保存确认
PASS Ctrl+Alt+O / Ctrl+Alt+Shift+O 分别调用两个 picker
PASS Ctrl+Alt+E 打开导出菜单且焦点在第一项；ArrowDown+Enter 触发下载
PASS 文件菜单焦点进首项、方向键移动、Esc 回「文件」、另存为后回触发器
PASS opener 已卸载时 Esc 后焦点不落 body
PASS ? 打开一览、Esc 关闭；正文输入 ? 不弹
PASS 纯键盘 E2E 导出 HTML 含正文；页面没有脚本错误
```

自写独立复核 `.tmp/r5-t1-extra.mjs` → **12/12 PASS**：`Ctrl+Shift+S` 无 `<s>`、picker 不增、无「已保存」；`Ctrl+Alt+S` 调 picker、`Ctrl+S` 不重复弹；`Ctrl+Alt+N` 得 `未命名.md`；`Ctrl+Alt+E` 焦点在第一项、键盘导出 HTML 有内容；第一下 Tab 是 skip link；文件菜单方向键/`aria-keyshortcuts`/Esc 归还；`?` 正文不弹、非输入区弹；纯键盘 E2E 导出的 HTML 含 `键盘链路-KB`。

- **UNVERIFIED**：真实浏览器保留键（`Ctrl+Shift+S` 是否弹「保存网页」、`Ctrl+Alt+*` 是否被浏览器/系统抢）、AltGr 冲突、真实中文输入法；CDP 只能发合成按键。
- 截图：`shots/round-05/t1-skip.png`、`t1-filemenu.png`、`t1-shortcuts.png`。

## T2 主题：**PASS**

`node scripts/theme-acceptance.mjs` → **16/16 PASS**：

```text
PASS 默认主题跟随系统；设置首行三档（浅色|深色|跟随系统）
PASS 深色即时预览 data-theme=dark、color-scheme=dark、页面底色 rgb(21,23,26)
PASS 深色 reload 后保留；深色对比度 ink-faint 6.8 / mark 6.67
PASS 深色 reload 前 4 帧没有白帧（亮度 [27,24,24,27]）
PASS 浅色即时预览 color-scheme=light、reload 保留
PASS 跟随系统 + 系统深色 → color-scheme=dark、变量 #15171a
PASS 取消设置还原到已保存主题
PASS index.html 内联主题脚本在模块脚本之前
```

- 截图：`shots/round-05/t2-light-1440.png`、`t2-dark-1440.png`、`t2-dark-settings.png`、`t2-system-dark.png`。
- 说明：`shots/round-05/dark-reload-frame-01-white-flash.jpg` 是更早的实现期旧证据（20:23:52），当前 screencast 4 帧亮度为 `[27,24,24,27]`，不是本轮白闪；建议收尾时改名或移出，避免误读。

## T3 导出公式：**PASS**

`node scripts/export-math-acceptance.mjs` → **10/10 PASS**：

```text
PASS 文档里有行内与块级公式节点
PASS HTML 导出含 MathML <math>、含 E=mc^2、无空 data-latex span、保留 data-latex
PASS TXT 导出行内 $E=mc^2$、块级 $$…$$
PASS HTML/TXT 文件名跟文档名
PASS 导出的 HTML 直接用浏览器打开能看到公式文字
```

- `npm test` 的 `export.test.ts` 由 10 条增至 **16 条**，覆盖真实 `editor.getHTML()` 输出、`data-latex` 属性顺序、非法 latex 回退、TXT 保留 `$latex$`；全绿。
- 截图：`shots/round-05/t3-export-mathml.png`。

## T4 构建口径 / shot 参数：**PASS（有测试副作用说明）**

- 构建：**0 warning**；主 chunk 1,105.52 kB / gzip 345.91 kB；`chunkSizeWarningLimit: 1200`；README 有「为什么不拆 KaTeX」。
- `node scripts/shot.mjs`（不带 `--out`）：输出 `shot: .tmp/shots/shot.png`，文件生成；运行前后 `git status --porcelain shots` 均为 5 项，默认路径**没有新增/覆盖 `shots/`**。
- `node scripts/shot.mjs --out shots/round-05/t4-shot.png`：生成指定文件，exit 0。
- 说明：验收期间其他回归脚本（acceptance / host-smoke / portable verify）重写了 4 张旧截图，最终 `git status` 有 9 张 shots 改动；其中 5 张在开工前就已存在，默认 shot 本身没有新增。不是 T4 参数改动造成的产品问题。

## T5 字体裁剪：**PASS**

- `dist`：**15 个 woff2 / 213,664 B**；CSS `@font-face` **16**（15 个文件 + 1 个 `KaTeX_Size3` data URI）。
- `scripts/vite-woff2-only.mjs`：`EXPECTED_FACES = 16`、`DROPPED_FACES` 存在；4 个装饰 face（Fraktur-Bold、Caligraphic-Bold、SansSerif-Bold、SansSerif-Italic）已从 CSS/资产移除。
- `node scripts/font-probe.mjs` → **2/2 PASS**：被删 4 个 face 未被请求（`请求 9 个 woff2`），Regular 族仍加载（`loaded=20 katex=10/10`）。
- 安装包：setup **788,878 B**（sha256 `FE5AC409…BB94`），便携 zip **866,981 B**（sha256 `F866D2AA…FE6E`）；`verify-installer` / `verify-portable` 均通过。
- README 体积段已写「213,664 B / 15 文件（另 1 个 face 内联）+ 不影响首屏」。

## 回归

| 项 | 结果 | 证据 |
| :--- | :--- | :--- |
| `save-acceptance` | **25/25 PASS** | `.tmp/r5-save.log` |
| `filemenu-acceptance` | **31/31 PASS** | `.tmp/r5-filemenu.log` |
| `export-acceptance` | **7/7 PASS** | `.tmp/r5-export.log` |
| `readonly-acceptance`（重跑宿主） | **14/14 PASS** | `.tmp/r5-readonly.log` |
| `node scripts/acceptance.mjs http://localhost:4173`（生产构建） | **11/11 PASS**（`faces=16/16`） | `.tmp/r5-acceptance-prod-fixed.log` |
| `node scripts/acceptance.mjs`（dev 5173） | **11/11 PASS**（`faces=20/20`，复验修复后） | `.tmp/r5-acceptance-dev-fixed.log` |
| `host-smoke --fsa` | **7/7 PASS**（`navStarts=2`、FSA hash `d39d21fa→2f51a58d`） | `.tmp/r5-host-smoke.log` |
| `host/fcp-probe.mjs` | **6/6 PASS**（FCP 228 ms、reload 64 ms、origin/持久化/穿越/MIME） | `.tmp/r5-fcp.log` |
| `verify-installer`（0.18.0） | exit 0；装/启/卸/数据保留 PASS；HKCU/开始菜单 3 项 UNVERIFIED | `.tmp/r5-verify-installer.log` |
| `verify-portable` | **6/6 PASS**（0.18.0 zip，26 条目） | `.tmp/r5-verify-portable.log` |

**Acceptance 复验**：初次验收 dev 因 `faces=20` 期望 16 判 FAIL；lead 修脚本后复验——`expectedFaces = port === '4173' ? 16 : 20`，断言仍是 `fonts.faces === expectedFaces` 的**等号**（没有放宽成 `≥`）。dev `http://localhost:5173` **11/11 PASS**（`faces=20/20`），生产预览 `http://localhost:4173` **11/11 PASS**（`faces=16/16`）。

## 文档与范围

- README/AGENTS/CHANGELOG：无 `[TBD]`；0.18.0 条目有键盘、主题、MathML/TXT、构建口径、字体裁剪、体积/测试，且无旧的 0.17.0 构建名；0.17.0 历史条目保留（合理）。
- `ADR-0004` 载荷取数命令实测 **2,365,470 B**（991,780 + 1,373,690），与文档一致；zip/setup 新 SHA256 一致。
- `git status`：28 个已跟踪文件改动；14 项未跟踪（`docs/iteration/round-05/**`、4 个新验收脚本、`src/components/ShortcutsDialog.tsx`、`shots/round-05/**`、本报告）。`git diff --stat`：28 文件，714 insertions / 70 deletions。
- `package-lock.json` 版本 **0.18.0**；`release/` 只含 0.18.0 zip/setup；`release/`、`host/bin/`、`dist/` 均未入库（`git ls-files` 为空）；无密钥、无调试残留；`npm test` 仍是 16 文件 177 条，新验收脚本未挂入门禁。
- 测试副作用：`shots/acceptance.png`、`shots/round-01/t3-{window,fsa}.png`、`shots/round-02/t4-portable.png`、`shots/round-04/*` 共 9 张被回归脚本重写；默认 shot 本身无新增。

## 与实施报告对照

- `impl-a.md` 的 T1/T2/T3 结论与我的实测一致；T1 的 28/28、T2 的 16/16、T3 的 10/10 均可复跑。
- `impl-b.md` 的 T4/T5 结论与我的实测一致：0 warning、15 woff2/213,664、16 face、被删 face 无请求、zip/setup 体积与 SHA 均符。
- **实施报告没有覆盖 dev acceptance 的 20 vs 16 差异**；初次验收因此判 FAIL，lead 修脚本后复验 dev 20/20、preview 16/16 均 11/11；不是产品缺陷。
- 未发现验收项造假；两次 acceptance、save/filemenu/export/readonly、host smoke、fcp、installer、portable 均通过。

## 最终判定

**PASS-WITH-UNVERIFIED（复验范围：`acceptance` 的 dev 5173 / 生产预览 4173；T1–T5 原判定保留）**

- T1、T2、T3、T4、T5 产品验收全部通过；门禁 build（0 warning）/test（177）/roundtrip 通过。
- Acceptance 复验：`node scripts/acceptance.mjs`（dev）**11/11 PASS**（`faces=20/20`）；`node scripts/acceptance.mjs http://localhost:4173`（预览）**11/11 PASS**（`faces=16/16`）。脚本按端口选择期望值，断言仍是等号，没有放宽成 `≥`。
- **UNVERIFIED**（不凑 PASS）：真实浏览器保留键/AltGr、真实中文输入法、真实系统保存对话框、HKCU/快捷方式/默认安装路径、真人双击/SmartScreen、宿主下载落盘（上一轮遗留 FileFailed）。
- 非阻断：`shots/round-05/dark-reload-frame-01-white-flash.jpg` 是更早的实现期旧证据；默认 shot 本身无新增但回归重写了 9 张旧图；T5 文档的 0.18 条目保留“256,168 → 213,664”的前后对照（不是当前值）。
