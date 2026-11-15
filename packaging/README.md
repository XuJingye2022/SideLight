# Sidelight 安装包（Windows x64）

两种包，二选一：

| 包 | 需要管理员 | 装到哪 | 说明 |
| :--- | :--- | :--- | :--- |
| `Sidelight-<版本>-win-x64-portable.zip` | 否 | 解压目录 | 免安装。见 `packaging/README.txt`（zip 里叫 `README.txt`）。 |
| `Sidelight-<版本>-win-x64-setup.exe` | **否** | `%LOCALAPPDATA%\Programs\Sidelight` | per-user 安装包。有开始菜单快捷方式与卸载项，只写 HKCU。关联 `.md` 是安装时可选，默认不选。 |

## 安装

1. 双击 `Sidelight-<版本>-win-x64-setup.exe`。
2. Windows 可能弹「Windows 已保护你的电脑」——exe 没有代码签名，点「更多信息」→「仍要运行」。
3. 安装位置默认 `%LOCALAPPDATA%\Programs\Sidelight`，可以改，但必须是当前用户可写的目录。
4. 组件页有「在「打开方式」中加入 Sidelight」，**默认不勾**；勾了也只是把 Sidelight 加进 `.md` 的「打开方式」候选，不会改 `.md` 的默认程序。
4. 装完从开始菜单「Sidelight」启动。

**需要 Microsoft WebView2 运行时。** Windows 11 自带；没有的话安装器会弹提示并**中止安装**（不会装出一个打不开的程序）。下载：<https://go.microsoft.com/fwlink/p/?LinkId=2124703>，装完再运行安装器。

## 卸载

设置 → 应用 → 已安装的应用 → Sidelight → 卸载；或开始菜单右键卸载；或直接运行 `%LOCALAPPDATA%\Programs\Sidelight\uninstall.exe`。

卸载会删除程序目录、开始菜单快捷方式与 HKCU 卸载项，并删掉关联登记的 ProgID 与「打开方式」候选；**不会**改你自己设的 `.md` 默认程序，也**不会删** `%LOCALAPPDATA%\Sidelight`（WebView2 配置、缓存、`recent.json` 最近列表与日志；这些只在本机，删除该目录可彻底清掉）。要彻底清掉，卸载后手动删这个目录。

## 静默安装（自动化用）

```powershell
.\Sidelight-<版本>-win-x64-setup.exe /S
& "$env:LOCALAPPDATA\Programs\Sidelight\uninstall.exe" /S
```

NSIS 的静默模式不显示界面；安装结果看目录与 HKCU 卸载项。

## 构建与验收

```powershell
powershell -ExecutionPolicy Bypass -File packaging\installer.ps1      # 下载 NSIS 3.11 到 .tmp，产出 release\*.exe
powershell -ExecutionPolicy Bypass -File packaging\verify-installer.ps1
```

- `installer.ps1` 只读 `dist/` 与 `host/bin/`，版本号从 `package.json` 只读；打印实测字节、`P + 10,000` 门槛、硬报警线 850,000 B 与 SHA256。
- `verify-installer.ps1` 静默安装 → 断言目录、HKCU 卸载项 7 值、开始菜单快捷方式 → 静默卸载 → 断言清理干净且 `%LOCALAPPDATA%\Sidelight` 仍在。
- 两条都要求先有 `host/bin`（`host\build.ps1`）与 `dist`。

## 本沙箱（代理环境）的三个限制

- **默认 `%TEMP%` 对子进程不可写**：NSIS 解包需要可写的 TEMP，否则安装器直接以 exit 2 失败（窗口报 `NSIS Error`）。验证前必须把 `TEMP`/`TMP` 重定向到工作区，例如 `.tmp\nsis-temp`。`verify-installer.ps1` 已自动这么做。
- **HKCU 写入不可观测**：本沙箱里卸载项与开始菜单快捷方式的写入会被环境吞掉，装完查不到。`verify-installer.ps1` 对这两项输出 `UNVERIFIED`，不判 `FAIL`；只有在交互式桌面真机复验才看得到。
- **WebView2 下载写盘受限**：宿主接住了 `DownloadStarting`（日志 `download starting … handled=true`），但本沙箱的浏览器进程写下载文件会 `state=Interrupted reason=FileFailed`（试过快照目录、`.tmp` 与 `webview2-data` 三处）。`host/download-probe.mjs` 只验到「事件接住 + 路径正确」，落盘标 UNVERIFIED。

## 已知限制

- 未签名：首次运行会被 SmartScreen 拦一次。
- 不写 HKLM，不需要管理员。
- `.md` 关联只做 opt-in 的「打开方式」候选：默认不勾、`/S` 不写、不碰 `UserChoice`/`FileExts`/`.md` 默认程序；卸载用 `/ifempty` 保留别人的候选。`FileExts` 的 MRU 若用户手动选过一次可能残留，属已知限制。
- 体积预算：安装包硬线 850,000 B；0.22.0 实测 808,897 B（余量 41,103 B），超出硬线时先打印载荷占比，不抬线。
