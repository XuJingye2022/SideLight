# 第 26 轮计划（关闭重开、批注质量、键盘与高分屏）

> 状态：**只订计划，未改产品代码**。基线 `354f5a5`（0.31.1）。
> 范围：用户报告的 6 项。建议第 26 轮修 #1 #2 #3 #5 #6；#4 单独放第 27 轮。

## 1. 结论

六项不是六个独立缺陷，是三层根因：

| 层 | 问题 | 一句话根因 |
| --- | --- | --- |
| 会话层 | #1 | 关闭重开只恢复了 `localStorage` 里的正文文本，没恢复文件句柄、工作区文件夹和批注。 |
| 批注层 | #2 #3 #5 | 长文被切成 1,500 字逐段请求，模型看不到全文；提示词要求 3–5 条逐句批注；定位失败只计数；重跑只追加不替换。 |
| 平台/输入层 | #4 #6 | 链接和公式只有鼠标入口，公式编辑器没有样式；Windows 宿主没有声明 DPI 感知。 |

### 1.1 根因证据（文件:行以 `354f5a5` 为准）

| # | 用户看到 | 证据 | 判定 |
| --- | --- | --- | --- |
| 1 | 内容像上次的文件，文件夹却是空的；Ctrl+S 弹另存为；批注没了 | `src/App.tsx:388-420` 冷启动只读 `localStorage` 文本；`315` 的 `activeFile` 只在内存；`604-609` 与 `1580-1609` 读写批注都要求工作区 + 文件路径；`2190-2271` 无句柄时走 `saveAsFile`；`host/Program.cs:297-311` 只有 `/__doc`、`/__draft`、`/__recent`，没有批注缓存 | 已证实 |
| 2 | 没有深入见解，像改作文，提示词太长 | `src/lib/prompt.ts:7-86` 共 3,298 字、7 节、要求 3–5 条、quote 8–25 字；`src/lib/context.ts:27` 每段 1,500 字；`src/App.tsx:1094-1096` 逐段请求；`src/lib/settings.ts:62-66` 旧提示词一旦保存就被冻结 | 已证实（质量部分待真模型） |
| 3 | 「1 条没能在正文里定位，已丢弃」；希望在文末放整体评价 | `src/App.tsx:1123-1127` 只累加 `unresolved`；`src/lib/annotations.ts:214-253` 定位失败 `continue`；`src/components/MarginRail.tsx:85-89` 只显示数量；数据模型没有「不依赖引文」的批注 | 已证实 |
| 4 | 链接、公式编辑麻烦且不美观 | `src/App.tsx:739-747` 只有点击 `<a>` 才进编辑；`684-692` 公式只有 `onClick`；`3865-3884` 工具栏链接/公式块用 `window.prompt`；`src/components/MathInlineEditor.tsx:54-79` 的 `math-inline*` 类在 `src/styles.css` 里没有样式 | 已证实 |
| 5 | 重跑追加，位置错乱 | `src/App.tsx:1077-1176` 的 `runAnalysis` 没有清理窗口；`1130` 是 `setAnnotations((previous) => [...previous, annotation])` | 已证实 |
| 6 | 高分辨率屏模糊 | `host/app.manifest:11-16` 只有 `longPathAware`，没有 `dpiAware`/`dpiAwareness`；`host/Program.cs:148-174` 没有 DPI 调用；`host/Sidelight.exe.config` 没有 WinForms DPI 节 | 已证实（待真机确认 150%/200%） |

### 1.2 仍待回路回答的假设

- #1 的次生风险：载入文档时 `setAnnotations([])` 可能触发 `src/App.tsx:1358-1376` 的 600 ms 清理，把还没恢复的批注文件删掉。预测：断点或延时 1 s 后，`.sidelight/annotations` 变空。
- #2 的干扰项：没配 Key 时看到的是 `src/lib/ai.ts:227-296` 的模拟批注。预测：设置里 Key 为空，页边有「未配置 API Key」提示。若是这种情况，先不改提示词。
- #6 的次生风险：PerMonitorV2 下 WinForms 默认 `AutoScaleMode` 可能让窗口在 150% 变得过大或过小。预测：窗口逻辑尺寸与字体缩放不一致。

