# Orion build and verification

## Local setup and development

```powershell
npm.cmd run setup:local
npm.cmd run tauri dev
```

`setup:local` creates ignored `src-tauri/.cargo/config.toml` and sends the reusable development cache to `%LOCALAPPDATA%\Orion\cargo-target-dev`, preventing Cargo output in Dropbox. Retain it for faster incremental builds; remove it manually only when reclaiming disk space matters more.

Vite uses the `runner` config loader because the restricted Codex workspace can deny esbuild access to parent directories. If dependency optimization is still restricted, use `npm.cmd run build` followed by `npm.cmd run preview -- --configLoader runner` for production-bundle visual QA.

## Quality gate

```powershell
npm.cmd run check:all
```

This runs lint, formatting verification, frontend tests, the production frontend build, Rust tests,
and `cargo check`. Use the individual commands only when diagnosing a failed step.

The normal release build runs this gate. `-SkipFrontendTests` is only a packaging diagnostic after an exact Vitest worker-startup timeout has been recorded; it never makes the test gate green.

## Windows release and retention standard

Run `npm.cmd run update:local` to check, build, copy, and refresh the desktop shortcut in one step.
When the exact same source has already passed `npm.cmd run check:all`, use:

```powershell
pwsh.exe -NoProfile -File .\scripts\Orion-Update.ps1 -SkipCheck
```

The update uses `scripts\Build-App.ps1`. Every release uses a unique `%LOCALAPPDATA%\Orion\builds\release-*` Cargo target, then copies only current final binaries to `app\` using stable names:

- `Orion.exe` — portable executable and desktop-shortcut target;
- `Orion-setup.exe` — NSIS installer when produced;
- `Orion.msi` — MSI installer when produced.

Before release, check whether `app\Orion.exe` is running and close it with the user's awareness. Windows can lock it after compilation; if replacement fails, preserve the completed target and copy its verified outputs after Orion closes instead of rebuilding.

After checks, package copies, and hashes succeed, the script removes that release target and `frontend\dist`. On failure it retains both and prints the target path. It never removes the development cache or an unexpected directory, and release output is not duplicated under `artifacts\`.

If the command runner times out, do not immediately start another build: the child can outlive the runner. Check the Tauri/Cargo process and newest target; let active work finish, then verify hashes before copying or cleaning only that exact target.

Create or refresh the desktop shortcut only after a successful build:

```powershell
pwsh.exe -File scripts\Install-Local.ps1
```

Before calling a release verified, launch the exact `app\Orion.exe`, exercise the critical workflow, and check its icon, version, and printed SHA-256. Public release still requires signed, clean-machine install, upgrade, restart, offline, and uninstall checks.

Legacy `src-tauri\target`, `%LOCALAPPDATA%\Orion\cargo-target*`, and `artifacts\` directories predate this standard. The scripts do not delete them automatically because they may contain failed-build evidence or private QA material; inspect and remove exact paths explicitly.
