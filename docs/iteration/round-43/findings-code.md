# 第 43 轮 · finder-code（代码质量与性能，只读）

- 轮前 startSha：`0f83e1f80f57d93e0860282a0d3b0bc2b7953750`（`git rev-parse HEAD` 实测一致；开工时工作树干净，收工时只多出未跟踪的 `docs/iteration/round-43/` 与本轮脚本产出的 `shots/round-43/`）
- 环境：dev server `http://localhost:5175`（未起、未重启）、CDP **9225**（页面级 WS 直连，复用 `.tmp/r41-cdp.mjs`）、Node 24.21
- 本轮新写脚本（都在 `.tmp/`，复跑前先 `node .tmp/reset.mjs 9225`）：
  - `.tmp/e2e-r43-code-perf.mjs` → `.tmp/perf-round43-code.json`：100 KB / 1 MB 载入埋点、逐键、空闲派生、源码往返、Ctrl+S、滚轮帧率、内存与 DOM 计数
  - `.tmp/e2e-r43-code-probe.mjs` → `.tmp/perf-round43-risk.json`：`classify`/`diffLines`/`baselineLosses` 纯函数矩阵 + 退出源码的采样剖析（`Profiler`）
  - `.tmp/e2e-r43-code-risk2.mjs` → `.tmp/perf-round43-risk2.json`：短行文档（24 KB/4,003 行、50 KB/2,003 行）的载入间隔与 `baselineLosses` 冷/热耗时
  - `.tmp/e2e-r43-code-shots.mjs` → `shots/round-43/code-*.png`：三张端到端截图
- 端到端走过的用户路径：100 KB 打开→滚轮 20 次（截图）；1 MB 打开→`Ctrl+/` 进源码（截图，值长 1,025,032）；1 MB 回编辑→`Ctrl+S`（截图，`toast` =「已取消保存。」）；1 MB 逐键 12 字 + 空闲 3.5 s；同页源码往返 100 KB / 1 MB 各一次。

---

## 结论摘要（5 条，按优先级）

| # | 标题 | 级别 | 指标（本轮实测） |
| --- | --- | --- | --- |
| F1 | 载入路径的 `baselineLosses` 用 LCS 差分算「空行增删」，成本按**行数²**增长；无相等快路径 | **P2** | 1 MB/2,050 行 **76.8 ms**（App 内冷测）、100 KB 28.3 ms、50 KB/2,003 行 22.4 ms；>4,000 行走粗差分只要 6 ms |
| F2 | 退出源码的整篇 parse 已省掉（第 42 轮修复有效），剩 **284–315 ms** 里有一次白算的 `countText` | **P2** | 1 MB 出源码 284/315 ms；剖析：`updateStateInner` 71.3 + `getBoundingClientRect` 69.3 + `countCjk` 21.3 ms |
| F3 | `App.tsx` 单文件 5,379 行 / 190,996 B、**221 个 hook**、`App.tsx` 本身 0 条单测 | **P2** | 35 `useState` + 53 `useEffect` + 95 `useCallback` + 36 `useRef` + 2 `useMemo` |
| F4 | `src/lib` 10 个模块没有直接单测，其中 `rename.ts`、`workspace.ts` 是不可逆文件操作的唯一实现 | **P2** | 41 个 lib 模块 / 29 个 test 文件；`rename`、`workspace` 无任何 test 引用 |
| F5 | 死符号与 `noUnusedLocals` 第 4 轮仍原样（第 39/40/42 轮已报，上一轮计划已写死删除步骤但被预砍） | **P2** | `serializeBody` 1 处定义 0 调用、`clearSession` 0 引用、`App.tsx:178` 悬空注释 |

`actionable_count = 5`（F1–F4 有本轮实测；F5 是纯静态但上轮计划已给过证据口径，本轮用同一口径复核）。

同时验证了第 42 轮的两处修复在本轮 HEAD 仍然有效，不重复旧结论（见 §4）。

---

## F1（P2）载入时的 `baselineLosses` 用 LCS 算空行增删，成本按行数²；相等文档也没有快路径

### 1.1 调用链

`src/App.tsx:1079`（宿主文档）与 `src/App.tsx:2072`（文件树打开）→ `baselineLosses`（`src/lib/risk.ts:361`）→ `classify`（`:319`）→ 末尾 `diffLines(beforeText, afterText)`（`:344`，只为数 `blank-lines`）→ `diffByLcs`（`src/lib/diff.ts:44`）。

