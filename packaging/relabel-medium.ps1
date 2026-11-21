param(
  [string]$Repo = 'D:\Documents\SidelightProgram',
  [string]$Dest = 'D:\Documents\SidelightClean'
)
$ErrorActionPreference = 'Stop'
$setup = Join-Path $Repo 'release\Sidelight-0.32.2-win-x64-setup.exe'
$zip = Join-Path $Repo 'release\Sidelight-0.32.2-win-x64-portable.zip'
$log = Join-Path $Repo '.tmp\relabel-medium.log'
$lines = New-Object System.Collections.Generic.List[string]
function Note([string]$text) { $lines.Add($text); Write-Host $text }

Note "repo=$Repo"
Note "dest=$Dest"

if (-not (Test-Path $setup)) { throw "missing setup: $setup" }
if (-not (Test-Path $zip)) { throw "missing zip: $zip" }

# 1) setup and zip to Medium
& icacls $setup /setintegritylevel Medium | Out-Null
& icacls $zip /setintegritylevel Medium | Out-Null
Note "setup-label: " + ((& icacls $setup) -match 'Mandatory Label[^\r\n]*')
Note "zip-label: " + ((& icacls $zip) -match 'Mandatory Label[^\r\n]*')

# 2) clean portable extraction in a Medium folder
if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
Expand-Archive -LiteralPath $zip -DestinationPath $Dest -Force
& icacls $Dest /setintegritylevel Medium /T | Out-Null
$exe = Join-Path $Dest 'Sidelight\Sidelight.exe'
if (-not (Test-Path $exe)) { throw "missing extracted exe: $exe" }
$exeAcl = (& icacls $exe) -join "`n"
Note "clean-exe=$exe"
Note "clean-exe-label: " + ($exeAcl -match 'Mandatory Label[^\r\n]*')

# 3) hard gate: no Low label on setup or extracted exe
$bad = @()
if (((& icacls $setup) -join "`n") -match 'Low Mandatory Level') { $bad += 'setup' }
if ($exeAcl -match 'Low Mandatory Level') { $bad += 'clean-exe' }
if ($bad.Count -gt 0) {
  [IO.File]::WriteAllLines($log, $lines)
  throw ("Low label remains: " + ($bad -join ', '))
}

Note 'OK: no Low label'
[IO.File]::WriteAllLines($log, $lines)
Write-Host "DONE. Launch: $exe"
