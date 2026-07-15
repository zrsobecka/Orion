# Orion

Orion is a local-first mission control for application projects. It keeps Git facts, project intent, feature health, and the next concrete action in one desktop workspace so a builder can resume work without reconstructing context from folders, chats, and memory.

![Orion icon](docs/brand/orion-desktop-icon.png)

## What works in the MVP

- register a local Git repository with a native folder picker;
- scan current branch, local branches, recent commits, changed files, and upstream divergence;
- see a multi-project overview with work and risk signals;
- record each project's goal, lifecycle state, and next action;
- map features as planned, in progress, working, or blocked;
- group feature work into now, next, and later horizons;
- keep all product notes in a local SQLite database.

Orion reads repositories through the installed `git` executable. It does not upload source code, require an account, or connect to GitHub.

## Stack

Tauri 2, React 19, TypeScript, Vite, Tailwind CSS, Rust, SQLite, Vitest, ESLint, and Prettier.

## Requirements

- Windows 10 or 11;
- Node.js and npm;
- Rust with the MSVC toolchain;
- Microsoft C++ Build Tools and WebView2;
- Git available on `PATH`.

## Development

```powershell
npm install
npm.cmd run tauri dev
```

## Verification

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
cargo test --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

Run `pwsh.exe -File scripts\Build-App.ps1` for the complete Windows build. See [docs/build.md](docs/build.md) for artifact paths and local shortcut setup.

## Data and privacy

Orion stores registered repository paths, project goals, next actions, and feature notes in `orion.sqlite3` under the operating system's application-data directory. Git metadata is read locally on refresh. Removing a project from Orion never deletes its repository.

The repository intentionally excludes databases, environment files, local artifacts, exports, cookies, sessions, and private data directories. Do not commit real project databases or screenshots containing private repository information.

## Current limitations

- Windows is the only verified target.
- GitHub issues, pull requests, cloud sync, team collaboration, and autonomous code changes are outside the MVP.
- Release artifacts are currently unsigned and may trigger Windows SmartScreen.
- A public release still needs clean-machine install, upgrade, restart, offline, and uninstall verification.

## Project documentation

- [Product contract](docs/product.md)
- [Architecture](docs/architecture.md)
- [Codebase map](CODEBASE.md)
- [Workflow diagram](WORKFLOW-DIAGRAM.md)
- [Build and verification](docs/build.md)
- [Brand](docs/brand/README.md)

## License

MIT. See [LICENCE.md](LICENCE.md).
