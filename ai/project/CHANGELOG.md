# Orion changelog

## 2026-07-20

- Merged durable project goals and focus history into the main branch.

## 2026-07-19

- Separated project identity from progress: feature-status segments and recent-focus rings replaced a misleading whole-project percentage.
- Added a synchronized mission path and rebalanced the cockpit so commit evidence remains the primary reading workspace.
- Preserved responsive and reduced-motion behavior across the new progress surfaces.

## 2026-07-18

- Added a reusable local LM Studio structured-chat integration with bounded timeouts, model discovery, and optional configuration overrides.
- Added evidence-backed repository feature proposals with secret-safe context selection, explicit review, duplicate protection, and transactional acceptance.
- Kept whole-application overview and user-flow evaluation as a separate future AI workflow rather than coupling it to feature discovery.
- Moved codebase and workflow-diagram knowledge under `ai/project/` and reduced always-loaded repository context.
- Standardized Cargo output outside Dropbox: reusable development cache, isolated release targets, cleanup only after successful packaging, and failure-cache retention.
- Stopped duplicating release binaries under `artifacts/`; current portable and installer outputs now use stable names under ignored `app/`.

## 2026-07-17

- Added durable manual project tasks with add, complete, reopen, and remove actions backed by SQLite migration 2.
- Rebuilt the project cockpit as a bold animated mission orbit while preserving the logo and project list in the left sidebar.
- Added responsive layouts for expanded, compact-sidebar, and narrow windows with reduced-motion support.
- Added Rust persistence coverage and frontend interaction coverage for the task workflow.

## 2026-07-16

- Adopted the shared desktop-application structure with `ai/`, `frontend/`, `src-tauri/`, `scripts/`, and ignored `app/` output.
- Moved maintained product, architecture, workflow, build, and brand knowledge into `ai/`.
- Moved the React application into `frontend/` and made Vite, TypeScript, ESLint, Prettier, and Tauri paths explicit.
- Organized native Rust code by project feature, domain records, persistence, and Git integration.
- Fixed the root `app/` ignore rule so application-shell source files are tracked by Git.
- Bounded Tailwind source detection to `frontend/src` and rebuilt the packaged Windows executable and installers.
