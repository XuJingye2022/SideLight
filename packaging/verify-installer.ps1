# T2 验收：静默安装 → 校验文件/启动/回环 → 静默卸载 → 校验清理干净且用户数据还在。
# 本沙箱的两个已知限制（见 packaging/README.md）：
#   1) 默认 %TEMP% 对子进程不可写，NSIS 会以 exit 2 失败；脚本强制 TEMP/TMP 指向工作区 .tmp。
#   2) HKCU 写入被环境吞掉、不可观测；注册项与快捷方式只报 UNVERIFIED，不报 FAIL。
# 安装目录用 /D 指到工作区 .tmp\install-verify，避免写 %LOCALAPPDATA%\Programs（沙箱可能拒写）。
$ErrorActionPreference = 'Stop'

# 从本会话启动 exe 时绕过 ShellExecute：某些环境会给未签名 exe 弹「打开文件 - 安全警告」，
# 静默安装会被这个模态框卡住。CreateProcess 路径不触发 Attachment Manager。
function Start-NoShell([string]$file, [string]$arguments) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $file
    $psi.Arguments = $arguments
    $psi.UseShellExecute = $false
    $psi.WorkingDirectory = Split-Path -Parent $file
    return [System.Diagnostics.Process]::Start($psi)
}

$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$setup = Join-Path $root "release\Sidelight-$version-win-x64-setup.exe"
$instdir = Join-Path $root '.tmp\install-verify'
$uninstKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight'
$hklmKey = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight'
$shortcut = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Sidelight.lnk'
$userData = Join-Path $env:LOCALAPPDATA 'Sidelight'
$marker = Join-Path $userData 'impl-b-userdata-marker.txt'

$script:failed = 0
$script:unverified = 0
function Pass([string]$msg) { Write-Host "PASS $msg" }
function Fail([string]$msg) { Write-Host "FAIL $msg"; $script:failed++ }
function Unverified([string]$msg) { Write-Host "UNVERIFIED $msg"; $script:unverified++ }

# 1) 强制 TEMP/TMP 到工作区：默认 %TEMP% 对子进程不可写，NSIS 会以 exit 2 失败。
$env:TEMP = Join-Path $root '.tmp\nsis-temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

if (-not (Test-Path $setup)) {
    Write-Host "缺少安装包：$setup（先跑 packaging\installer.ps1）"
    exit 1
}

# 2) WebView2 运行时存在（本机前提；缺失时安装器应当 Abort）
$pv = ''
try { $pv = (Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction Stop).pv } catch { }
$loaderFound = $false
foreach ($base in @("${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application", "$env:ProgramFiles\Microsoft\EdgeWebView\Application")) {
    if (Test-Path $base) {
        foreach ($d in Get-ChildItem $base -Directory -ErrorAction SilentlyContinue) {
            if (Test-Path (Join-Path $d.FullName 'msedgewebview2.exe')) { $loaderFound = $true }
        }
    }
}
if (($pv -and $pv.Length -gt 0) -or $loaderFound) {
    Pass "运行时存在（pv=$pv loader=$loaderFound）"
} else {
    Fail '本机没有 WebView2 运行时，无法做安装验收'
    exit 1
}

$hklmBefore = Test-Path $hklmKey
New-Item -ItemType Directory -Force -Path $userData | Out-Null
Set-Content -Path $marker -Value 'keep-me' -Encoding UTF8

# 3) 静默安装到工作区（/D 必须是最后一个参数，且不加引号）
Get-Process Sidelight -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path $instdir) { Remove-Item $instdir -Recurse -Force }
$install = Start-NoShell $setup "/S /D=$instdir"; $install.WaitForExit()
Start-Sleep -Milliseconds 800
$files = @('Sidelight.exe', 'Sidelight.exe.config', 'sidelight.ico', 'uninstall.exe', 'Microsoft.Web.WebView2.Core.dll', 'WebView2Loader.dll', 'www\index.html')
$missing = @($files | Where-Object { -not (Test-Path (Join-Path $instdir $_)) })
if ($missing.Count -eq 0) {
    Pass "安装写入 $instdir（exe / config / ico / uninstall / SDK dll / www/index.html）"
} else {
    Fail ("安装后缺文件：" + ($missing -join ', '))
}

# 4a) 运行中安装必须失败且 exe 字节不变
$exePath = Join-Path $instdir 'Sidelight.exe'
$hashBefore = if (Test-Path $exePath) { (Get-FileHash $exePath -Algorithm SHA256).Hash } else { '' }
$runningForInstall = $null
if (Test-Path $exePath) {
    $runningForInstall = Start-NoShell $exePath ''
    Start-Sleep -Seconds 2
    $retry = Start-NoShell $setup "/S /D=$instdir"; $retry.WaitForExit()
    Start-Sleep -Milliseconds 500
    $hashAfter = (Get-FileHash $exePath -Algorithm SHA256).Hash
    if ($retry.ExitCode -ne 0 -and $hashAfter -eq $hashBefore) {
        Pass "运行中安装被拒绝（exit=$($retry.ExitCode)）且 exe 未变"
    } else {
        Fail "运行中安装未按预期失败：exit=$($retry.ExitCode) hashSame=$($hashAfter -eq $hashBefore)"
    }
    if (-not $runningForInstall.HasExited) { $runningForInstall.Kill(); $runningForInstall.WaitForExit(5000) | Out-Null }
    Start-Sleep -Seconds 1
}

