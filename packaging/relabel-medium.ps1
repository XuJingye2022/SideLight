param(
  [string]$Repo = 'D:\Documents\SidelightProgram'
)
$ErrorActionPreference = 'Stop'
$setup = Join-Path $Repo 'release\Sidelight-0.32.2-win-x64-setup.exe'
$log = Join-Path $Repo '.tmp\relabel-medium.log'
$lines = New-Object System.Collections.Generic.List[string]
function Note([string]$text) { $lines.Add($text); Write-Host $text }

Note "repo=$Repo"
if (-not (Test-Path $setup)) { throw "missing setup: $setup" }

# Windows 按 min(用户 IL, 文件 IL) 启动进程；setup.exe 带 Low 会把安装器也降成 Low。
& icacls $setup /setintegritylevel Medium | Out-Null
$acl = (& icacls $setup) -join "`n"
Note "setup=$setup"
Note "setup-label: " + ($acl -match 'Mandatory Label[^\r\n]*')
if ($acl -match 'Low Mandatory Level') {
  [IO.File]::WriteAllLines($log, $lines)
  throw 'Low label remains on setup.exe'
}
Note 'OK: no Low label'
[IO.File]::WriteAllLines($log, $lines)
