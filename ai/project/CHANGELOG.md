# Orion changelog

## 2026-07-16

- Adopted the shared desktop-application structure with `ai/`, `frontend/`, `src-tauri/`, `scripts/`, and ignored `app/` output.
- Moved maintained product, architecture, workflow, build, and brand knowledge into `ai/`.
- Moved the React application into `frontend/` and made Vite, TypeScript, ESLint, Prettier, and Tauri paths explicit.
- Organized native Rust code by project feature, domain records, persistence, and Git integration.
- Fixed the root `app/` ignore rule so application-shell source files are tracked by Git.
- Bounded Tailwind source detection to `frontend/src` and rebuilt the packaged Windows executable and installers.