## 2. 诊断回路（Phase 1，先看到红）

**规则：每条回路必须在当前代码上跑出红，记录输出，再动产品代码。** 输出写进 `docs/iteration/round-26/findings.md`。

共用环境：

```bash
node node_modules/vite/bin/vite.js   # http://localhost:5173
# CDP 浏览器：http://127.0.0.1:9222（用 scripts 现成的 playwright-core）
```

| 回路 | 命令 | 现在应当看到（红） | 修好后（绿） |
| --- | --- | --- | --- |
| L1 关闭重开 | `node scripts/session-acceptance.mjs`（新建） | 重新载入后文件树为空、批注 0 条、Ctrl+S 调用 `showSaveFilePicker` | 文件树、当前文档、批注全部回来；Ctrl+S 直接写回，不弹选择器 |
| L2 批注流 | `node scripts/annotation-flow.mjs`（新建） | 同一选区重跑两次，卡片数翻倍；无整体评价区；构造的定位失败条目消失 | 两次后卡片数不变；整体评价区出现；失败条目留在「未定位」 |
| L3 键盘 | `node scripts/ux-keyboard.mjs`（新建） | 选中文字按 Ctrl+K 无反应；公式无法用键盘进入编辑 | Ctrl+K 打开链接框，Tab/Enter 完成；Ctrl+M 编辑行内公式 |
| L4 DPI | `node scripts/host-smoke.mjs`（加一条） | `GetProcessDpiAwareness` 返回 0（unaware） | 返回 2（PerMonitor），`GetProcessDpiAwarenessContext` 等于 PMv2 |
| L5 宿主批注 | `node scripts/host-annotation-acceptance.mjs`（新建） | 关掉再打开 argv 文件，批注 0 条；`.sidelight/annotations` 不存在 | 文件存在，重开后批注恢复 |
| L6 提示词质量 | 人工 3 篇样本（短评/汇报/长文） | 像改作文、没有整体判断 | 每条样本至少 1 条论证/结构判断；最多 1 条 revision |

### L1 怎么做（最紧的一条）

不依赖真实文件夹对话框：参考 `scripts/keyboard-acceptance.mjs` 的 `showDirectoryPicker` 桩，用 OPFS（`navigator.storage.getDirectory()`）返回一个真实 `FileSystemDirectoryHandle`。

1. 初始化脚本写入 `sidelight.settings.v1`（空 Key，走模拟流），桩掉 `showSaveFilePicker` 并计数。
2. 打开文件夹 → 打开 `doc.md` → 选中一段 → Ctrl+Enter → 等批注卡 → 等 800 ms 让缓存落盘。
3. `page.reload()`，模拟关闭重开。
4. 断言：文件树有 `doc.md`；当前文档名正确；批注卡数等于重载前；按 Ctrl+S 后 `saveCalls === 0`，OPFS 文件内容已更新。

OPFS 句柄的 `queryPermission` 若不存在，按 `granted` 处理。真实 WebView2 的权限分支见 3.1。

### L2 怎么做

用 `page.route('**/chat/completions', ...)` 返回可控 SSE，设置里填假 Key（`sidelight.settings.v1`），这样不依赖真模型：

- 第一次响应：meta + 2 条可定位批注。
- 第二次响应：meta + 2 条新的可定位批注（同选区）。
- 断言重跑后总数不变、旧 id 被替换。
- 第三次响应：1 条 `overall` + 1 条引文不在正文的 evaluation。
- 断言整体评价区显示 `overall`；未定位条目带原文出现在「未定位」，且 `annotations` 数量不增加。

## 3. 修复设计

### 3.1 #1 会话恢复

**新增 `src/lib/session.ts`**

- IndexedDB 库 `sidelight.session`，键 `last`。只存句柄与路径，**不存正文、不存批注**：

```ts
type LastSession =
  | { kind: 'workspace'; handle: FileSystemDirectoryHandle; name: string; path: string }
  | { kind: 'file'; handle: FileSystemFileHandle; name: string }
```

