# 第 13 轮 · A 组实施报告（T1 → T2 → T3）

日期：2026-11-16。基线 `0842c3b`（v0.25.0）。未 commit；未跑 `npm run build`；`npx vite build --outDir .tmp/build-a` 只用于体积。
边界：`src/**`、`scripts/rename-acceptance.mjs`、`scripts/tree-acceptance.mjs`（扩用例）、本报告。

| 任务 | 结论 | 证据 |
| :--- | :--- | :--- |
| T1 重命名（P0） | **PASS（核心 22/22；两处未测）** | `rename-acceptance` 22/22：正常改名（内容不变、`move` 1 次、无 copy/写）；树选中、`document.title`/顶栏/`__slState`/`Ctrl+S` 全部同步新名且写新路径；重名拒绝且目标内容不变；**两次探测**（第一次探测后建出目标仍拒绝）；`a<b.md`/`con.md`/`a.md.`/`.hidden.md`/`a.txt`/`a\b.md` 逐条拒绝；大小写两段成功；第二段失败停在 `.rename-*` 临时名并如实提示「已改为临时名」，不谎称回滚；`move` `TypeError` 原名保留、就地报错；Esc/失焦/IME Enter 不提交；目录行无入口；缓存迁移新键有内容、旧键已删 |
| T2 树细节（P2 必过） | **PASS（P4 延后）** | `tree-acceptance` 43/43：深文件 `aria-level=3`、`padding-left=34px`（6+(level−1)×14）、祖先自动展开、选中可见；折叠祖先后树内仍只有 1 个 `tabindex=0`；长名 nowrap+ellipsis+title；改名后 `focusPath` 指新 path（T1 脚本覆盖树选中） |
| T3 可访问性（P1 必过 / P3 可延后） | **PARTIAL：P1 PASS，P3 延后** | 大纲活动项 `aria-current="location"`（tree 脚本断言 1 个）；`Outline` 保持 `React.lazy`，首屏产物只有 index JS/CSS，无 Outline chunk。侧栏 `tablist/tab/aria-controls` **未做**：实测余量仅 27 B，放不下，记录为延后项 |

## 关键实现

- **`src/lib/rename.ts`（新，仅被懒 chunk 引用）**：`validateRename` 覆盖空名、`\` 单独文案、`<>:"/|?*`、控制字符、结尾点/空格、`.` 开头、Windows 保留名、只允许 `.md`/`.markdown`（有错扩展名拒绝，无扩展名补 `.md`）；`probeTarget` 用 `getFileHandle(create:false)` + `isSameEntry` 区分重名与仅大小写；`renameFile` 两次探测后 `move()`，失败按 `InvalidModificationError`/`NotAllowedError`/`TypeError`/其它给文案，**不 copy、不删源**；仅大小写走临时名两段，第二段失败返回 `partialName` 并保留临时名。
- **`TreeActions.tsx`（懒）**：行菜单首项「重命名」；`RenameInput` 行内输入，自动聚焦并选中主文件名，宽度 181px，Enter 提交/Esc/失焦取消、`isComposing` 守卫、提交中禁用、错误就地显示；`onKeyDown` 阻止冒泡（修掉了 Enter 冒泡触发树行打开、延迟 `requestLoad` 把状态写回旧文件的问题）。
- **`FileTree.tsx`**：右键/`⋯`/`F2` 三入口；命中条件为真实目录句柄且是文件；`RenameInput` 用 `React.lazy` 嵌在行内；成功后 `setFocusPath(newPath)`。
- **`App.tsx`**：`prepareRename` 等在飞提交、停草稿计时、`draftGeneration++`/`autoSaveGeneration++`；`handleRenamedFile` 一次同步 `activeFile`/`fileRef`/`docNameRef`/`docName`/`document.title`/`saveTargetRef`/`localStorage.name`，缓存「读旧→写新→写成功才删旧」，失败保留旧键并提示；`refreshTree({skipPath})` 跳过刚改名节点、重绑新 path；新增 `loadEpochRef` 作废等在飞保存的旧 `requestLoad`（调试中发现的真实竞态）。
- **T2**：缩进改为行内 `paddingLeft = 6+(level−1)*14`，删 `.tree-dir` 缩进链；`tabbablePath = 可见 focusPath → 可见 activePath → 最近可见祖先 → rows[0]`；`activePath` 变化时逐级 `expanded.add` 祖先。
- **T3**：`Outline` 加 `aria-current="location"`，仍为懒加载；P3 tablist 因体积延后。

## 门禁

```
npx tsc --noEmit                      → exit 0
npm test                              → 16 文件、205 条、0 失败
npx vite build --outDir .tmp/build-a  → exit 0
node scripts/rename-acceptance.mjs    → 22/22 PASS
node scripts/tree-acceptance.mjs      → 43/43 PASS
node scripts/measure-first-screen.mjs --dir .tmp/build-a → 284,973 gzip ≤ 285,000（余 27 B）
```

**首屏增量**：284,134 → **284,973**（+839 B，0.30%）。重命名校验/探测/输入框全部在 `TreeActions` 懒 chunk；`rename.ts` 只被该 chunk 引用；`Outline` 仍懒加载。余量只剩 27 B，**P3 tablist 不放入**（按预算顺序 P3 可延后）。P4（展开态/滚动跨页签、空文件夹提示）同样延后。

## 截图

- `shots/round-13/t1-renamed.png`（改名后选中新名）
- `shots/round-13/t2-indent.png`（三级缩进）
- `shots/round-13/t3-outline-current.png`（大纲 `aria-current`）

## 未测 / 延后

1. 缓存迁移的 **`writeCache` 失败**分支未用假 FS 注入（代码走「写成功才删旧」并提示，未实测）。
2. 最近记录旧条目 `open-recent` → `FILE_GONE` 文案未测（需宿主 `/__recent` 夹具）。
3. 真实 IME（只用 `KeyboardEvent.isComposing` 模拟）、真实目录/宿主/OneDrive 的 `move()`、大小写两段失败真机未验。
4. P3 侧栏 tablist、P4 展开态/滚动跨页签保持与空文件夹提示：按预算延后，未实现。
