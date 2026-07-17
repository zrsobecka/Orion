# Orion changelog

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
