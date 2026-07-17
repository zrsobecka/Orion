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

### Canonical folder layout

Treat the following as Orion's target organization. Keep new code and project knowledge in these homes; when refactoring, move existing material toward this layout only when it is related to the change, rather than creating parallel or catch-all folders.

```text
ai/
  project/        # CODEBASE.md, ARCHITECTURE.md, WORKFLOWS.md
  product/        # PRODUCT.md, BRAND.md
  features/       # one document per feature, e.g. projects.md
  integrations/   # integration notes, e.g. git.md and sqlite.md
  decisions/      # concise architecture/product decision records
frontend/
  public/
  src/
    app/          # App.tsx and shell/
    features/     # feature modules: components/, hooks/, model/, types.ts, index.ts
    infrastructure/ # desktop-runtime.ts; the only frontend-to-native boundary
    shared/ui/
    assets/
    styles/
    main.tsx
src-tauri/
  src/
    features/     # feature commands.rs and models.rs
    infrastructure/
      persistence/ # database.rs
      integrations/ # git.rs
    lib.rs
    main.rs
  capabilities/
  icons/
scripts/          # development and release automation
app/              # user-facing packaged executable
```

Keep root-level files limited to repository-wide configuration and public documents, including `AGENTS.md`, `README.md`, `PRIVACY.md`, and `package.json`.

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
