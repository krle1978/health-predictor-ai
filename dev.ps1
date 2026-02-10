param(
  [string]$BackendDir = "backend",
  [string]$FrontendDir = "frontend",
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 3000,
  [switch]$NoNewWindow,
  [switch]$ForceInstall
)

$ErrorActionPreference = "Stop"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$Name'. Install it and try again."
  }
}

function Get-Hash([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

$repoRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$backendPath = Join-Path $repoRoot $BackendDir
$frontendPath = Join-Path $repoRoot $FrontendDir

if (-not (Test-Path -LiteralPath $backendPath)) { throw "Backend folder not found: $backendPath" }
if (-not (Test-Path -LiteralPath $frontendPath)) { throw "Frontend folder not found: $frontendPath" }

Assert-Command "python"
Assert-Command "npm"

$venvPath = Join-Path $repoRoot ".venv"
$backendReq = Join-Path $backendPath "requirements.txt"
$backendHashFile = Join-Path $venvPath ".requirements.sha256"

$frontendLock = Join-Path $frontendPath "package-lock.json"
$frontendHashFile = Join-Path $frontendPath "node_modules\\.package-lock.sha256"
$frontendNodeModules = Join-Path $frontendPath "node_modules"

$backendCmd = @"
Set-Location -LiteralPath '$backendPath'
`$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath '$venvPath')) { python -m venv '$venvPath' }
. '$venvPath\\Scripts\\Activate.ps1'
python -m pip install --upgrade pip | Out-Host
`$reqHash = if (Test-Path -LiteralPath '$backendReq') { (Get-FileHash -Algorithm SHA256 -LiteralPath '$backendReq').Hash } else { `$null }
`$prevHash = if (Test-Path -LiteralPath '$backendHashFile') { (Get-Content -LiteralPath '$backendHashFile' -Raw).Trim() } else { '' }
`$shouldInstall = $($ForceInstall.IsPresent) -or (-not (Test-Path -LiteralPath '$backendHashFile')) -or (`$reqHash -and `$reqHash -ne `$prevHash)
if (`$shouldInstall) {
  if (-not (Test-Path -LiteralPath '$backendReq')) { throw 'Missing backend requirements.txt' }
  python -m pip install -r '$backendReq' | Out-Host
  if (`$reqHash) { Set-Content -LiteralPath '$backendHashFile' -Value `$reqHash -NoNewline }
}
`$env:PORT = '$BackendPort'
python app.py
"@

$frontendCmd = @"
Set-Location -LiteralPath '$frontendPath'
`$ErrorActionPreference = 'Stop'
`$lockHash = if (Test-Path -LiteralPath '$frontendLock') { (Get-FileHash -Algorithm SHA256 -LiteralPath '$frontendLock').Hash } else { `$null }
`$prevHash = if (Test-Path -LiteralPath '$frontendHashFile') { (Get-Content -LiteralPath '$frontendHashFile' -Raw).Trim() } else { '' }
`$shouldInstall = $($ForceInstall.IsPresent) -or (-not (Test-Path -LiteralPath '$frontendNodeModules')) -or (`$lockHash -and `$lockHash -ne `$prevHash)
if (`$shouldInstall) {
  if (Test-Path -LiteralPath '$frontendLock') { npm ci } else { npm install }
  if (`$lockHash) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent '$frontendHashFile') | Out-Null
    Set-Content -LiteralPath '$frontendHashFile' -Value `$lockHash -NoNewline
  }
}
npm run dev -- -p $FrontendPort
"@

if ($NoNewWindow.IsPresent) {
  Write-Host "Starting backend + frontend in this session..." -ForegroundColor Cyan
  $backendJob = Start-Job -Name "backend" -ScriptBlock ([ScriptBlock]::Create($backendCmd))
  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $frontendCmd
  } finally {
    Stop-Job -Job $backendJob -Force -ErrorAction SilentlyContinue | Out-Null
    Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue | Out-Null
  }
  exit 0
}

Write-Host "Starting backend in a new window..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -WorkingDirectory $backendPath -ArgumentList @(
  "-NoExit",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", $backendCmd
) | Out-Null

Write-Host "Starting frontend in a new window..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -WorkingDirectory $frontendPath -ArgumentList @(
  "-NoExit",
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", $frontendCmd
) | Out-Null

Write-Host "" 
Write-Host "Frontend: http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:$BackendPort/health" -ForegroundColor Green
