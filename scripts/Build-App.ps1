[CmdletBinding()]
param(
    [switch] $SkipFrontendTests,
    [switch] $SkipCheck
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$buildsRoot = Join-Path $env:LOCALAPPDATA 'Orion\builds'
$buildName = 'release-{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), ([guid]::NewGuid().ToString('N'))
$targetRoot = Join-Path $buildsRoot $buildName
$previousCargoTarget = [Environment]::GetEnvironmentVariable('CARGO_TARGET_DIR', 'Process')
$locationPushed = $false
$buildSucceeded = $false

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)] [string] $FilePath,
        [Parameter(Mandatory)] [string[]] $Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }
}

function Remove-SuccessfulBuildDirectory {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $AllowedRoot
    )

    $resolvedRoot = [System.IO.Path]::GetFullPath($AllowedRoot).TrimEnd('\')
    $resolvedPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
    $requiredPrefix = $resolvedRoot + [System.IO.Path]::DirectorySeparatorChar
    $leaf = Split-Path -Leaf $resolvedPath

    if (-not $resolvedPath.StartsWith($requiredPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove a build directory outside $resolvedRoot`: $resolvedPath"
    }
    if (-not $leaf.StartsWith('release-', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove an unexpected build directory: $resolvedPath"
    }

    Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

function Remove-SuccessfulFrontendBundle {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $ProjectRoot
    )

    $resolvedPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
    $expectedPath = [System.IO.Path]::GetFullPath((Join-Path $ProjectRoot 'frontend\dist')).TrimEnd('\')
    if (-not $resolvedPath.Equals($expectedPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove an unexpected frontend directory: $resolvedPath"
    }

    if (Test-Path -LiteralPath $resolvedPath -PathType Container) {
        Remove-Item -LiteralPath $resolvedPath -Recurse -Force
    }
}

function Test-LocalOrionIsRunning {
    param(
        [Parameter(Mandatory)] [string] $ExecutablePath
    )

    if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
        return $false
    }

    $expectedPath = [System.IO.Path]::GetFullPath($ExecutablePath)
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

$env:CARGO_TARGET_DIR = $targetRoot

try {
    Push-Location $projectRoot
    $locationPushed = $true

    if ($SkipCheck) {
        Write-Warning 'The quality gate was skipped explicitly. Run npm.cmd run check:all before using this build.'
    } elseif ($SkipFrontendTests) {
        Invoke-NativeCommand 'npm.cmd' @('run', 'lint')
        Invoke-NativeCommand 'npm.cmd' @('run', 'format:check')
        Write-Warning 'Frontend tests were skipped explicitly. Run them in a normal terminal before merging.'
        Invoke-NativeCommand 'npm.cmd' @('run', 'build')
        Invoke-NativeCommand 'cargo' @('test', '--manifest-path', 'src-tauri\Cargo.toml')
        Invoke-NativeCommand 'cargo' @('check', '--manifest-path', 'src-tauri\Cargo.toml')
    } else {
        Invoke-NativeCommand 'pwsh.exe' @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'Orion-Check.ps1'))
    }
    Invoke-NativeCommand 'npm.cmd' @('run', 'tauri', 'build')

    $portableSource = Join-Path $targetRoot 'release\orion.exe'
    if (-not (Test-Path -LiteralPath $portableSource -PathType Leaf)) {
        throw "Portable executable was not created: $portableSource"
    }

    $appDirectory = Join-Path $projectRoot 'app'
    New-Item -ItemType Directory -Path $appDirectory -Force | Out-Null

    $localExecutable = Join-Path $appDirectory 'Orion.exe'
    if (Test-LocalOrionIsRunning -ExecutablePath $localExecutable) {
        throw 'Orion is running from app\Orion.exe. Close it and run the update again.'
    }
    Copy-Item -LiteralPath $portableSource -Destination $localExecutable -Force

    $bundleDirectory = Join-Path $targetRoot 'release\bundle'
    if (Test-Path -LiteralPath $bundleDirectory -PathType Container) {
        $setupSource = Get-ChildItem -LiteralPath $bundleDirectory -Recurse -File |
            Where-Object { $_.Extension -eq '.exe' } |
            Select-Object -First 1
        $msiSource = Get-ChildItem -LiteralPath $bundleDirectory -Recurse -File |
            Where-Object { $_.Extension -eq '.msi' } |
            Select-Object -First 1

        if ($setupSource) {
            Copy-Item -LiteralPath $setupSource.FullName -Destination (Join-Path $appDirectory 'Orion-setup.exe') -Force
        }
        if ($msiSource) {
            Copy-Item -LiteralPath $msiSource.FullName -Destination (Join-Path $appDirectory 'Orion.msi') -Force
        }
    }

    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $localExecutable
    Write-Host "Local executable: $localExecutable"
    Write-Host "SHA-256: $($hash.Hash.ToLowerInvariant())"
    $buildSucceeded = $true
} finally {
    if ($locationPushed) {
        Pop-Location
    }
    [Environment]::SetEnvironmentVariable('CARGO_TARGET_DIR', $previousCargoTarget, 'Process')

    if ($buildSucceeded) {
        try {
            Remove-SuccessfulBuildDirectory -Path $targetRoot -AllowedRoot $buildsRoot
            Write-Host "Removed successful build cache: $targetRoot"
        } catch {
            Write-Warning "The build succeeded, but its cache could not be removed: $targetRoot. $($_.Exception.Message)"
        }
        try {
            Remove-SuccessfulFrontendBundle -Path (Join-Path $projectRoot 'frontend\dist') -ProjectRoot $projectRoot
            Write-Host 'Removed successful frontend build output: frontend\dist'
        } catch {
            Write-Warning "The build succeeded, but frontend\dist could not be removed. $($_.Exception.Message)"
        }
    } else {
        if (Test-Path -LiteralPath $targetRoot -PathType Container) {
            Write-Warning "Build cache preserved for debugging: $targetRoot"
        } else {
            Write-Warning 'Build failed before Cargo created a release cache.'
        }
    }
}