`diffByLcs` 分配方向表 `dir = new Uint8Array((n+1)*(m+1))`（`src/lib/diff.ts:48`，`:42` 的注释自己写着「两侧各 4000 行时约 16MB」），然后跑 `n×m` 次双循环（`:52-70`）。行数上限 `MAX_DIFF_LINES = 4000`（`:9`），超过就走 `diffCoarse`（`:132`）。

**注意：启动时从 localStorage 恢复文档的路径不调用它**——`src/App.tsx:1028-1046` 只写 `baselineRef`。本轮实测该路径 `sl-serialize-done → sl-sync-done` 只差 **1.1 ms**（50 KB 样本）。所以这条成本只在「文件树打开 / 宿主打开」时出现。

### 1.2 实测

同一个页面里直调纯函数（`.tmp/perf-round43-risk.json`，3–5 次取中位；App 内那次是第一次调用）：

| 形状 | 字节 | 行数 | `diffLines(t,t)` | `classify(t,t)` | `baselineLosses(t,t)`（App 内首次） |
| --- | --- | --- | --- | --- | --- |
| 100 KB / 1,025 段 | 101,381 | 2,050 | 35.0 ms（冷） | 13.8 ms | **28.3 ms** |
| 1 MB / 1,025 段 | 1,025,029 | 2,050 | 69.9 ms（冷） | 15.1 ms | **76.8 ms** |
| 50 KB / 2,000 短行 | 50,008 | 2,003 | — | — | 22.4 ms（冷）/ 11.3–12.9（热） |
| 24 KB / 4,000 短行 | 24,008 | 4,003 | — | — | 6.0 ms（走 `diffCoarse`，因为 >4,000 行） |
| 100 KB / 3,900 段 | 101,405 | 7,802 | 0.5 ms | 4.3 ms | 3.5 ms |

读法：

1. **字节不是驱动量，行数才是**：50 KB 的短行文档（2,003 行）比 24 KB 的 4,003 行文档贵 3.7 倍，而后者反而因为越过 4,000 行走粗差分只要 6 ms。
2. 冷/热差 3–5 倍（`Uint8Array` 4–16 MB 分配 + 首次 JIT）。真实载入是冷的一次，取冷数。
3. 上界：行数 ≤4,000 时最多 16M 个单元（`diff.ts:42` 注释），按 2,050 行 69.9 ms 线性外推约 **270 ms**（未实测，见 §6）。

### 1.3 放大点：自动保存也会跑一次

`activeLosses`（`src/lib/risk.ts:373`）在基线非空或有脚注定义时会再跑一次 `classify`：`src/App.tsx:2911`（保存前）与 `src/App.tsx:3186`（自动保存，停笔 2 s）。对「有结构损失基线」的 1 MB 文档，等于每 2 s 空闲再付 15–77 ms。基线为空的普通文档有早退（实测 `activeLosses` 0.2 ms），不受影响。

### 1.4 改法（三条，按风险从低到高）

1. **精确相等快路径**（最小改动）：

   ```ts
   // src/lib/risk.ts 的 classify 开头
   const beforeText = before.replace(/\r\n?/g, '\n')
   const afterText = after.replace(/\r\n?/g, '\n')
   if (beforeText === afterText) return []   // 逐字节相同 ⇒ 不可能有任何损失
   ```

   这是**精确**的，不是启发式：本轮对 4 种形状实测 `classify(text, text).length === 0`（探针字段 `lossesWhenEqual`，4/4）。现实里的「打开→不改→保存」文档（现存保真样本大多逐字节不变）会跳过全部 6 个损失族 + LCS。
2. **把 `baselineLosses` 移出载入同步段**：它只用于横幅 `setRisks`（`App.tsx:2073`）与自动保存门禁，可用 `setTimeout(…, 0)` 或 `requestIdleCallback` 放到首帧后（收益最直接，但改变「横幅出现的时机」，要产品确认）。
3. 若还想覆盖「不相等但空行没变」的多行文档：`diffLines` 在两侧都 >1,000 行时改用 `diffCoarse`（`blank-lines` 计数语义对绝大多数文档等价，但严格说不是逐字节精确，需产品判断）。

- 风险：**低**。`src/lib/risk.test.ts` 存在（基线损失有单测），改后跑 `npm test` + `npm run roundtrip`。
- 验收：`node .tmp/e2e-r43-code-risk2.mjs 9225` 前后对比 `risk.cold`；文件树路径见 §6 的补测方法。

---

## F2（P2）退出源码剩 284–315 ms（1 MB）：整篇 parse 已省掉，其中 21 ms 是白算的 `countText`

