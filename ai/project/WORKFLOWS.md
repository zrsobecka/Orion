# Orion build and verification

## Development

```powershell
npm.cmd run tauri dev
```

The npm scripts use Vite's `runner` config loader. In the restricted Codex workspace, Vite's default bundled loader can make esbuild inspect parent directories outside the project and fail with `Access is denied`; the runner keeps configuration loading scoped to Orion. If the development dependency optimizer is still restricted, use `npm.cmd run build` followed by `npm.cmd run preview -- --configLoader runner` for visual QA of the production bundle.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
cargo check --manifest-path src-tauri\Cargo.toml
```

## Windows artifact

Run `scripts\Build-App.ps1`. The script uses a fresh Cargo target outside synchronized folders, runs frontend and Rust checks, builds the complete Tauri application, and writes:

- the executable used locally to `app\Orion.exe`;
- portable and installer artifacts to `artifacts\`;
- SHA-256 hashes to `artifacts\SHA256SUMS.txt`.

To create or refresh the local desktop shortcut after a successful build:

```powershell
pwsh.exe -File scripts\Install-Local.ps1
```

Both scripts pass filesystem paths as individual PowerShell arguments and support repository paths containing spaces.

The normal build must run frontend tests. In a restricted Codex Windows environment, Vitest workers may time out before loading any test file even though lint, TypeScript, Vite, and Rust work normally. After recording that exact worker-startup failure, use `scripts\Build-App.ps1 -SkipFrontendTests` only to verify packaging and the real executable. This switch does not turn the test gate green: rerun `npm.cmd test` in a normal terminal before merging.

The first Rust verification needs network access to download crates that are not already in the local Cargo cache. A frontend-only build does not replace `cargo test`, `cargo check`, and launch verification of the packaged Tauri artifact.
