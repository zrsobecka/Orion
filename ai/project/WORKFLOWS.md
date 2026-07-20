# Orion build and verification

## Local setup and development

```powershell
npm.cmd run setup:local
npm.cmd run tauri dev
```

`setup:local` creates ignored `src-tauri/.cargo/config.toml` and sends the reusable development cache to `%LOCALAPPDATA%\Orion\cargo-target-dev`. This prevents manual Cargo and Tauri development builds from recreating `src-tauri\target` in Dropbox. The development cache is retained because it materially speeds up incremental compilation; it may be removed manually when disk space matters more than build speed.

Vite uses the `runner` config loader because the restricted Codex workspace can deny esbuild access to parent directories. If dependency optimization is still restricted, use `npm.cmd run build` followed by `npm.cmd run preview -- --configLoader runner` for production-bundle visual QA.

## Quality gate

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

The normal release build runs this gate. `-SkipFrontendTests` is only a packaging diagnostic after an exact Vitest worker-startup timeout has been recorded; it never makes the test gate green.

## Windows release and retention standard

Run `scripts\Build-App.ps1`. Every release uses a unique `%LOCALAPPDATA%\Orion\builds\release-*` Cargo target, then copies only current final binaries to `app\` using stable names:

- `Orion.exe` — portable executable and desktop-shortcut target;
- `Orion-setup.exe` — NSIS installer when produced;
- `Orion.msi` — MSI installer when produced.

Before starting the release, check whether the exact `app\Orion.exe` is running. Close it with the user's awareness before the final copy step; Windows locks the executable and otherwise the full compilation can succeed while artifact replacement fails. If that happens, preserve the completed `release-*` target and copy its verified outputs after Orion is closed instead of rebuilding.

After every check, package copy, and hash calculation succeeds, the script removes that release target and `frontend\dist`. If any step fails, both are retained and the script prints the release-target path for debugging. It never removes the reusable development cache or an unexpected directory. Release output is no longer duplicated under `artifacts\`.

If the command runner times out during `Build-App.ps1`, do not start a second build immediately.
First check whether the exact Tauri/Cargo process and newest `release-*` target are still advancing;
the child build can outlive the runner. Let it finish, then verify hashes before manually copying or
cleaning only that exact release target if the wrapper could not complete its final steps.

Create or refresh the desktop shortcut only after a successful build:

```powershell
pwsh.exe -File scripts\Install-Local.ps1
```

Before calling a release verified, launch the exact `app\Orion.exe`, exercise the critical workflow, and check its icon, version, and printed SHA-256. Public release still requires signed, clean-machine install, upgrade, restart, offline, and uninstall checks.

Legacy `src-tauri\target`, `%LOCALAPPDATA%\Orion\cargo-target*`, and `artifacts\` directories predate this standard. The scripts do not delete them automatically because they may contain failed-build evidence or private QA material; inspect and remove exact paths explicitly.
