# Repository instructions

## Purpose

Keep Orion a local-first, scan-friendly mission control for application projects. Prefer the smallest change that strengthens the resume-work loop: current state, feature health, Git evidence, and next action.

## Architecture

- Keep React feature code inside `frontend/src/features/` and shared UI small.
- Keep all frontend-to-native calls inside `frontend/src/infrastructure/desktop-runtime.ts`.
- Keep current project knowledge under `ai/`; public release documents stay at the repository root.
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

If Git is initialized after dependencies were installed, run `npm.cmd run prepare` again and verify `git config --get core.hooksPath` returns `.husky/_` before relying on the pre-commit hook.

## Safety

Never commit databases or their WAL/SHM sidecars, environment files, credentials, local exports, customer data, private screenshots, or generated release artifacts. Removing a project from Orion must never delete repository files.
