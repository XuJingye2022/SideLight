# 第 141 轮交接：保存失败提示（0.32.2）

日期：2026-11-21。交接人：根代理。接手人请先读本文件，再读 `docs/CHANGELOG.md` 的 `## 0.32.2` 条目。

## 1. 一句话现状

**根因是运行环境，不是写盘代码**：这台机器上 Sidelight 以「低完整性」（Low IL）运行，Windows 因此拒绝它写 `D:\Documents` 这类普通文件夹。本轮把「保存失败」的提示改成了中文 + 文件名 + 「另存为」，并加了打开文件夹时的写入探测；**新提示已生效，但探测文案里仍漏出英文原文，且用户报告「甚至导致打不开」——这一条尚未定位**。0.32.2 便携包与安装包都已产出，代码未提交。

## 2. 已测定的环境事实（不要重复推翻）

| 事实 | 证据 |
| :--- | :--- |
| Sidelight 进程令牌 = `S-1-16-4096`（Low） | 读 `OpenProcessToken` + `TokenIntegrityLevel`；同一时刻全机 55 个进程只有 Low / Untrusted，**没有 Medium** |
| `D:\Documents` 是本机 Documents 重定向目录 | `HKCU\...\User Shell Folders` 的 `Personal = D:\Documents` |
| 目标文件夹 `D:\Documents\test-markdown` 是普通 ACL | `icacls`：`Authenticated Users:(I)(M)`、无只读、无强制标签；`Main.md` 只有 `Archive`、无 EFS/压缩/ADS/占用；NTFS 余 314 GB |
| **中完整性**写同一文件夹 = 成功 | 用 `danger-full-access` 跑 `[IO.File]::WriteAllText` → WRITE-OK / DELETE-OK |
| **低完整性**写同一路径 = 拒绝 | 沙箱 shell 同一命令 → Access denied |
| 应用只能写自己的目录 | 便携目录被标成 `Low Mandatory Level`，`host.log` 正常写；`%LOCALAPPDATA%\Sidelight` 写 marker 被拒（verify-installer 的 UNVERIFIED） |
| Chromium 把这次拒绝包成 | `DOMException`，`name = NoModificationAllowedError`，`message` 即用户看到的那句 W3C 英文 |

结论：**在正常桌面（双击启动 = 中完整性）上不存在这个问题**；本机所有进程都在沙箱里，属于环境限制。产品侧能做的是「说清楚 + 给出路」，不能也不该绕过 Windows 完整性。

## 3. 用户最新两条反馈（2026-11-21 07:41 那次运行）

1. 打开文件夹后出现新提示：
   `这个文件夹写不进去（无法创建回收站：An attempt was made to write to a file or directory which could not be modified due to the state of the underlying filesystem.）：文件能打开，但保存会失败。请用「另存为」换一个位置。`
2. 「甚至导致打不开」。

运行记录（`D:\Documents\test\Sidelight-0.32.2-win-x64-portable\Sidelight\host.log`）：

```
07:41:33 启动（portable 状态目录、loopback 47821、controller ready）
07:41:39 permission FileReadWrite ×2   ← 走「打开文件夹」拿到了读写授权
07:41:45 close requested / close dirty=0 / form closed   ← 6 秒后用户干净关闭，正文没改过
```

判定：
- 应用与文件夹打开流程**走完了**（我们的提示出现，说明 `setWorkspace(next)` 已执行、真实句柄已拿到），不是崩溃，也没有 pageerror 记录。
- 提示里的英文来自 `src/lib/trash.ts:68/71`：`无法创建回收站：${error.message}`，**这是旧字符串**，本轮新增的 toast 把它顶到了最显眼的位置。**这是本轮的直接缺陷**（我们刚去掉的英文原文又漏回来了）。
- 「打不开」的具体动作未知：可能是树没渲染、点树里的文件没反应、或再启动应用失败。**接手第一步就是让用户指认动作**，再用下面的脚本复现。

## 4. 本轮改了什么（代码）

| 文件 | 改动 |
| :--- | :--- |
| `src/lib/saveError.ts`（新） | `describeSaveFailure(error, docName)`：按 DOMException 的 `name` 翻中文；`NoModificationAllowedError` / `NotAllowedError` / `NotFoundError` / `QuotaExceededError` / `InvalidStateError`·`SecurityError` / 普通 Error / 未知 |
| `src/App.tsx` | 两处保存 catch 改用它（约 `:3756`、`:3824`）；`performCommit` 失败时 `writeDraftFallbackRef` 写草稿兜底；新增 `ensureWorkspaceWritable`（约 `:2940`）在 `openFolder` / `openDropped` 目录分支调 `ensureTrashDir`，失败弹常驻错误提示 + 「另存为」 |
| `src/components/FileTree.tsx` | `trashReason` 存在时，「＋ 新建」仍禁用，但新增可见的 `.tree-write-warning` 行（`role=status`）+ `aria-describedby` |
| `src/styles.css` | `.tree-write-warning`（用 `--danger` / `--text-xs`，三套主题跟随） |
| `src/lib/saveError.test.ts`（新，20 条） | 6 类 DOMException 文案 + 兜底 + 6 条接线静态门 |
| `package.json` | 版本 0.32.1 → **0.32.2**，`test` 链尾挂新测试文件 |

