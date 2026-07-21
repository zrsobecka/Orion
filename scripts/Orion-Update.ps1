[CmdletBinding(SupportsShouldProcess)]
param(
    [switch] $SkipCheck,
    [switch] $Launch
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$checkScript = Join-Path $PSScriptRoot 'Orion-Check.ps1'
$buildScript = Join-Path $PSScriptRoot 'Build-App.ps1'
$installScript = Join-Path $PSScriptRoot 'Install-Local.ps1'
$installedExecutable = Join-Path $projectRoot 'app\Orion.exe'

function Invoke-OrionScript {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [string] $Path,
        [string[]] $Arguments = @()
    )

    Write-Host ''
    Write-Host "==> $Name" -ForegroundColor Cyan
    $powerShellArguments = @('-NoProfile', '-File', $Path) + $Arguments
    & 'pwsh.exe' @powerShellArguments

    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Test-OrionIsRunning {
    if (-not (Test-Path -LiteralPath $installedExecutable -PathType Leaf)) {
        return $false
    }

    $expectedPath = [System.IO.Path]::GetFullPath($installedExecutable)
    foreach ($process in (Get-Process -Name 'orion' -ErrorAction SilentlyContinue)) {
        try {
            if ($process.Path -and [System.IO.Path]::GetFullPath($process.Path) -eq $expectedPath) {
                return $true
            }
        } catch {
            # The process can end between discovery and reading its path.
        }
    }

    return $false
}

Push-Location $projectRoot

try {
    Write-Host 'Updating the local Orion application.' -ForegroundColor Yellow
    Write-Host "Target: $installedExecutable"

    if (-not $PSCmdlet.ShouldProcess($installedExecutable, 'build and update the local Orion application')) {
        Write-Host 'Preview only: checks, build, and installation were not started.' -ForegroundColor Yellow
        return
    }

    if (Test-OrionIsRunning) {
        throw 'Orion is running from app\Orion.exe. Close it and run this command again.'
    }

    if (-not $SkipCheck) {
        Invoke-OrionScript -Name 'Full quality gate' -Path $checkScript
    } else {
        Write-Warning 'Skipping the quality gate because -SkipCheck was explicitly supplied.'
    }

    Invoke-OrionScript -Name 'Build portable app and installers' -Path $buildScript -Arguments @('-SkipCheck')
    Invoke-OrionScript -Name 'Refresh the desktop shortcut' -Path $installScript

    $installedFile = Get-Item -LiteralPath $installedExecutable
    $installedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $installedExecutable).Hash.ToLowerInvariant()

    Write-Host ''
    Write-Host 'OK: the local Orion application was updated.' -ForegroundColor Green
    Write-Host "Application: $($installedFile.FullName)"
    Write-Host "Size: $($installedFile.Length) bytes"
    Write-Host "SHA-256: $installedHash"

    if ($Launch) {
        Start-Process -FilePath $installedExecutable -WorkingDirectory (Split-Path -Parent $installedExecutable)
    }
} catch {
    Write-Host ''
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
