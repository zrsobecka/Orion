# Repository instructions

## Purpose

Keep Orion a local-first, scan-friendly mission control for application projects. Prefer the smallest change that strengthens the resume-work loop: current state, feature health, Git evidence, and next action.

## Architecture

- Keep React feature code inside `src/features/` and shared UI small.
- Keep all frontend-to-native calls inside `src/services/desktop-runtime.ts`.
- Validate paths and external input at the Rust command boundary.
- Run Git with argument arrays, never interpolated shell commands.
- Store mutable data through Tauri's OS application-data path, never in the repository.
- Preserve the SQLite schema through explicit migrations.

## Verification

Before committing behavior changes, run:

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

For Windows release changes, run `scripts\Build-App.ps1` and test the exact artifact copied to `app\Orion.exe`.

## Safety

Never commit databases, environment files, credentials, local exports, customer data, private screenshots, or generated release artifacts. Removing a project from Orion must never delete repository files.
