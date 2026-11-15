# 第 03 轮 · 实施报告 A 组（builder）

日期：2026-11-15。范围：T3 → T4 → T5。基线 `b434f25`。未 commit；未跑 `npm run build`（类型检查 `npx tsc --noEmit`，产物 `npx vite build --outDir .tmp/build-a`）；未装依赖。
边界：只改 `src/**`、`package.json`、`docs/CHANGELOG.md`、`.gitignore`、`.gitattributes`、`vite.config.ts`、`README.md`；`host/**`、`packaging/**` 一律未碰。

| 任务 | 结论 | 一句话证据 |
| :--- | :--- | :--- |
| T3 窄窗 + 错误反馈 + 小字 | **PASS** | 1024/1119/1120 三档 `scrollWidth === clientWidth`、四个按钮右缘 ≤ 视口；抽屉开/关焦点正确；401/断网/500/保存/导出都有中文「原因 + 下一步」；7 个选择器实测 12px |
| T4 示例状态一致 | **PASS** | 首屏名 `示例 · 未命名.md`、树「现在打开的是示例」、正文为示例；「试用示例」打开 `开始写.md` 且 `.tree-file.is-active[aria-current="true"]` |
| T5 版本 + CHANGELOG + 仓库卫生 | **PASS**（T2 后回填完成） | 0.17.0、CHANGELOG 0.17.0（含两轮漏记）、`release/` 忽略、`.gitattributes` 二进制规则、README 宿主段与安装器句、ADR-0004 载荷/zip/setup 实测、README/AGENTS 测试数 171（16 文件）全过 |

---

## 前置（本轮第一步，lead 指定）

`vite.config.ts` 的 `server.watch.ignored` 加 `'**/host/bin/**'` 与 `'**/release/**'`，`npx tsc --noEmit` exit 0。B 组反复重建 `host/bin` 不再触发整页刷新（上一轮的 `page reload host/bin/www/index.html` 噪声消失）。

## T3 窄窗 + 错误反馈 + 小字达标

### 改动文件

| 文件 | 改动 |
| :--- | :--- |
| `src/App.tsx` | `notice` 改成 `{ text, kind: 'info' \| 'error', action? }`（约 22 个 `setNotice` 调用点全部改写，删掉 `/失败\|错误\|无法\|不能/` 正则）；新增 `show()` 普通提示与 `fail()` 错误提示（401/断网给「打开设置」，其余给「重试」）；`saveBlob()` 包 try/catch，`commitSave` 无句柄分支与 `exportAs` 都兜底并保持 dirty；新增「批注」开关 `railOpen`、`closeRail/openRail`、Esc 关闭并归还焦点、`rail-backdrop` |
| `src/components/MarginRail.tsx` | 新增 `onClose` 与 `.rail-close` 关闭按钮，`aside` 加 `id="margin-rail"` 供 `aria-controls` |
| `src/lib/ai.ts` | 新增 `ModelRequestError`（`kind: auth/rate/network/server/unknown` + `status/detail`）、`requestChat()` 把 fetch 失败归为 network、`readSse` 用状态码归类；新增纯函数 `errorCopy(error)` 返回 `{ text, action?: 'settings' \| 'retry' }`，文案统一带「下一步」 |
| `src/lib/errorCopy.test.ts`（新） | 6 条单测：401/403 → auth + settings；429 → rate；TypeError/Failed to fetch → network；500 → server；未知 → unknown；每类文案含「下一步」，原始响应不进文案 |
| `package.json` | `test` 脚本末尾追加 `node --experimental-strip-types src/lib/errorCopy.test.ts`（只加这一条） |
| `src/styles.css` | 新增 `--text-xs: 12px` 并替换 7 处（`.field span`、`.rail-goal`、`.sidebar-tabs button`、`.rail-notice`、`.file-tree-name`、`.find-count`、`.risk-banner button`）；`@media (max-width: 1119px)`：`.app{min-width:0}`、顶栏/工具条 `height:auto;flex-wrap:wrap`、`.doc-layout` 单栏、`.margin-rail{display:none}`、`.app.rail-open .margin-rail` 固定抽屉（卡片改 `position:static`）、`.risk-banner{flex-wrap:wrap}`；toast 加 action/close 样式，错误用 `role="alert"` 不自动消失 |

