# Orion codebase

## Runtime shape

Orion is one Tauri package: React owns the interface, Rust owns desktop access and persistence, SQLite stores project intent, and the local Git executable supplies repository facts.

## Main areas

| Path                                               | Responsibility                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `frontend/src/app/`                                | Application shell, navigation, startup, and global workspace feedback.               |
| `frontend/src/features/projects/`                  | Project workflow, feature inventory, Git projections, state coordination, and tests. |
| `frontend/src/shared/ui/`                          | Small reusable interface primitives.                                                 |
| `frontend/src/infrastructure/desktop-runtime.ts`   | The only frontend adapter to Tauri commands and native plugins.                      |
| `frontend/src/infrastructure/demo-dashboard.ts`    | Generic browser-only demo data used outside Tauri.                                   |
| `src-tauri/src/features/projects/`                 | Validated native commands and project view models exposed to the frontend.           |
| `src-tauri/src/domain/`                            | Project and feature domain records plus validated update inputs.                     |
| `src-tauri/src/infrastructure/persistence/`        | SQLite initialization, schema, migrations, and queries.                              |
| `src-tauri/src/infrastructure/integrations/git.rs` | Safe Git process execution with argument arrays and output parsing.                  |
| `ai/`                                              | Maintained product, architecture, workflow, and brand knowledge.                     |
| `scripts/`                                         | Reproducible Windows build and local shortcut scripts.                               |

## Data ownership

- Git owns branches, commits, upstream divergence, and working-tree state.
- SQLite owns registered projects, goals, next actions, lifecycle state, features, priorities, and evidence notes.
- React state is a temporary projection and never a third persistent store.

## Safe extension points

- Add project behavior inside `frontend/src/features/projects/` and expose native needs through `desktop-runtime.ts`.
- Add Rust platform access behind a narrow command and a cohesive service.
- Add database changes as versioned, repeatable migrations before changing UI assumptions.
- Keep remote services optional and document every network or personal-data flow before enabling them.
