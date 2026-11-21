param(
  [string]$Zip = 'D:\Documents\SidelightProgram\release\Sidelight-0.32.2-win-x64-portable.zip',
  [string]$Dest = 'D:\Documents\SidelightZipTest',
  [string]$Log = 'D:\Documents\SidelightProgram\.tmp\zip-extract-test.log'
)
$ErrorActionPreference = 'Stop'
if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
Expand-Archive -LiteralPath $Zip -DestinationPath $Dest -Force
$exe = Join-Path $Dest 'Sidelight\Sidelight.exe'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('whoami:')
foreach ($l in (& whoami /groups)) { if ($l -match 'Mandatory Label') { $lines.Add($l) } }
$lines.Add('exe: ' + $exe)
foreach ($l in (& icacls $exe)) { $lines.Add($l) }
[IO.File]::WriteAllLines($Log, $lines)
