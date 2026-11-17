# 第 54 轮 安装与启动 发现（finder-ship）

轮前 startSha=b01a4e6，HEAD 未动。原始日志：`.tmp/r54-ship-verify.log`、`.tmp/r54-ship-assoc-dryrun.log`、`.tmp/r54-ship-preflight.log`。

## 全绿项（本轮实测，非发现）

- 首屏 gzip **296,055 B PASS**，距内部预算 310,000 余 13,945 B、距硬线 320,000 余 23,945 B（`npm run verify`，2026-11-18 本机）。与 `README.md:114`、BRIEF 一致。
- 硬线与版本门四处一致：安装包内部 45,000,000 B / 硬线 50,000,000 B（`packaging/installer.ps1:4`、`packaging/portable.ps1:16`、`packaging/verify-installer.ps1:76-81`、BRIEF 第 30 行）。
- 用当前 `dist` 打 assoc 试包：FileVersion=0.32.1.0、payload=0.32.1.0、**1,308,040 B**，距内部预算 43,691,960 B（`installer.ps1 -AssocDryRun`，exit 0）。载荷 = host\bin 五件 1,026,398 B + dist 3,858,322 B（97 个文件）。
- `dist` 无 `.map`/源码杂物；`installer.nsi:129-140` 逐件列文件，`host\bin\host.log*` 不进包（仅 `portable.ps1:58-61` 有 staging 卫生断言，安装器靠白名单，等效）。
- 真机安装/卸载未跑：HKCU 与快捷方式在本沙箱不可观测，属 B-202 已知环境限制，不重复计。

## F1（P1，发布路径）本地 `release/` 里三个包的 FileVersion 与文件名不符，且 0.32.1 内容是旧批次

证据：

- `Sidelight-0.31.0-win-x64-setup.exe` / `0.32.0` / `0.32.1` 三个的 `FileVersion` 全是 **0.31.1.0**（ProductVersion 各自正确）；`0.27.0`–`0.30.4` 七个的 FileVersion 为**空**。
- 预检原样输出：`setup=824,595 B  mtime=2026-11-16 22:21:32  FileVersion=0.31.1.0` / `payload mtime=2026-11-18 03:22:52  FileVersion=0.32.1.0` / `UNVERIFIED … 装的是别的批次的包`（`packaging/verify-installer.ps1 -PreflightOnly`，`.tmp/r54-ship-preflight.log`）。
- 该 0.32.1 setup 比当前源码旧：现构建 1,308,040 B，差值 483,445 B，不含第 45–53 轮 `dist` 改动。
- 现有两道门的盲区：`installer.ps1:79-95` 只断言**自己刚产物**的 FileVersion，不扫 `release/` 既有文件；`verify-installer.ps1:53` 对批次不符只记 UNVERIFIED 不 FAIL（有意为之）。

影响：AGENTS 第 5 节发布路径是「产物在 release/ → 根代理复核 → 交给人点发布」。直接手传会发出错版本、且缺 8 轮改动的包 —— 与 v0.32.0 事故（发成 0.31.1）同类。

建议：发版前删除 `release/` 旧包并用当前 `dist` 重打；或给 `verify-installer.ps1` 加一条「同名产物的 FileVersion 必须等于文件名里的版本，否则 Fail」。

## F2（P2，文档）README 的测试文件数过期

- `README.md:171` 写「33 个测试文件挂进 npm test」；`package.json` 的 `test` 脚本实为 **34** 条（regex 计数，含 `saveDisk.test.ts`）；BRIEF 亦记 34 个文件 442 条。
- 建议 scribe 批末改成 34，并顺带核 `README.md:170` 的 lib 目录说明是否需要补 `markdownFastPath`、`tableScope`、`saveDisk`。

## F3（P2，构建链）两个打包脚本都没有「dist 是否由当前 src 构建」的检查

- `packaging/installer.ps1:23-26` 只查 `dist\index.html` 存在；`packaging/portable.ps1:31-34` 同。全仓无 dist 新鲜度断言（对 `dist` 的 mtime/指纹比较 0 命中）。
- 版本门只比 `host\bin\Sidelight.exe` 与 `package.json`。`package.json` 版本在未发版期间不变，所以「改过 `src/` 忘了 `npm run build`」时所有门都放行，包出旧前端。
- 建议：`installer.ps1` 加一条断言——`dist\index.html` 的 mtime 不早于 `src/` 下最新 mtime（或按 `npm run verify` 写一个 build 指纹文件），失败即 exit 1 并提示先跑 `npm run verify`。属新增门，不是已发生缺陷。
