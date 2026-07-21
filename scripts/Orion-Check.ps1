[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$cargoManifest = Join-Path $projectRoot 'src-tauri\Cargo.toml'

function Invoke-OrionStep {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Command,
        [Parameter(Mandatory)] [string[]] $Arguments
    )

    Write-Host ''
    Write-Host "==> $Name" -ForegroundColor Cyan
    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

Push-Location $projectRoot

try {
    Write-Host 'Checking Orion: frontend, tests, and Rust.' -ForegroundColor Yellow

    Invoke-OrionStep -Name 'Frontend: lint' -Command 'npm.cmd' -Arguments @('run', 'lint')
    Invoke-OrionStep -Name 'Frontend: formatting' -Command 'npm.cmd' -Arguments @('run', 'format:check')
    Invoke-OrionStep -Name 'Frontend: tests' -Command 'npm.cmd' -Arguments @('test')
    Invoke-OrionStep -Name 'Frontend: production build' -Command 'npm.cmd' -Arguments @('run', 'build')
    Invoke-OrionStep -Name 'Rust: tests' -Command 'cargo' -Arguments @('test', '--manifest-path', $cargoManifest)
    Invoke-OrionStep -Name 'Rust: compile check' -Command 'cargo' -Arguments @('check', '--manifest-path', $cargoManifest)

    Write-Host ''
    Write-Host 'OK: every Orion check passed.' -ForegroundColor Green
} catch {
    Write-Host ''
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