### 2.1 实测

`.tmp/perf-round43-code.json` 的 `sourceToggle`（真按键 `Ctrl+/`，`window.__slState.viewMode` 轮询确认）：

| 文档 | 进源码 | 出源码 | `sl-parse-done` 条数（进之前 → 出之后） |
| --- | --- | --- | --- |
| 100 KB / 1,025 段 | 82 ms | **77 ms** | 2 → 2 |
| 1 MB / 1,025 段 | 345 ms | **284 ms**（探针脚本另一次 315 ms） | 2 → 2 |

`sl-parse-done` 条数不变，**第 42 轮「退出源码不重解析」的修复在本轮 HEAD 仍然生效**（对照第 42 轮同口径：1 MB/4,096 段曾 5,537 ms）。这条不是回归，是「剩下的 284 ms 花在哪」。

### 2.2 采样剖析（`.tmp/perf-round43-risk.json` → `exitSource.top`，1 MB，100 µs 采样）

| 位置 | 自身耗时 |
| --- | --- |
| `updateStateInner @ @tiptap_pm_view` | **71.3 ms** |
| `getBoundingClientRect`（native） | **69.3 ms** |
| `countCjk @ src/lib/wordcount.ts:10` | **21.3 ms** |
| `removeChild` / `insertBefore` | 7.5 / 2.1 ms |
| `jsxDEV @ react_jsx-dev-runtime` | 5.4 ms |
| `countText @ src/lib/wordcount.ts:27` | 2.7 ms |
| `App @ src/App.tsx` | 1.6 ms |

（另有 `(idle)` 597 ms / `(program)` 449 ms 是采样窗口里的空闲与原生，不计入。）

### 2.3 可砍的一块：`skipReparse` 时仍调 `syncDocInfo`

`applySource`（`src/App.tsx:3840-3868`）在 `skipReparse === true`（源码没改且正文序列化后等于源码）时跳过了 `setMarkdown`，但**无条件**调用 `syncDocInfo(editor)`（`:3865`）→ `extractOutline` + `countText(doc.textContent)`（`:1022-1024`）。正文一字未变，字/大纲/当前章节本来就对，这一次 1 MB 是 21.3 + 2.7 ms（`countCjk` 实测）。

```ts
if (!skipReparse) setMarkdown(...) /* 批注重定位留在 !skipReparse 里 */
if (!skipReparse) syncDocInfo(editor)   // 正文没变，派生数据没变
```

- 收益：1 MB 出源码 −约 24 ms（284 → ≈260），100 KB −约 1.5 ms。**不是 300 ms 的主因**，但它是完全精确、零语义风险的 1 行。
- 剩下约 140 ms（`updateStateInner` + `getBoundingClientRect`）是编辑器视图在源码模式被卸载、回编辑时重建（`src/App.tsx:4957` 的三元渲染）。要动就得「源码模式保持编辑器挂载 + CSS 隐藏」，会改视图切换与 DOM 驻留，风险中，建议单独一轮评估，不要和本轮小修混在一起。
- 风险：低。`npm test` 不覆盖 App，靠 `keyboard-acceptance.mjs`（52/52）与源码往返 e2e。

---

## F3（P2）`App.tsx` 5,379 行 / 190,996 B / 221 个 hook，整个组件 0 条单测

### 3.1 静态度量（本轮 `git`/脚本实测）

| 指标 | 值 |
| --- | --- |
| `src/App.tsx` 行数 / 字节 | **5,379 行 / 190,996 B**（全仓最大文件，第 2 名 `src/lib/trash.ts` 384 行） |
| `useState` / `useEffect` / `useCallback` / `useRef` / `useMemo` | 35 / 53 / 95 / 36 / 2（合计 **221**） |
| 导入的 lib 模块 | 60+（`src/App.tsx:1-120`） |
| 针对 `App.tsx` 的测试 | **0**（29 个 test 文件全部只 import `src/lib/*`） |

### 3.2 真正有价值的盲区（不是「行数多」本身）

`App.tsx` 里这些纯判定只靠 e2e，没有任何单测：

- **自动保存的 9 条守卫**：`src/App.tsx:3171-3183`（设置关、输入法组合期、失败 3 次、保存中、删除中、刷新中、确认框开着、关闭请求、设置面板开着、无落点、无基线）。
- **`onUpdate` 的脏判定**：`src/App.tsx:898-902`（`contentRef.current()` 全文序列化与基线比较）。
- **草稿链的三重代际检查**：`src/App.tsx:945-961`（`stale()` 在 3 个 await 之后复查）。
- **`applySource` 的 `skipReparse` 判据**：`src/App.tsx:3851-3853`（第 42 轮新增，无单测）。