### 门禁证据（CDP 探针 `.tmp/r3-t3.mjs`，dev 5173）

```
narrow 1024: {"scrollWidth":1024,"clientWidth":1024,"save":898,"settings":955,"source":968,"preview":1012}
narrow 1119: {"scrollWidth":1119,"clientWidth":1119,"save":993,"settings":1050,"source":1063,"preview":1107}
narrow 1120: {"scrollWidth":1120,"clientWidth":1120,"save":1051,"settings":1108,"source":1066,"preview":1110}
rail toggle count: 1 aria-expanded: false
drawer open: {"railDisplay":"block","railFixed":"fixed","closeVisible":true,"focusOnClose":true,"expanded":"true"}
drawer closed by Esc: {"railDisplay":"none","focusOnToggle":true,"expanded":"false","backdrop":0}
401 toast: {"role":"alert","text":"API Key 无效或没有权限。下一步：打开设置检查 Key 和接口地址。","action":"打开设置","close":true}
401 toast after 7s: 同上（仍在，不自动消失）
settings opened by toast action: 1
offline toast: {"role":"alert","text":"连不上接口地址。下一步：检查网络，或确认设置里的「接口地址」没填错。","action":"打开设置"}
500 toast: {"role":"alert","text":"模型接口返回 500。下一步：稍后重试；还不行就换模型或接口地址。","action":"重试"}
save toast: {"role":"status","text":"这篇还没有磁盘路径。副本已下载到「下载」文件夹；要写回原文件，先用「打开文件夹」打开它所在目录。"} dirty: true
export failure toast: {"role":"alert","text":"导出失败：blob 不可用。改动还在，可以再试一次。"} dirty: true
page errors: none
```

小字（`.tmp/r3-small.mjs`，自然状态实测，`.rail-notice` 见偏离 D5）：

```
sidebar-tabs button: 12px | field span: 12px | rail-goal: 12px | find-count: 12px
file-tree-name: 12px | risk-banner button: 12px | rail-notice (规则探针): 12px
```

截图：`shots/round-03/t3-narrow.png`（1024 顶栏/工具条全在）、`t3-drawer.png`（抽屉 + 焦点）、`t3-error.png`（导出失败 toast）、`t3-small.png`。

## T4 示例 / 未命名 / 「还没有打开文件夹」不再矛盾

### 改动

| 文件 | 改动 |
| :--- | :--- |
| `src/App.tsx` | 模块级 `DEMO_DOC_NAME = '示例 · 未命名.md'`，无草稿时初始名用它（已有草稿保留原名）；`onOpenDemo` 里 `const demo = demoWorkspace()` **只取一次**，`setWorkspace(demo)` 后 `flattenFiles(demo.root)[0]` 交给 `openWorkspaceFile`，真的打开第一篇 |
| `src/components/FileTree.tsx` | 示例空态：`现在打开的是示例` + `当前是示例，可以直接改`（三个按钮保留）；示例文件树项按 `path` 加 `aria-current="true"`（比较用 path，不是对象身份） |
| `src/styles.css` | 新增 `.file-tree-empty-title` / `.file-tree-empty-sub`（12px） |

### 门禁证据（`.tmp/r3-t4.mjs`）

```
first load: {"docName":"示例 · 未命名.md",
  "treeText":"现在打开的是示例当前是示例，可以直接改打开文件夹打开文件试用示例",
  "bodyStart":"侧灯这是 Sidelight 的原型。左","hasNew":false}
after demo: {"docName":"开始写.md","activeText":"开始写.md","activeAria":"true",
  "bodyStart":"开始写把光标放在这里，直接开始。不问你标", ...}
narrow buttons: 含「批注」，.rail-close aria-label = "关闭批注"；hasNew 仍为 false
```

截图：`shots/round-03/t4-first.png`、`t4-demo.png`。

## T5 版本 0.17.0 + CHANGELOG + 仓库卫生

### 改动

