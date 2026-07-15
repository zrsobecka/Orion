# Orion codebase

## Runtime shape

Orion is one Tauri package: React owns the interface, Rust owns desktop access and persistence, SQLite stores project intent, and the local Git executable supplies repository facts.

## Main areas

| Path                                 | Responsibility                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `src/app/`                           | Application shell, navigation, startup, and global workspace feedback.               |
| `src/features/projects/`             | Project workflow, feature inventory, Git projections, state coordination, and tests. |
| `src/components/`                    | Small reusable interface primitives.                                                 |
| `src/services/desktop-runtime.ts`    | The only frontend adapter to Tauri commands and native plugins.                      |
| `src/services/demo-dashboard.ts`     | Generic browser-only demo data used outside Tauri.                                   |
| `src-tauri/src/commands/`            | Narrow validated commands exposed to the frontend.                                   |
| `src-tauri/src/services/database.rs` | SQLite initialization, schema, migrations, and queries.                              |
| `src-tauri/src/services/git.rs`      | Safe Git process execution with argument arrays and output parsing.                  |
| `docs/`                              | Product, architecture, build, and brand decisions.                                   |
| `scripts/`                           | Reproducible Windows build and local shortcut scripts.                               |

## Data ownership

- Git owns branches, commits, upstream divergence, and working-tree state.
- SQLite owns registered projects, goals, next actions, lifecycle state, features, priorities, and evidence notes.
- React state is a temporary projection and never a third persistent store.

## Safe extension points

- Add project behavior inside `src/features/projects/` and expose native needs through `desktop-runtime.ts`.
- Add Rust platform access behind a narrow command and a cohesive service.
- Add database changes as versioned, repeatable migrations before changing UI assumptions.
- Keep remote services optional and document every network or personal-data flow before enabling them.