### 3.3 最小可行改法（不拆组件、只抽纯函数）

把自动保存守卫抽成 `src/lib/autoSaveGate.ts`：`shouldAutoSave(s: { settingsAutoSave, composing, failCount, saving, pending, deleting, refreshing, confirmOpen, closeRequested, settingsOpen, dirty, hasBaseline, hasTarget })` → 返回 `{ allowed: boolean; reason: string }`。App 侧只留一次调用。补 8–10 条单测（每类守卫一条）。

- 可度量：未测分支 9 → 0；`App.tsx` 约 −25 行；包体 ≈ +0（lib 已在主 chunk）。
- 风险：低。守卫语义原样搬迁，e2e（`save-acceptance`、`draft-acceptance`）仍覆盖集成。
- 不建议为了行数拆 React 组件：本轮没有证据表明拆分能提升性能或稳定性。

---

## F4（P2）`src/lib` 10 个模块没有直接单测；其中 `rename.ts`、`workspace.ts` 是文件操作的唯一实现

本轮脚本扫 `src/lib/*.ts`（41 个非测试模块）与 29 个 `*.test.ts` 的 `from './x.ts'` 引用：

| 无直接 test 引用（10） | 判断 |
| --- | --- |
| `assetImage.ts`、`decorations.ts`、`mermaidPreview.ts`、`mathInput.ts`、`hostBridge.ts`、`katexLoader.ts`、`mermaidLoader.ts` | 编辑器/宿主胶水层，靠 e2e（`keyboard-acceptance`、`mermaid`、`asset`）覆盖，可接受 |
| `codeScan.ts` | 被 `tilde.ts`、`html.ts` 间接覆盖（两者有 test），**不算盲区** |
| **`rename.ts`** | `validateRename`（`:7`）是纯函数，**0 条单测**；改名不可逆，只有 `rename-acceptance.mjs` |
| **`workspace.ts`** | `writeNode`/`readNode`/`saveAsFile`（`:246`、`:261`、`:285`）**0 条单测**；写盘不可逆 |

建议（只补纯函数一面）：`src/lib/rename.test.ts` 6–8 条——非 `.md`/`.markdown` 扩展名、与旧名相同、`.`/`..`、含 `/`、空名、目标存在（`validateRename` 的拒绝分支）。`workspace.ts` 依赖 FSA 句柄，本轮不建议为它造 mock（成本大于收益）。

- 成本：≤60 行，无新依赖，不影响首屏。
- 风险：无（只加测试）。

---

## F5（P2）死符号与 `noUnusedLocals`：第 4 轮仍原样

本轮用第 42 轮计划（`docs/iteration/round-42/plan.md:298-299`）写死的证据口径复核，工作树 HEAD 未变：

```
git grep -n -w "serializeBody"   → src/App.tsx:187（定义，唯一一处；另有 :74 import、:188 调用）
git grep -n    "clearSession"    → src/lib/session.ts:55（定义，唯一一处）
src/App.tsx:178                  → /** 编辑器读不全的语法… */ 后无代码（悬空注释）
tsconfig.json                    → 只有 "strict": true，无 noUnusedLocals/noUnusedParameters
```

`serializeDocumentBody` **保留**（活引用 `scripts/fidelity-acceptance.mjs:14/43/144`）。

- 改法：删 3 个符号 + 1 句注释（约 −12 行），`src/App.tsx:74` 的 import 去掉 `serializeDocumentBody`。
- 风险：0（`tsc` + `npm test` 即可）；成本约 2 min。**第 42 轮已把它写进计划又预砍，建议本轮直接执行，不要再顺延。**
- 不建议同时开 `noUnusedLocals`：第 42 轮扫出 47 个「只在本文件用」的 `export`，会一次爆一堆。

---

## 4. 已复核的旧结论（本轮未发现回归）