- `saveSession` / `loadSession` / `clearSession`。
- `permissionOf(handle)`：`queryPermission({ mode: 'readwrite' })`；不支持时按 `granted`。
- `restorePlan(hostDoc, session, permission)`：纯函数，单测覆盖「宿主文档优先 / 静默恢复 / 一键恢复 / 清除」四种分支。

**启动顺序（`src/App.tsx`）**

1. `/__doc` 有文档 → 宿主文档，跳过 FSA 会话恢复。
2. `/__doc` 404（宿主无文档启动）或浏览器模式 → 读会话：
   - `granted`：静默恢复工作区并打开 `path`；找不到文件就提示并退回普通文档。
   - `prompt`：不自动请求，显示一条可关闭的提示「继续上次：<文件夹> / <文件>」，按钮点击后 `requestPermission`。
   - `denied` 或没有会话：保持现有 `localStorage` 兜底。
3. 恢复成功后调用现有 `loadIntoEditor`，`activeFile` 带句柄，Ctrl+S 原地写。
4. 单文件会话恢复时把句柄放进 `saveTargetRef`，Ctrl+S 不弹选择器。
5. 恢复发生在首屏之后，`initial` 里的 `localStorage` 文本可能短暂出现。恢复时用一次整篇替换；如果实测能看出来，加「正在恢复上次的文档…」遮蔽，避免用户误以为打开的是旧文件。

**批注不再被误删**

- 加 `annotationsHydratedRef`：载入文档后先置 `false`，读完缓存或确认没有缓存再置 `true`。
- `src/App.tsx:1358-1376` 的写/删副作用在 `false` 时直接返回。
- 恢复时引文对不上的条目**不删文件**，转成「未定位」整体评价条目（见 3.2）。
- 恢复前保留旧数组格式兼容。

**宿主单文件批注（`host/Program.cs`）**

- 新增 `GET /__annotations`：只认当前文档，读 `<文档目录>/.sidelight/annotations/<CacheKey>.json`，404 表示没有。
- 新增 `postMessage` 类型 `annotations-save`：只写当前文档同目录，原子替换，上限 512 KiB。
- 复用现有 `CacheKey`，与前端 `cacheKey` 已有逐字节测试。
- 只读文档或目录不可写时静默失败，状态栏提示一次「批注未能写入磁盘」。

**约束与 ADR**

- 写 `docs/adr/0016-session-restore.md`：为什么用 IndexedDB 存句柄、权限三态、失败退化；明确 IndexedDB 不是正文/批注缓存，不违反「缓存只写 `.sidelight/`」。
- 不新增运行时依赖；IndexedDB 与 FSA 都是平台能力。

**验收**

- L1 绿；L5 绿；`npm test` 新增 `session.test.ts`。
- 真实文件夹重启后是否还需要一次点击，记 **UNVERIFIED**（取决于 WebView2 权限是否跨重启保留）。

### 3.2 #3 + #5 批注协议与重跑覆盖

**协议**

新增一种不锚定的批注：

```json
{"kind":"overall","note":"全文最值得改的一处，80 字内"}
```

- `ParsedAnnotation` 增加 `overall`；`readLine` 只要求非空 `note`，不需要 `quote`。
- `resolveAnnotations` 像 `meta` 一样跳过它；由调用方收进 `DocNote`：

```ts
type DocNote = {
  id: string
  kind: 'overall' | 'unresolved'
  note: string
  quote?: string
  createdAt: number
}
```

- 未定位的普通批注不再丢：转成 `DocNote { kind: 'unresolved', note, quote }`。
- 「整体评价」只出现在页边栏底部，**不写正文**，仍满足「AI 不直接写正文」。

**存储格式 v2**

`.sidelight/annotations/<key>.json` 从 `Annotation[]` 升为：

```json
{"v":2,"annotations":[],"notes":[]}
```

读取时兼容旧数组；写入统一 v2；迁移写入前先备份旧文件为 `<key>.json.bak-<时间>`。测试覆盖「旧数组 → v2 → 旧数组内容不变」。

**重跑覆盖（#5）**