| 文件 | 改动 |
| :--- | :--- |
| `package.json` | `"version": "0.17.0"`（测试脚本行已在 T3 加过） |
| `docs/CHANGELOG.md` | 顶部新增 `## 0.17.0 — 2026-11-15`：宿主回环固定端口（FCP 2,040 → 296 ms、转发 reload 52 ms、origin 固定、旧 origin localStorage 一次性丢失）、转发前确认、长路径与启动失败错误窗、窄窗与批注抽屉、错误文案与不自动消失、示例状态、12px 小字、woff2 体积（产物 1,400,644 B）、per-user NSIS 安装器（setup 827,198 B / zip 904,736 B，带 SHA256）、补记第 1、2 轮（LICENSE/CONTRIBUTING/CI、批注焦点、模拟标注、对比度、宿主 spike、便携 zip） |
| `README.md` | 宿主段改为「宿主自己起回环 HTTP，固定端口 `127.0.0.1:47821`，origin 跨重启不变，首屏 FCP 296 ms」+ 安装器 827,198 B / 卸载保留用户数据 / 链 `packaging/README.md` 与 ADR-0005；「现在不能做什么」安装器句写成 per-user 安装路径；体积改 1,400,644 B；测试数 16 文件 171 条 |
| `.gitignore` | 加 `release/` |
| `.gitattributes` | 追加 `*.webp binary`、`*.jpg binary`、`*.exe binary`（保留 `*.png`/`*.ico`） |
| `vite.config.ts` | 本轮第一步已加 `**/host/bin/**` 与 `**/release/**` |

### 门禁证据

```
node -e "console.log(require('./package.json').version)"   → 0.17.0
Select-String docs/CHANGELOG.md -SimpleMatch '## 0.17.0 — 2026-11-15'  → line 5（1 处）
Select-String docs/CHANGELOG.md -SimpleMatch '[日]'        → 0 命中
Select-String docs/CHANGELOG.md -SimpleMatch '便携'         → line 18
Select-String docs/CHANGELOG.md -SimpleMatch '转发前确认'    → line 10
git check-ignore -v release/x.zip                          → .gitignore:10:release/  release/x.zip
Select-String vite.config.ts '**/host/bin/**','**/release/**' → line 19 / 20（各 1）
(git ls-files shots | Measure-Object -Line).Lines          → 108（没删截图）
```

### T2 后回填（第 03 轮收尾，lead 给的实测值）

| 位置 | 回填内容 |
| :--- | :--- |
| `README.md` | 开头与「现在不能做什么」改成有 per-user 安装包：`release/Sidelight-0.17.0-win-x64-setup.exe` 827,198 B，装到 `%LOCALAPPDATA%\Programs\Sidelight`，卸载保留用户数据，链 `packaging/README.md`；宿主段补安装包 827,198 B；体积 1,400,644 B；测试数 16 文件 171 条 |
| `AGENTS.md` | 门禁里的测试数 `15 个测试文件，共 165 个` → `16 个测试文件，共 171 个`，并补「错误文案」一类 |
| `docs/CHANGELOG.md` | 安装器行 `[TBD]` → setup 827,198 B + SHA256 `251FB3…`、便携 zip 904,736 B + SHA256 `6EE283…`；体积 1,400,644 B |
| `docs/adr/0004-…md` | 载荷段改为第 03 轮实测 2,389,352 B（bin 988,708 + www 1,400,644）；zip 904,736 B、setup 827,198 B 与两个 SHA256；第 02 轮数字标为历史对照；「无卸载」改成「卸载删安装目录、保留 `%LOCALAPPDATA%\Sidelight`」 |
| `docs/adr/0005-…md` | 无体积/哈希陈述（只有 origin 变更代价与 FCP），未改 |

回填后断言（全部通过）：

```
node -e "require('./package.json').version"                       → 0.17.0
Select-String README.md -SimpleMatch '没有安装器','162','165'      → 0 命中
Select-String README.md -SimpleMatch '827,198','%LOCALAPPDATA%\Programs\Sidelight','packaging/README.md','171','1,400,644'
                                                                  → 第 39 / 51 / 60 / 67 行命中
Select-String AGENTS.md -SimpleMatch '16 个测试文件','171'          → 第 38 行
Select-String docs/CHANGELOG.md -SimpleMatch '[TBD]'               → 0 命中
Select-String docs/CHANGELOG.md -SimpleMatch '827,198','904,736','## 0.17.0 — 2026-11-15'
                                                                  → 第 17 / 17 / 5 行
Select-String docs/adr/0004-… -SimpleMatch '2,389,352','904,736','827,198',两个 SHA256
                                                                  → 第 45 / 47 行命中
git check-ignore -v release/x.zip                                 → .gitignore:10:release/
Get-FileHash release/Sidelight-0.17.0-* -Algorithm SHA256         → 与 lead 给的 6EE283… / 251FB3… 一致
npm test                                                          → 16 个文件、171 条断言、0 失败
```


