# Repository instructions

## Purpose

Keep Orion a local-first, scan-friendly mission control for application projects. Prefer the smallest change that strengthens the resume-work loop: current state, feature health, Git evidence, and next action.

## Boundaries

- Keep React feature code in `frontend/src/features/` and shared UI small.
- Route every frontend-to-native call through `frontend/src/infrastructure/desktop-runtime.ts`.
- Validate paths and external input at the Rust command boundary. Run Git with argument arrays, never shell strings.
- Store mutable data through Tauri's OS application-data path. Preserve SQLite through explicit migrations.
- Keep project knowledge under `ai/`; reserve the root for repository configuration and public documents.

## Organization

- `ai/{project,product,features,integrations,decisions}/`: durable knowledge by owner.
- `frontend/src/{app,features,infrastructure,shared/ui}/`: shell, product modules, native adapter, and small shared UI.
- `src-tauri/src/{features,infrastructure}/`: native commands, persistence, and integrations.
- `scripts/`: repeatable automation; `app/`: ignored final user-facing binaries.

Move existing material toward these homes only when related to the current change; do not create parallel or catch-all folders.

## Build and verification

Follow `ai/project/WORKFLOWS.md`: run its full quality gate before committing behavior changes and use its release procedure for the exact `app\Orion.exe` launched by the desktop shortcut. Keep component tests on `happy-dom`; `jsdom@29.1.1` caused Vitest worker startup timeouts in this Windows/Dropbox workspace.

If Git was initialized after dependency installation, rerun `npm.cmd run prepare` and verify `git config --get core.hooksPath` returns `.husky/_`.

## Safety

Never commit databases or sidecars, environment files, credentials, local exports, customer data, private screenshots, or generated release artifacts. Removing a project from Orion must never delete repository files.