- 新增纯函数 `replaceInWindow(previous, fresh, window)`：
  - 移除与窗口 `[start,end]` 相交的 `pending` 批注；
  - 窗口外原样保留；
  - `quote + kind + note + replacement` 完全相同的新条目复用旧 `id`、`thread`、`sources`；
  - 结果按 `from` 排序。
- `runAnalysis`：
  - 每段第一次收到新条目时整窗替换，之后流式追加；
  - 请求失败或 0 条时不动旧批注；
  - 开跑时清空 `analysisGoal`，只认第一条 `meta`。
- 整体评价与未定位按「本次运行」替换，不累积；多段长文只保留最后一次全文总评。

**界面（`src/components/MarginRail.tsx` + `src/styles.css`）**

- 加 `.rail-overall`：吸底、可折叠、有分隔线；先显示整体评价，再显示「未定位」条目（带引文原文与原因）。
- 显示 `unresolved` 的旧提示改为「N 条引文没找到，已收进整体评价」。
- 窄窗抽屉里同样可见；不与绝对定位的批注卡重叠，给 rail 预留底部内边距。
- `GLOSSARY.md` 增加「整体评价（Overall）」与「未定位（Unresolved）」两个词。

**说明**

旧会话里已经被丢弃的那一条无法找回：它从来没有落盘。修复后新产生的不会再丢；如果旧标注文件还在 `.sidelight/annotations/`，重新打开文件夹会按引文恢复。

### 3.3 #2 提示词与全文总评

**提示词重写（`src/lib/prompt.ts`）**

- 目标 ≤1,500 字（现在 3,298 字），去掉 7 节清单与大量举例，保留：意图一句、2–3 条、最多 1 条 revision、quote 规则、JSON Lines 格式。
- 新增硬规则：
  - 至少一条指出论证、结构、证据或读者动作的问题；只改字词不算。
  - 没有值得说的，只写 meta，不凑数。
  - note 写「判断 + 依据」，不写「建议优化」。
- 局部与全文共用一个系统提示词，用一条用户消息区分模式（`buildUserMessage` 增加 `mode`）。

**全文总评（解决「切段后没有全文视角」）**

- 触发：选区 ≥3,000 字，或切段数 >1（覆盖「全选长文」的常见路径）。
- 摘要：标题 + 各级标题列表 + 每节前 180 字 + 最后一段，上限 4,000 字；标注「这是摘要，不是全文」。
- 在分段批注之后追加一次请求；解析 `overall` + 最多 2 条带 quote 的 evaluation，quote 在全文里定位，定位不到进「未定位」。
- 用户消息写「模式：全文」，要求先给整体判断，再给结构性意见；不改标点、错别字、措辞。
- 成本：每次长文多一次请求；不新增设置项。

**设置迁移（`src/lib/settings.ts`）**

- `Settings` 增加 `promptVersion`。
- 旧版本没有该字段且提示词指纹等于旧默认（长度 + FNV-1a）时，自动换成新默认。
- 用户改过的提示词不动；设置页加一行「默认提示词已更新，点『恢复默认』查看」。
- 单测覆盖：旧默认升级、自定义保留、空值回落。

**模拟流（`src/lib/ai.ts`）**

- `mockItems` 增加 1 条 `overall` 和 1 条论证型 evaluation，让没 Key 的界面也能演示整体评价区；不故意造定位失败。

**验收**

- `prompt.test.ts`：长度 ≤1,500、包含 `"kind":"overall"`、包含「最多 1 条 revision」与「至少一条」、示例 JSON 可被 `parseStream` 解析。
- L2 绿；L6 人工评定。
- 真模型质量没有 Key 时记 **UNVERIFIED**，需要产品负责人用 3 篇样本验收。

### 3.4 #6 高分屏

**改动**

- `host/app.manifest` 的 `windowsSettings` 增加：

```xml
<dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
<dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2, PerMonitor</dpiAwareness>
```

- `host/Sidelight.exe.config` 增加 WinForms 节：

```xml
<System.Windows.Forms.ApplicationConfigurationSection>
  <add key="DpiAwareness" value="PerMonitorV2" />
  <add key="EnableWindowsFormsHighDpiAutoResizing" value="true" />
</System.Windows.Forms.ApplicationConfigurationSection>
```