## 门禁汇总

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 个文件、171 条断言、0 失败（165 + errorCopy 6）
npx vite build --outDir .tmp/build-a  → exit 0，113 个模块，产物合计 1,400,644 B
```

## 与计划的偏离

- **D1（README 安装器句：先跳过后回填）**：T5 首交时 `release/` 只有 0.16.3 产物，按 lead 指令「没有 0.17.0 就跳过并标待 T2」，README 当时保留「没有安装器」、CHANGELOG 留 `[TBD]`。T2 完成后按实测回填：setup 827,198 B / zip 904,736 B / 两个 SHA256；`[TBD]` 已清零。
- **D2（ADR-0004 取数：回填时补做）**：T5 首交时 lead 边界不含 `docs/adr/**`，未做；收尾时 lead 明确要求更新 ADR-0004，已现场跑取数命令（2,389,352 B）并回填 zip/setup 字节与哈希。ADR-0005 没有体积/哈希陈述，只保留 origin 变更代价与 FCP，未改。
- **D3（本机 Vite 模块缓存）**：改完 `src/` 后页面会继续渲染旧 DOM，必须重启 dev server（`AGENTS.md` 记过同类现象）。本轮重启 3 次；**当前 5173 后台跑的是最终代码**。加 `watch.ignored` 后 `host/bin`/`release` 的外部写入不再触发整页刷新。
- **D4（错误提示的关闭方式）**：计划写「不自动消失、带打开设置或重试」；实现为不自动消失 + 额外给一个 `×` 关闭按钮（findings 允许「或给关闭按钮」），普通提示仍 6 s 消失。`errorCopy` 只接模型请求路径（分析、追问）；搜索/文件读写失败仍用原始 `messageOf` + `kind:'error'`，避免把「文件读不出来」说成「API Key 无效」。
- **D5（`.rail-notice` 的 12px 证据）**：这条只在「有批注没定位到」时出现，本轮没稳定造出该状态，用「插入同类节点量计算字号」证明 CSS 规则为 12px；另外 6 个选择器都是自然状态实测。
- **D6（窄窗按钮右缘）**：1024/1119/1120 三档四个按钮右缘分别为 1012 / 1107 / 1110，都在 `innerWidth` 内；1120 档仍走宽窗布局（`scrollWidth===clientWidth`）。
- **D7（初始文档名的范围）**：`示例 · 未命名.md` 只在「没有草稿」或「草稿缺 name」时生效；已有草稿按其保存的名字恢复，避免把用户文档改名。

## 文件清单

- 修改：`src/App.tsx`、`src/components/MarginRail.tsx`、`src/components/FileTree.tsx`、`src/lib/ai.ts`、`src/styles.css`、`package.json`、`docs/CHANGELOG.md`、`README.md`、`AGENTS.md`、`docs/adr/0004-webview2-host-before-admin.md`、`.gitignore`、`.gitattributes`、`vite.config.ts`
- 新建：`src/lib/errorCopy.test.ts`、`docs/iteration/round-03/impl-a.md`
- 截图：`shots/round-03/t3-narrow.png`、`t3-drawer.png`、`t3-error.png`、`t3-small.png`、`t4-first.png`、`t4-demo.png`
- 临时探针（`.tmp/`，不入库）：`r3-t3.mjs`、`r3-small.mjs`、`r3-t4.mjs`
- 未碰：`host/**`、`packaging/**`、`docs/adr/0005-…`、`scripts/**`

## 遗留

1. 安装实测里 HKCU 卸载项在本沙箱写不进去（lead 已记 UNVERIFIED），与文档数字无关。
2. 复验前若见到旧界面，先重启 `npm run dev`（Vite 模块缓存，当前已在跑最新代码）。
3. `.rail-notice` 的 12px 只有规则级证据，建议 tester 在真实「定位失败」场景补一次实测。
4. 未 commit；未跑 `npm run build`；未装依赖；未重新打包。