门禁（真跑）：`npm test` exit 0（72 文件 999 条）、`npm run verify` **PASS**（门 317,479 B / 常驻 4,471 B / 真实首载 321,950 B，硬线 325,000 余 3,050）、`changelog.test.ts` 3/3。E2E `.tmp/e2e-r141-save.mjs` 25/25（假 FSA 合成同一个 DOMException）。

## 5. 待修问题（按优先级）

### P0-1 「打不开」未定位
- 先向用户确认是哪一个动作失败：① 文件夹树没出现 ② 树出现但点 `Main.md` 没反应 ③ 应用起不来/白屏 ④ 文件选择框不弹。
- 复现：`.tmp/e2e-r141-save.mjs` 的假 FSA 分支已能模拟「目录下 `getDirectoryHandle` 全抛」，用它断言打开后 `workspace` 是否渲染、点文件是否 `readNode` 成功。
- 已知代码顺序无阻塞：`setWorkspace` → `setSidebarTab` → `setNotice(null)` → `ensureWorkspaceWritable`（异步、不 await、不抛进 `openFolder` 的 catch）。

### P0-2 探测文案里的英文原文
- `trash.ts:60/68/71` 拼 `error.message`；把 `ensureTrashDir` 的失败翻译成中文短句（例如「无法创建回收站：这个位置不允许写入」），英文只留 `console.debug` 或详情字段。
- 顺带：`saveError.test.ts` 的静态门要加一条「`ensureTrashDir` 的 error 不含 DOMException 原文」。

### P1-1 提示的时机与载体不对
- 「写不进去」不是打开失败，不该用 `kind:'error'` 的 toast 挡在打开后第一眼。建议：文件树内联警示（已有）+ 状态栏常驻 chip；toast 只在**保存失败**时出。
- 打开文件夹仍应完全可用：树可浏览、文件可读、可编辑、可另存为。

### P1-2 安装包验证 1 条 FAIL
- `packaging\verify-installer.ps1`：`FAIL 运行中卸载未按预期失败：exit=0 exe=True`（其余 PASS：体积、运行时、安装写入、运行中安装被拒、装后启动 title=Sidelight/http=200、版本 0.32.2.0）。
- 拦截逻辑在 `packaging/installer.nsi:86-98`（以追加方式打开 `Sidelight.exe`，失败即拦）。疑为沙箱差异；真机验「应用开着点卸载」应弹「请先退出 Sidelight」。
- UNVERIFIED：`%LOCALAPPDATA%\Sidelight` 写 marker 被拒、HKCU 卸载项、开始菜单、默认路径、双击/SmartScreen、真人交互安装。

### P2 其它
- 会话恢复路径（`applySession`、宿主重开）不跑写入探测，恢复进只读目录时新提示不出现。
- 自动保存失败也走同一条 toast（`runAutoSave` → `performCommit` catch），且 `runAutoSave` 的 else 再写一次草稿（同键覆盖，幂等）。
- 安装版在本机从 `%LOCALAPPDATA%\Programs\Sidelight` 启动会因数据目录不可写而降级（本次实测该目录不存在，用户实际跑的是便携版）。

## 6. 产物（未提交）

- `release/Sidelight-0.32.2-win-x64-portable.zip` 1,669,265 B，sha256 `DC63A49A…D606D4`
- `release/Sidelight-0.32.2-win-x64-setup.exe` 1,335,106 B，FileVersion 0.32.2.0，sha256 `8AC9E878…DAD0A3`
- `release/SHA256SUMS-0.32.2.txt`（两行）
- 解压好的便携版：`D:\Documents\test\Sidelight-0.32.2-win-x64-portable\Sidelight\Sidelight.exe`（目录带 Low 标签，应用能写自己的配置）
- 未提交文件：`package.json`、`docs/CHANGELOG.md`、`src/App.tsx`、`src/components/FileTree.tsx`、`src/styles.css`；新增 `src/lib/saveError.{ts,test.ts}`、`docs/iteration/round-141/`、`shots/round-141/`
- 测试安装残留：`.tmp\install-verify`（不影响 `release/`）

## 7. 接手建议顺序

1. 问用户「打不开」是哪个动作，按 §5 P0-1 复现。
2. 修 P0-2（英文原文）——这是本轮自己的缺陷，先收口。
3. 改 P1-1（不要用错误 toast 承载打开时的写入探测）。
4. 让用户在**正常桌面**双击安装包验一次保存；若仍是 Low，说明启动源仍在沙箱里，问题不在应用。
5. 后再处理 P1-2 与文档/提交（提交前重跑 `npm test` + `npm run verify`）。
