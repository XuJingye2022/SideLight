# 打便携 zip：staging 只放运行时需要的文件，带 config（长路径开关）与 ico，不带 webview2-data / host.log / *.ps1。
# 用法：powershell -ExecutionPolicy Bypass -File packaging\portable.ps1 [-Www dist]
param([string]$Www = 'dist')

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dist = if ([IO.Path]::IsPathRooted($Www)) { $Www } else { Join-Path $root $Www }
$bin = Join-Path $root 'host\bin'
$stageRoot = Join-Path $root '.tmp\portable'
$stage = Join-Path $stageRoot 'Sidelight'
$release = Join-Path $root 'release'
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$zip = Join-Path $release "Sidelight-$version-win-x64-portable.zip"
$threshold = 940000

$required = @(
    'Sidelight.exe',
    'Microsoft.Web.WebView2.Core.dll',
    'Microsoft.Web.WebView2.WinForms.dll',
    'WebView2Loader.dll',
    'Sidelight.exe.config'
)
foreach ($f in $required) {
    if (-not (Test-Path (Join-Path $bin $f))) {
        Write-Host "缺少 host\bin\$f。先跑 powershell -ExecutionPolicy Bypass -File host\build.ps1"
        exit 1
    }
}
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    Write-Host "缺少 $dist\index.html（前端产物）。"
    exit 1
}
if (-not (Test-Path (Join-Path $PSScriptRoot 'sidelight.ico'))) {
    Write-Host '缺少 packaging\sidelight.ico。先跑：csc /out:.tmp\mkico.exe packaging\mkico.cs; .tmp\mkico.exe packaging'
    exit 1
}

if (Test-Path $stageRoot) { Remove-Item $stageRoot -Recurse -Force }
$www = Join-Path $stage 'www'
New-Item -ItemType Directory -Force -Path $www | Out-Null
foreach ($f in $required) { Copy-Item (Join-Path $bin $f) $stage -Force }
Copy-Item (Join-Path $PSScriptRoot 'sidelight.ico') $stage -Force
Copy-Item (Join-Path $PSScriptRoot 'README.txt') $stage -Force
Copy-Item (Join-Path $root 'LICENSE') $stage -Force
Copy-Item (Join-Path $dist '*') $www -Recurse -Force

# staging 卫生断言：这三类一旦混进去，体积与隐私都出问题。
if (Test-Path (Join-Path $stage 'webview2-data')) { Write-Host 'staging 里出现 webview2-data，拒绝打包'; exit 1 }
if (Test-Path (Join-Path $stage 'host.log')) { Write-Host 'staging 里出现 host.log，拒绝打包'; exit 1 }
$scripts = @(Get-ChildItem $stage -Recurse -File -Filter *.ps1)
if ($scripts.Count -gt 0) { Write-Host ('staging 里出现脚本：' + ($scripts.Name -join ', ')); exit 1 }

$stageBytes = (Get-ChildItem $stage -Recurse -File | Measure-Object Length -Sum).Sum

New-Item -ItemType Directory -Force -Path $release | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory(
    $stage, $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
$zipBytes = (Get-Item $zip).Length
$sha = (Get-FileHash $zip -Algorithm SHA256).Hash

Write-Host ("staging={0:N0} B  ({1})" -f $stageBytes, $stage)
Write-Host ("zip={0:N0} B  {1}" -f $zipBytes, $zip)
Write-Host ("sha256={0}" -f $sha)
Write-Host ("threshold={0:N0} B" -f $threshold)

if ($zipBytes -gt $threshold) {
    Write-Host 'zip 超过门槛，下面是各文件占比（前 12 个）：'
    Get-ChildItem $stage -Recurse -File |
        Sort-Object Length -Descending |
        Select-Object -First 12 |
        ForEach-Object { '{0,10:N0}  {1}' -f $_.Length, $_.FullName.Substring($stage.Length + 1) }
    exit 1
}
exit 0
