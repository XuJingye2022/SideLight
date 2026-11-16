# 第 25 轮计划（平台与最终版）

## 目标

修 Windows 宿主/安装器与 macOS 平台入口，发布 0.31.1，完成第 21–25 轮收尾。

## 任务

| 任务 | 内容 | 验收 |
| --- | --- | --- |
| W1 | `Sidelight.exe --version`、文件版本 0.31.1、NSIS `VIProductVersion`/VersionKey | 命令行与 setup VersionInfo 可读 |
| W2 | 单实例 secondary 转发后 primary `ShowWindow(SW_RESTORE)`+`SetForegroundWindow`；空载荷也恢复 | 第二次启动窗口置前 |
| W3 | 安装/卸载前检测 Sidelight 运行；在跑则提示并中止 | 运行中安装 exit≠0 且 exe 不变 |
| M1 | macOS `application(_:openFiles:)`/`open`、`applicationShouldHandleReopen`、关于版本、端口占用激活已有实例 | CI 编译 + self-test |
| R1 | 版本 0.31.1、CHANGELOG/README/AGENTS、Release | 四资产 + checksum |

## 约束

- 首屏 285,781 ≤286,000；`npm test` 234；host-smoke ≥5/6（FSA 树读取可 UNVERIFIED）。
- 不新增运行时依赖；macOS 行为以 CI 为证。

## 结果

- 完成；运行中卸载场景 exit 0、文件未删，记 UNVERIFIED。
- 0.31.1 发布：Windows 821,058 / 905,153 B，macOS 901,482 B。
