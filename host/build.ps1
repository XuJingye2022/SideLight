# 编译 WebView2 宿主。只读 dist，不构建前端；缺产物就退出，让调用者先跑 npm run build。
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$bin = Join-Path $PSScriptRoot 'bin'
$www = Join-Path $bin 'www'
$sdk = Join-Path $root '.tmp\wv2'
$lib = Join-Path $sdk 'lib\net462'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
    Write-Host '缺少 dist\index.html。先跑 npm run build（本脚本不构建前端）。'
    exit 1
}
if (-not (Test-Path (Join-Path $lib 'Microsoft.Web.WebView2.Core.dll'))) {
    Write-Host "缺少 WebView2 SDK 1.0.4314.35：$lib"
    Write-Host '取法：Invoke-WebRequest -Uri https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.4314.35 -OutFile .tmp\wv2.zip; Expand-Archive .tmp\wv2.zip .tmp\wv2'
    exit 1
}
if (-not (Test-Path $csc)) {
    Write-Host "找不到系统 C# 编译器：$csc"
    exit 1
}

New-Item -ItemType Directory -Force -Path $bin | Out-Null
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Force -Path $www | Out-Null

$exe = Join-Path $bin 'Sidelight.exe'
$cscArgs = @(
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/codepage:65001',
    "/out:$exe",
    "/r:$(Join-Path $lib 'Microsoft.Web.WebView2.Core.dll')",
    "/r:$(Join-Path $lib 'Microsoft.Web.WebView2.WinForms.dll')",
    '/r:System.Windows.Forms.dll',
    '/r:System.Drawing.dll',
    (Join-Path $PSScriptRoot 'Program.cs')
)
& $csc $cscArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "编译失败，csc 退出码 $LASTEXITCODE"
    exit $LASTEXITCODE
}

Copy-Item (Join-Path $lib 'Microsoft.Web.WebView2.Core.dll') $bin -Force
Copy-Item (Join-Path $lib 'Microsoft.Web.WebView2.WinForms.dll') $bin -Force
Copy-Item (Join-Path $sdk 'runtimes\win-x64\native\WebView2Loader.dll') $bin -Force
Copy-Item (Join-Path $dist '*') $www -Recurse -Force

$size = (Get-ChildItem $bin -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host "OK $exe"
Write-Host ("bin 合计 {0:N0} B；www/index.html={1}" -f $size, (Test-Path (Join-Path $www 'index.html')))