- 不改 `csc` 参数：`host/build.ps1` 已经把 `app.manifest` 作为 `/win32manifest` 编进去。
- 150%/200% 下检查窗口逻辑尺寸与工具栏是否溢出；必要时把 `form.Width/Height` 改为按 DPI 折算的逻辑尺寸。

**验收**

- `host-smoke.mjs` 新增 DPI 断言（P/Invoke `GetProcessDpiAwareness` / `GetProcessDpiAwarenessContext`）。
- 真机截图（用户机器 150%/200%）记 **UNVERIFIED**；开发机 100% 只能证明清单已生效。
- macOS 的 WKWebView 本身是 Retina 原生，不改；仍记「未在真机跑」。

### 3.5 #4 链接与公式（第 27 轮）

**先看参考**：把 `D:\Downloads\Typora_Free_Download-0.11.18` 的安装包静默解到 `.tmp/typora-ref`（或临时目录），只记录行为与样式：Ctrl+K 的焦点顺序、公式的进入/退出、浮层位置。不复制它的代码与资源。

**键盘映射（默认，可改）**

| 键 | 行为 |
| --- | --- |
| `Ctrl+K` | 光标在链接里 → 编辑；有选区 → 给选区加链接；无选区 → 新建链接 |
| `Tab` / `Shift+Tab` | 在「文字」「地址」两个输入框之间切换 |
| `Enter` | 保存链接，焦点回正文，光标落在链接后 |
| `Esc` | 取消，不改正文 |
| `Ctrl+M` | 光标处/附近的公式 → 编辑；否则插入行内公式并进入编辑 |
| `Ctrl+Shift+M` | 插入块级公式并进入编辑 |
| `Enter` / `Esc`（编辑框内） | 提交 / 取消公式 |

若 WebView2 拦截 `Ctrl+K`，退回 `Ctrl+Alt+K`，并在快捷键表里写实际键位。

**改动**

- 新建 `src/components/LinkEditor.tsx`：两个输入框、预览、快捷键提示；不用 `window.prompt`。
- `src/App.tsx`：加 `Ctrl+K`/`Ctrl+M`/`Ctrl+Shift+M`；工具栏「链接」「公式块」改走就地编辑器；公式节点被键盘选中时 `Enter` 进编辑；提交后焦点回正文。
- `src/components/MathInlineEditor.tsx`：块级用多行输入（Shift+Enter 换行），补 `aria-label`。
- `src/styles.css`：补 `.math-inline`、`.math-inline-input`、`.math-inline-preview`、链接下划线、`kbd` 提示；与 `.popover` 同一套圆角/阴影/暗色 token。
- `ShortcutsDialog.tsx`、README 增加键位。

**验收**

- L3 绿；截图：链接框、行内公式编辑、块级公式编辑（浅色 + 深色）。
- 不用鼠标完成「选中文字 → 加链接 → 保存」「定位公式 → 改公式 → 提交」。

## 4. 任务与顺序

### 第 26 轮（#1 #2 #3 #5 #6）

| 任务 | 内容 | 文件（互不重叠） | 依赖 | 验收 |
| --- | --- | --- | --- | --- |
| T0 | 建 5 条回路，跑出红并记录 | 只新建 `scripts/session-acceptance.mjs`、`scripts/annotation-flow.mjs`、`scripts/host-annotation-acceptance.mjs`、`scripts/ux-keyboard.mjs` | 无 | 每条的失败输出进 `findings.md` |
| T1 | 会话恢复 + 宿主批注端点 | `src/lib/session.ts`、`session.test.ts`、`src/lib/workspace.ts`、`src/App.tsx`（启动/恢复）、`host/Program.cs`、`ADR-0016` | T0 | L1、L5 绿 |
| T2 | 批注协议 + 提示词 | `src/lib/annotations.ts`、`annotations.test.ts`、`src/lib/prompt.ts`、`prompt.test.ts`、`src/lib/settings.ts`、`src/lib/ai.ts`、`package.json`（只这里改 test 脚本，同时登记 `session.test.ts`） | 无 | 单测绿；提示词 ≤1,500 |
| T3 | 运行流程 + 整体评价 UI | `src/App.tsx`（分析段）、`MarginRail.tsx`、`styles.css`、`GLOSSARY.md` | T1、T2 | L2 绿；截图 |
| T4 | 高分屏 | `host/app.manifest`、`host/Sidelight.exe.config`、`scripts/host-smoke.mjs` | 无 | L4 绿 |

