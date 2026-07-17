[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$cargoDirectory = Join-Path $projectRoot 'src-tauri\.cargo'
$configPath = Join-Path $cargoDirectory 'config.toml'
$targetDirectory = Join-Path $env:LOCALAPPDATA 'Orion\cargo-target-dev'
$cargoTarget = $targetDirectory.Replace('\', '/')
$content = "[build]`ntarget-dir = `"$cargoTarget`"`n"

New-Item -ItemType Directory -Path $cargoDirectory -Force | Out-Null

if ((Test-Path -LiteralPath $configPath -PathType Leaf) -and (Get-Content -Raw -LiteralPath $configPath) -eq $content) {
    Write-Host "Cargo development target is already configured: $targetDirectory"
    exit 0
}

Set-Content -LiteralPath $configPath -Value $content -Encoding utf8 -NoNewline
Write-Host "Cargo development target configured outside Dropbox: $targetDirectory"
Write-Host "Local config (ignored by Git): $configPath"
