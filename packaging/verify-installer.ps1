# T2 验收：静默安装 → 校验文件/启动/回环 → 静默卸载 → 校验清理干净且用户数据还在。
# 本沙箱的两个已知限制（见 packaging/README.md）：
#   1) 默认 %TEMP% 对子进程不可写，NSIS 会以 exit 2 失败；脚本强制 TEMP/TMP 指向工作区 .tmp。
#   2) HKCU 写入被环境吞掉、不可观测；注册项与快捷方式只报 UNVERIFIED，不报 FAIL。
# 安装目录用 /D 指到工作区 .tmp\install-verify，避免写 %LOCALAPPDATA%\Programs（沙箱可能拒写）。
$ErrorActionPreference = 'Stop'

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
$install = Start-Process -FilePath $setup -ArgumentList '/S', "/D=$instdir" -PassThru -Wait
Start-Sleep -Milliseconds 800
$files = @('Sidelight.exe', 'Sidelight.exe.config', 'sidelight.ico', 'uninstall.exe', 'Microsoft.Web.WebView2.Core.dll', 'WebView2Loader.dll', 'www\index.html')
$missing = @($files | Where-Object { -not (Test-Path (Join-Path $instdir $_)) })
if ($missing.Count -eq 0) {
    Pass "安装写入 $instdir（exe / config / ico / uninstall / SDK dll / www/index.html）"
} else {
    Fail ("安装后缺文件：" + ($missing -join ', '))
}

# 4) 装后的程序能起来：窗口标题 Sidelight，回环 200
$appOk = $false
$appDetail = ''
$title = ''
$httpStatus = 0
if (Test-Path (Join-Path $instdir 'Sidelight.exe')) {
    $app = Start-Process -FilePath (Join-Path $instdir 'Sidelight.exe') -PassThru
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
    if (-not $app.HasExited) { $app.Kill(); $app.WaitForExit(5000) | Out-Null }
} else {
    $appDetail = '没有可执行文件'
}
if ($appOk) { Pass "装后程序可启动：$appDetail" } else { Fail "装后程序没起来：$appDetail" }

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
    Start-Process -FilePath $uninst -ArgumentList '/S' -PassThru -Wait | Out-Null
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

Remove-Item $marker -Force -ErrorAction SilentlyContinue

if ($script:failed -gt 0) {
    Write-Host "summary: $($script:failed) FAIL / $($script:unverified) UNVERIFIED"
    exit 1
}
Write-Host "summary: PASS（$($script:unverified) UNVERIFIED：HKCU/快捷方式在本沙箱不可观测）"
exit 0
