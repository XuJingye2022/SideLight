# `.md` 关联只做「打开方式」候选，opt-in，只写 HKCU

Windows 11 不允许安装器替用户设默认程序：`.md` 的默认程序记在 `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice`，受 Hash 校验保护；本机还有 UCPD 在跑。硬写 `UserChoice` 会被判无效，也可能被系统拦下。

用户真正要的是「双击/右键时能选 Sidelight」。本轮只做这一步：把 Sidelight 加进 `.md` 的「打开方式」候选，不设默认、不改默认程序。

## 决定

- 安装器的组件页给一个默认**不勾**的可选节：「在「打开方式」中加入 Sidelight」。
- 勾选只写 `HKCU\Software\Classes`：ProgID `Sidelight.md`、`.md\OpenWithProgids` 里加自己的值、`Applications\Sidelight.exe`。
- 不写 `HKCU\...\FileExts\.md`，不写 `UserChoice`，不改 `.md` 根键默认值，不写 `HKLM`。
- `/S` 静默安装不选可选节，因此**不写关联**；便携包不写任何注册表。

## 键表（共 10 条 `WriteRegStr HKCU "Software\Classes…`）

| 键 | 值名 | 值 |
| :--- | :--- | :--- |
| `Software\Classes\Sidelight.md` | 默认值 | `Sidelight Markdown 文档` |
| `…\Sidelight.md` | `FriendlyTypeName` | `Sidelight Markdown 文档` |
| `…\Sidelight.md\DefaultIcon` | 默认值 | `$INSTDIR\Sidelight.exe,0` |
| `…\Sidelight.md\shell\open\command` | 默认值 | `"$INSTDIR\Sidelight.exe" "%1"` |
| `Software\Classes\.md\OpenWithProgids` | `Sidelight.md` | 空 `REG_SZ`（官方允许 `REG_NONE` 或空 `REG_SZ`） |
| `…\Applications\Sidelight.exe` | `ApplicationName` | `Sidelight` |
| `…\Applications\Sidelight.exe` | `ApplicationCompany` | `Sidelight contributors` |
| `…\Applications\Sidelight.exe` | `ApplicationIcon` | `$INSTDIR\Sidelight.exe,0` |
| `…\Applications\Sidelight.exe\shell\open\command` | 默认值 | `"$INSTDIR\Sidelight.exe" "%1"` |
| `…\Applications\Sidelight.exe\SupportedTypes` | `.md` | 空 `REG_SZ` |

## 安装 UX

- 页面顺序：目录 → 组件 → 安装。组件页说明文字写明「不改变 .md 的默认程序」。
- 关联节是 `Section /o`：默认未选中。`/S` 不显示组件页，按默认选择执行，所以静默安装不写关联。
- 测试用编译开关 `ASSOC_DRYRUN`：把 10 条写入换成 `$INSTDIR\assoc-plan.txt` 清单文件，不碰注册表。验证脚本用这个包做 `/S` 安装，断言清单文件不存在，从而证明「不勾不写」。

## 卸载

对称删除四个位置：

1. `DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md"`
2. `DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"`（本机这个键里有 `VSCode.md`，必须 `/ifempty` 才不误删别人的候选）
3. `DeleteRegKey HKCU "Software\Classes\Sidelight.md"`
4. `DeleteRegKey HKCU "Software\Classes\Applications\Sidelight.exe"`

不碰 `FileExts\.md\OpenWithList` 的 MRU（值名是 `a`/`b` 加 `MRUList` 顺序串，改它容易弄坏别的程序的顺序），也不清理用户自己设过的 `UserChoice`。没勾选关联的安装，这四条是空操作（NSIS 删不存在的键/值不报错），所以卸载节不存标志位。

## 否决的方案

- **安装器写 `UserChoice`**：Hash 会失效，UCPD 可能拦，而且这是微软留给用户的选择。
- **改 `.md` 根键默认值**：全局影响所有用户与程序。
- **组件默认勾选**：违背 opt-in，静默安装也会改用户环境。
- **便携包写注册表**：留下无法卸载的注册表项。
- **报文框（MessageBox）代替组件页**：一行模态框解释不了 UserChoice，也容易点错。

## 验收

- `packaging/installer.ps1 -AssocDryRun` 编出 dry-run 包（`.tmp\assoc-dryrun-setup.exe`），`packaging/verify-installer.ps1` 断言：
  - `.nsi` 有 10 条 `WriteRegStr HKCU "Software\Classes`、4 条对称删除、0 条 `WriteRegStr HKLM`/`WriteRegDWORD HKLM`（允许 WebView2 检查的 `ReadRegStr HKLM`）、0 条 `UserChoice`、组件页与 `Section /o` 各 1 处。
  - dry-run 包 `/S` 安装后 `assoc-plan.txt` **不存在**，卸载后安装目录清空。
- 真实 HKCU 的三条（勾选后「打开方式」出现、卸载后消失、`VSCode.md` 仍在）在本沙箱**不可观测，标 UNVERIFIED**，需真人复核。

## 状态

2026-11-15 接受。`.md` 双击直接打开不在本轮范围；安装器不改默认程序，用户要设默认仍需在 Windows 设置里自己选。