# 4b) 运行中卸载在步骤 4 程序启动成功后检查

# 4) 装后的程序能起来：窗口标题 Sidelight，回环 200
$appOk = $false
$appDetail = ''
$title = ''
$httpStatus = 0
if (Test-Path (Join-Path $instdir 'Sidelight.exe')) {
    $app = Start-NoShell (Join-Path $instdir 'Sidelight.exe') ''
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        $app.Refresh()
        if ($app.MainWindowTitle -eq 'Sidelight') { $title = $app.MainWindowTitle }
        try {
            $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:47821/index.html' -UseBasicParsing -TimeoutSec 3
            $httpStatus = [int]$resp.StatusCode
        } catch { }
        if ($title -and $httpStatus -eq 200) { $appOk = $true; break }
        Start-Sleep -Milliseconds 300
    }
    $appDetail = "title=[$title] http=$httpStatus"
    if ($appOk -and -not $app.HasExited) {
        $procCount = @(Get-Process Sidelight -ErrorAction SilentlyContinue).Count
        Pass "运行中卸载前探针：process=$procCount exited=$($app.HasExited) pid=$($app.Id)"
        $exePath = Join-Path $instdir 'Sidelight.exe'
        $uBusy = Start-NoShell (Join-Path $instdir 'uninstall.exe') '/S'; $uBusy.WaitForExit()
        Start-Sleep -Milliseconds 500
        if ($uBusy.ExitCode -ne 0 -and (Test-Path $exePath)) {
            Pass "运行中卸载被拒绝（exit=$($uBusy.ExitCode)）且文件仍在"
        } else {
            Fail "运行中卸载未按预期失败：exit=$($uBusy.ExitCode) exe=$(Test-Path $exePath)"
        }
    }
    if (-not $app.HasExited) { $app.Kill(); $app.WaitForExit(5000) | Out-Null }
} else {
    $appDetail = '没有可执行文件'
}
if ($appOk) { Pass "装后程序可启动：$appDetail" } else { Fail "装后程序没起来：$appDetail" }
$exeVersion = (Get-Item (Join-Path $instdir 'Sidelight.exe') -ErrorAction SilentlyContinue).VersionInfo.FileVersion
if ($exeVersion -and $exeVersion.StartsWith('0.31.1')) { Pass "exe 文件版本 $exeVersion" } else { Fail "exe 文件版本不对：$exeVersion" }
$setupVersion = (Get-Item $setup).VersionInfo.FileVersion
if ($setupVersion -and $setupVersion.StartsWith('0.31.1')) { Pass "setup VersionInfo $setupVersion" } else { Fail "setup VersionInfo 为空/不匹配：$setupVersion" }
$cliOut = Join-Path $root '.tmp\cli-version.txt'
$vp = Start-Process (Join-Path $instdir 'Sidelight.exe') -ArgumentList '--version' -NoNewWindow -RedirectStandardOutput $cliOut -PassThru -Wait
$cliVersion = if (Test-Path $cliOut) { (Get-Content $cliOut -Raw).Trim() } else { '' }
if ($cliVersion.Trim() -eq $version) { Pass 'Sidelight.exe --version = 0.31.1' } else { Fail "Sidelight.exe --version = $cliVersion" }

# 5) HKCU 卸载项与快捷方式：本沙箱写入不可观测，只能 UNVERIFIED
$vals = $null
try { $vals = Get-ItemProperty $uninstKey -ErrorAction Stop } catch { }
if ($vals) {
    $need = @('DisplayName', 'DisplayVersion', 'Publisher', 'DisplayIcon', 'InstallLocation', 'UninstallString', 'EstimatedSize')
    $missingVals = @($need | Where-Object { $null -eq $vals.$_ })
    if ($missingVals.Count -eq 0 -and $vals.DisplayVersion -eq $version) {
        Pass "HKCU 卸载项 7 值（$version）"
    } else {
        Fail ("HKCU 卸载项不完整：缺 " + ($missingVals -join ','))
    }
} else {
    Unverified "HKCU 卸载项不可观测（本沙箱 HKCU 写入被环境吞掉）"
}
$shortcutAfterInstall = Test-Path $shortcut
if ($shortcutAfterInstall) { Pass '开始菜单快捷方式存在' } else { Unverified '开始菜单快捷方式不可观测（本沙箱写入被环境吞掉）' }

$hklmAfterInstall = Test-Path $hklmKey

