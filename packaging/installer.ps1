param([switch]$AssocDryRun)

# 打 per-user NSIS 安装包。只读现有 dist 与 host\bin；缺 NSIS 就下官方 3.11 zip 到 .tmp。
# 版本号从 package.json 只读。硬报警线 850,000 B（超线打印载荷占比并 exit 1）。
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force -Path (Join-Path $root 'release') | Out-Null
$version = '0.31.1'
$payloadNames = @(
    'Sidelight.exe',
    'Microsoft.Web.WebView2.Core.dll',
    'Microsoft.Web.WebView2.WinForms.dll',
    'WebView2Loader.dll',
    'Sidelight.exe.config'
)
foreach ($f in $payloadNames) {
    if (-not (Test-Path (Join-Path $root "host\bin\$f"))) {
        Write-Host "缺少 host\bin\$f。先跑 powershell -ExecutionPolicy Bypass -File host\build.ps1"
        exit 1
    }
}
if (-not (Test-Path (Join-Path $root 'dist\index.html'))) {
    Write-Host '缺少 dist\index.html。'
    exit 1
}

$nsisDir = Join-Path $root '.tmp\nsis'
$makensis = Join-Path $nsisDir 'nsis-3.11\makensis.exe'
if (-not (Test-Path $makensis)) {
    New-Item -ItemType Directory -Force -Path $nsisDir | Out-Null
    $zip = Join-Path $nsisDir 'nsis-3.11.zip'
    if (-not (Test-Path $zip)) {
        Write-Host '下载 NSIS 3.11 ...'
        Invoke-WebRequest -Uri 'https://prdownloads.sourceforge.net/nsis/nsis-3.11.zip' -OutFile $zip -UseBasicParsing
    }
    Expand-Archive -LiteralPath $zip -DestinationPath $nsisDir -Force
}
if (-not (Test-Path $makensis)) {
    Write-Host "NSIS 解压后仍找不到 $makensis"
    exit 1
}

# EstimatedSize：载荷字节（host\bin 五件 + dist）换算成 KB。
$bytes = 0
foreach ($f in $payloadNames) {
    $bytes += (Get-Item (Join-Path $root "host\bin\$f")).Length
}
$bytes += (Get-ChildItem (Join-Path $root 'dist') -Recurse -File | Measure-Object Length -Sum).Sum
$estKb = [int][Math]::Ceiling($bytes / 1024)

if ($AssocDryRun) {
    # 测试包：关联节的 10 条写入换成清单文件，输出到 .tmp，不进 release/。
    $defines = @("/DASSOC_DRYRUN", "/DOUTFILE=..\.tmp\assoc-dryrun-setup.exe")
} else {
    $defines = @()
}
Push-Location $root
try {
    & $makensis /V2 "/DAPPVERSION=$version" "/DESTSIZE=$estKb" @defines 'packaging\installer.nsi'
    $code = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($code -ne 0) {
    Write-Host "makensis 失败，退出码 $code"
    exit $code
}

if ($AssocDryRun) {
    $dry = Join-Path $root '.tmp\assoc-dryrun-setup.exe'
    if (-not (Test-Path $dry)) {
        Write-Host "没有 dry-run 产物：$dry"
        exit 1
    }
    Write-Host ("assoc-dryrun={0} B  {1}" -f (Get-Item $dry).Length, $dry)
    exit 0
}

$setup = Join-Path $root "release\Sidelight-$version-win-x64-setup.exe"
if (-not (Test-Path $setup)) {
    Write-Host "没有产物：$setup"
    exit 1
}
$p = (Get-Item $setup).Length
$sha = (Get-FileHash $setup -Algorithm SHA256).Hash

Write-Host ("version={0}" -f $version)
Write-Host ("setup={0} B  {1}" -f $p, $setup)
Write-Host ("sha256={0}" -f $sha)
Write-Host ("hard=850000 B  estimatedSize={0} KB" -f $estKb)

if ($p -gt 850000) {
    Write-Host '安装包超过硬报警线 850,000 B，下面是载荷占比（前 12 个）：'
    $rows = @()
    foreach ($f in $payloadNames) {
        $item = Get-Item (Join-Path $root "host\bin\$f")
        $rows += [pscustomobject]@{ Bytes = $item.Length; Name = "host\bin\$($item.Name)" }
    }
    $rows += Get-ChildItem (Join-Path $root 'dist') -Recurse -File |
        ForEach-Object { [pscustomobject]@{ Bytes = $_.Length; Name = 'dist\' + $_.FullName.Substring((Join-Path $root 'dist').Length + 1) } }
    $rows | Sort-Object Bytes -Descending | Select-Object -First 12 |
        ForEach-Object { '{0,10:N0}  {1}' -f $_.Bytes, $_.Name }
    exit 1
}
exit 0