**并行波次**

1. Wave 1：T1 ∥ T2 ∥ T4（`App.tsx` 只有 T1 动）。
2. Wave 2：T3（等 T1 的 `App.tsx` 与 T2 的协议）。
3. Wave 3：根代理跑门禁、截图、更新文档。

### 第 27 轮（#4）

| 任务 | 内容 | 验收 |
| --- | --- | --- |
| T5 | 链接/公式键盘 + 样式 | L3 绿、截图、快捷键表 |
| T6 | 0.32.0 收尾 | 构建、测试、CHANGELOG/README/STATE |

如果第 26 轮提前完成，T5 的「组件 + 样式」可以先做（不碰 `App.tsx`），键盘接线仍等 T3 合并后。

## 5. 门禁与证据

- 实施期：`npx tsc --noEmit`；不要并发跑 `npm run build`（`dist/` 会互相清空）。
- 根代理最终跑一次：`npm run build`、`npm test`、`npm run roundtrip`。
- 回归：`npm run acceptance`、`node scripts/qa.mjs`、`node scripts/host-smoke.mjs --fsa`。
- 界面截图：`shots/round-26/`（整体评价区、链接框、公式编辑、DPI 前后）。
- 新增测试文件要加进 `package.json` 的 `test` 脚本；测试条数以 `npm test` 输出为准。
- 文档：`docs/CHANGELOG.md` 0.32.0、README「能做什么/不能做什么」、`docs/iteration/STATE.md`、`docs/adr/0016-session-restore.md`、`GLOSSARY.md`。

## 6. 风险与无法验证

| 风险 | 处理 |
| --- | --- |
| `App.tsx` 4,522 行，T1/T3 都改它 | 同一时间只给一个代理；先抽纯函数（`session.ts`、`replaceInWindow`）再接线；每波只跑一次类型检查 |
| IndexedDB 句柄跨重启权限不确定 | 三态分支；`prompt` 时给一键恢复，不假设静默成功 |
| 缓存 v2 迁移写坏旧文件 | 先备份 `.bak-*`；读取兼容数组；单测覆盖 |
| 长文多一次总评请求 | 只在 ≥3,000 字或切段时发；摘要上限 4,000 字；失败不影响分段批注 |
| PerMonitorV2 改变窗口尺寸 | 150%/200% 下量窗口与工具栏；必要时按 DPI 折算 |
| 用户已保存旧提示词 | 指纹识别旧默认；自定义不动；设置页提示 |

**UNVERIFIED（交付时写清）**

- 真实 WebView2 重启后 FSA 权限是否保留；真实文件夹的恢复是否要一次点击。
- 真实 150%/200% 高 DPI 屏的清晰度与窗口尺寸（开发机 100%）。
- 真模型下的提示词质量（无 Key；需产品负责人 3 篇样本）。
- macOS 真机、真实 IME 与新增快捷键/浮层的组合。
- 网络盘/只读目录下的宿主批注写入。
- 旧会话里已丢弃的那条批注无法恢复。

## 7. 待产品负责人定（有默认值，不阻塞）

1. **#4 放第 27 轮**（默认），还是挤进第 26 轮？
2. **整体评价放页边栏底部吸底**（默认），还是单独一个「总评」页签？
3. **#2 验收方式**：提供 3 篇样本 + Key 做真模型评定（默认），还是先记 UNVERIFIED？
4. **快捷键**：`Ctrl+K` 链接、`Ctrl+M` 公式（默认），还是按你的习惯改？
5. **#6 屏幕缩放**：常用 125% / 150% / 200% 中的哪个？验收按这个档位截图。

## 8. 版本

- 第 26 轮：0.32.0（功能 + 修复）。
- 第 27 轮：0.33.0，或并入 0.32.0 一起发。
- 发布仍走 `release.yml`；本轮不强制发版，先把门禁和证据补齐。
