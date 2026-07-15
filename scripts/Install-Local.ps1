[CmdletBinding()]
param(
    [string] $ExecutablePath
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
    $ExecutablePath = Join-Path $projectRoot 'app\Orion.exe'
}

$ExecutablePath = [System.IO.Path]::GetFullPath($ExecutablePath)
if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    throw "Orion executable was not found: $ExecutablePath"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Orion.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $ExecutablePath
$shortcut.WorkingDirectory = Split-Path -Parent $ExecutablePath
$shortcut.IconLocation = "$ExecutablePath,0"
$shortcut.Description = 'Orion project mission control'
$shortcut.Save()

Write-Host "Orion shortcut: $shortcutPath"