1. **第 42 轮的 3 个 repair 守卫在 HEAD 上都在**，并且逐键成本确实降下来了：1 MB 逐键 12 个按键 → `getMarkdown` **12 次**（每键 1 次脏判定）、中位 **2.0 ms**；100 KB 中位 1.3 ms。`serializeDocument(editor)` 直测 **3.9 ms**（1 MB）/ **1.3 ms**（100 KB），与第 42 轮「加守卫后 ≈3.6 ms」的推算吻合（第 42 轮同口径实测是 8.5–9.7 ms）。
2. **保存路径没有重复全文计算**：`Ctrl+S` 一次只有 **1 次** `getMarkdown`（`save.getMdCalls = 1`，100 KB 与 1 MB 都是），`toast` 显示「已取消保存。」（浏览器态无落点，可见反馈而非静默）。
3. **localStorage 没有每键写放大**：100 KB 一个停笔周期 1 次写、103,504 B、0.5 ms；1 MB **0 次**（`text.length > 256*1024` 跳过，`src/App.tsx:643-650`）。
4. **1 MB 空闲派生只多 1 次序列化**：停笔后 3.5 s 内 `getMarkdown` 1 次（3.8 ms），即 300 ms 派生链（`src/App.tsx:910-965`）。
5. **滚轮流畅**：100 KB 82 帧、1 MB 84 帧，中位/ p95 都是 **16.7 ms**（`deltaY=500` × 20，间隔 30 ms）。
6. **内存**（dev + StrictMode 口径）：100 KB `usedJSHeapSize` 77,900 KB / DOM 13,504 节点；1 MB 85,189 KB / 13,501 节点；编辑器可见元素 1,108。
7. **`onUpdate`/`onSelectionUpdate` 里的遍历不重**：1 MB 下 `readBlocks` 0.2 ms、`buildContext` 0.1 ms、`extractOutline` 0.0 ms（`countText` 22 ms 才是重的那个，但它只在 180 ms 防抖后跑一次）。

---

## 5. 截图证据（`shots/round-43/`）

| 文件 | 说明 |
| --- | --- |
| `code-100kb-scrolled.png` | 100 KB 文档滚轮 20 次后：`scrollTop=10,000`，状态栏「83,974 字 · 阅读约 280 分钟」，无白屏 |
| `code-1mb-source.png` | 1 MB 文档 `Ctrl+/` 进源码：`.source-editor` 值长 **1,025,032**（`viewMode=source`） |
| `code-1mb-ctrls.png` | 1 MB 文档回编辑后 `Ctrl+S`：`toast` =「已取消保存。」，页面不卡死 |

---

## 6. UNVERIFIED（本轮没测到的）

1. **F1 的文件树真实路径**：浏览器里没有工作区句柄，`baselineLosses` 只在 `App.tsx:1079`（宿主）与 `:2072`（文件树）被调用。本轮的 76.8 ms 是在同一页面里对同尺寸文本直调 `baselineLosses`（App 内首次调用）+ 纯函数矩阵得到的，**不是文件树点击**。补测：宿主里打开一份 1 MB 文档，读 `sl-serialize-done → sl-sync-done` 的差（含 `baselineLosses`）。
2. **F1 的最坏上界（4,000 行 / 16M 单元 ≈ 270 ms）**：只有 2,050 行（4.2M 单元，69.9 ms）与 >4,000 行（走粗差分，6 ms）两个实测点，上界是外推。
3. **F2 的视图重建 140 ms**：只有采样剖析，没有单独的实验（例如保持挂载后重测）。
4. **生产构建（无 StrictMode）**：本轮全部数字来自 dev server，生产单遍的载入与逐键应更低（第 42 轮已记同一条）。
5. **宿主文档的保存/草稿写放大**：浏览器里拿不到 `/__doc`，`Ctrl+S` 只走到「已取消保存」。宿主 `draft-save` / `save` 的写放大需要真机（`host-save-acceptance.mjs`）验证。
6. **CPU 剖析有扩展噪声**：9225 的 profile 里有 `edreader-main.js`、adblock 的 `content.js` 采样（合计约 16 ms）；上表只列了应用自身的帧，但窗口总量因此不完全干净。补测：用干净 profile 的端口（9222/9223）重跑 `.tmp/e2e-r43-code-probe.mjs`。

---

## 7. 环境与脚本坑（本轮踩到的）

1. **PowerShell 的 `ConvertFrom-Json` 读本轮 JSON 会报错**（中文 `toast` 文本在控制台编码里变成非法 JSON 字符，报 `应为":"或"}"`）。用 `read` 工具直接看 .json 文件，不要用 PowerShell 转对象。
2. **`9225` 的 profile 装有浏览器扩展**（`edreader`、adblock），会在页面里注入脚本并出现在 `Profiler` 采样中；做 CPU 归因时要排除 `chrome-extension://` 帧。
3. **`sl-parse-done` 在 StrictMode 下是 2 条**（两遍），本轮用「进出源码前后条数是否变化」判断有没有重解析，不用绝对值。
