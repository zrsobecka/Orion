[CmdletBinding()]
param(
    [switch] $SkipFrontendTests
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = Join-Path $env:LOCALAPPDATA 'Orion\cargo-target'

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

if (Test-Path -LiteralPath $targetRoot) {
    $targetRoot = Join-Path $env:LOCALAPPDATA ("Orion\cargo-target-" + [guid]::NewGuid().ToString('N'))
}

$env:CARGO_TARGET_DIR = $targetRoot
Push-Location $projectRoot
try {
    Invoke-NativeCommand 'npm.cmd' @('run', 'lint')
    Invoke-NativeCommand 'npm.cmd' @('run', 'format:check')
    if (-not $SkipFrontendTests) {
        Invoke-NativeCommand 'npm.cmd' @('test')
    } else {
        Write-Warning 'Frontend tests were skipped explicitly. Run them in a normal terminal before merging.'
    }
    Invoke-NativeCommand 'npm.cmd' @('run', 'build')
    Invoke-NativeCommand 'cargo' @('test', '--manifest-path', 'src-tauri\Cargo.toml')
    Invoke-NativeCommand 'cargo' @('check', '--manifest-path', 'src-tauri\Cargo.toml')
    Invoke-NativeCommand 'npm.cmd' @('run', 'tauri', 'build')
} finally {
    Pop-Location
}

$artifactDirectory = Join-Path $projectRoot 'artifacts'
$appDirectory = Join-Path $projectRoot 'app'
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $appDirectory -Force | Out-Null

$portableSource = Join-Path $targetRoot 'release\orion.exe'
if (-not (Test-Path -LiteralPath $portableSource)) {
    throw "Portable executable was not created: $portableSource"
}

$portableArtifact = Join-Path $artifactDirectory 'Orion-portable.exe'
$localExecutable = Join-Path $appDirectory 'Orion.exe'
Copy-Item -LiteralPath $portableSource -Destination $portableArtifact -Force
Copy-Item -LiteralPath $portableSource -Destination $localExecutable -Force

$bundleDirectory = Join-Path $targetRoot 'release\bundle'
if (Test-Path -LiteralPath $bundleDirectory) {
    Get-ChildItem -LiteralPath $bundleDirectory -Recurse -File |
        Where-Object { $_.Extension -in '.exe', '.msi' } |
        Copy-Item -Destination $artifactDirectory -Force
}

$hashFile = Join-Path $artifactDirectory 'SHA256SUMS.txt'
Get-ChildItem -LiteralPath $artifactDirectory -File |
    Where-Object { $_.Extension -in '.exe', '.msi' } |
    Sort-Object Name |
    ForEach-Object {
        $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
        "$($hash.Hash.ToLowerInvariant())  $($_.Name)"
    } |
    Set-Content -LiteralPath $hashFile -Encoding utf8

Write-Host "Orion artifacts: $artifactDirectory"
Write-Host "Local executable: $localExecutable"