# 6) 静默卸载
$uninst = Join-Path $instdir 'uninstall.exe'
if (Test-Path $uninst) {
    $u = Start-NoShell $uninst '/S'; $u.WaitForExit()
    $deadline = (Get-Date).AddSeconds(30)
    while ((Test-Path $instdir) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 300 }
}
if (-not (Test-Path $instdir)) {
    Pass '卸载清理：安装目录已删除'
} else {
    Fail "卸载残留：$instdir"
    Get-ChildItem $instdir -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { Write-Host ("  left: " + $_.FullName) }
}
if ($null -eq $vals) { Unverified 'HKCU 卸载项删除不可观测（同上）' } elseif (-not (Test-Path $uninstKey)) { Pass 'HKCU 卸载项已删除' } else { Fail 'HKCU 卸载项仍在' }
if ($shortcutAfterInstall) {
    if (Test-Path $shortcut) { Fail '开始菜单快捷方式仍在' } else { Pass '开始菜单快捷方式已删除' }
}

# 7) 用户数据保留 + 不写 HKLM
$userDataKept = (Test-Path $userData) -and (Test-Path $marker)
if ($userDataKept) { Pass "用户数据保留（$userData）" } else { Fail "卸载删掉了用户数据目录：$userData" }
if (-not $hklmBefore -and -not $hklmAfterInstall) { Pass '不写 HKLM 卸载项' } else { Fail "HKLM 卸载项：before=$hklmBefore afterInstall=$hklmAfterInstall" }

# 8) T4: 关联 opt-in 的静态断言 + dry-run 包静默安装
$nsiPath = Join-Path $root 'packaging\installer.nsi'
$nsiText = Get-Content $nsiPath -Raw
$writes = ([regex]::Matches($nsiText, 'WriteRegStr HKCU "Software\\Classes')).Count
$deletes = ([regex]::Matches($nsiText, 'DeleteReg(Value|Key)[^\r\n]*Software\\Classes')).Count
$hklmWrites = ([regex]::Matches($nsiText, 'WriteReg(Str|DWORD) HKLM')).Count
$hklmReads = ([regex]::Matches($nsiText, 'ReadRegStr\s+\$0\s+HKLM')).Count
$userChoice = ([regex]::Matches($nsiText, 'UserChoice')).Count
$components = ([regex]::Matches($nsiText, 'MUI_PAGE_COMPONENTS')).Count
$optionalSection = ([regex]::Matches($nsiText, 'Section /o ')).Count
if ($writes -eq 10 -and $deletes -eq 4 -and $hklmWrites -eq 0 -and $hklmReads -ge 1 -and $userChoice -eq 0 -and $components -eq 1 -and $optionalSection -eq 1) {
    Pass "关联静态断言：10 条 HKCU\Software\Classes 写 / 4 条对称删 / 无 HKLM 写 / 保留 HKLM 读 / 无 UserChoice / 组件页 + Section /o"
} else {
    Fail "关联静态断言失败：writes=$writes deletes=$deletes hklmWrite=$hklmWrites hklmRead=$hklmReads userChoice=$userChoice components=$components optional=$optionalSection"
}

$dry = Join-Path $root '.tmp\assoc-dryrun-setup.exe'
if (Test-Path $dry) {
    $dryDir = Join-Path $root '.tmp\install-assoc-dryrun'
    if (Test-Path $dryDir) { Remove-Item $dryDir -Recurse -Force }
    $dryProc = Start-NoShell $dry "/S /D=$dryDir"; $dryProc.WaitForExit()
    Start-Sleep -Milliseconds 600
    $plan = Join-Path $dryDir 'assoc-plan.txt'
    $dryExe = Join-Path $dryDir 'Sidelight.exe'
    if ($dryProc.ExitCode -eq 0 -and (Test-Path $dryExe) -and -not (Test-Path $plan)) {
        Pass 'dry-run /S 安装：组件默认不勾，assoc-plan.txt 不存在（静默不写关联）'
    } else {
        Fail "dry-run /S 断言失败：exit=$($dryProc.ExitCode) exe=$(Test-Path $dryExe) plan=$(Test-Path $plan)"
    }
    $dryUninst = Join-Path $dryDir 'uninstall.exe'
    if (Test-Path $dryUninst) {
        $u = Start-NoShell $dryUninst '/S'; $u.WaitForExit()
        $deadline2 = (Get-Date).AddSeconds(20)
        while ((Test-Path $dryDir) -and (Get-Date) -lt $deadline2) { Start-Sleep -Milliseconds 300 }
    }
    if (-not (Test-Path $dryDir)) { Pass 'dry-run 包卸载清理' } else { Fail 'dry-run 包卸载残留' }
} else {
    Unverified 'dry-run 包不存在（先跑 packaging\installer.ps1 -AssocDryRun）'
}
Remove-Item $marker -Force -ErrorAction SilentlyContinue

if ($script:failed -gt 0) {
    Write-Host "summary: $($script:failed) FAIL / $($script:unverified) UNVERIFIED"
    exit 1
}
Write-Host "summary: PASS（$($script:unverified) UNVERIFIED：HKCU/快捷方式在本沙箱不可观测）"
exit 0
