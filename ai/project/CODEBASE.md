# Orion codebase

Orion is one Tauri package: React owns the interface, Rust owns desktop access and persistence, SQLite stores project intent, and the local Git executable supplies repository facts.

| Path                                                     | Responsibility                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `frontend/src/app/`                                      | Application shell, navigation, and startup feedback.                 |
| `frontend/src/features/projects/`                        | Project workflow, state coordination, projections, and tests.        |
| `frontend/src/shared/ui/`                                | Small reusable interface primitives.                                 |
| `frontend/src/infrastructure/desktop-runtime.ts`         | Sole frontend adapter to native commands and plugins.                |
| `frontend/src/infrastructure/demo-dashboard.ts`          | Browser-only demo data used outside Tauri.                           |
| `src-tauri/src/features/projects/`                       | Validated native commands and frontend-facing models.                |
| `src-tauri/src/domain/`                                  | Project records and validated update inputs.                         |
| `src-tauri/src/infrastructure/persistence/`              | SQLite initialization, migrations, and queries.                      |
| `src-tauri/src/infrastructure/integrations/git.rs`       | Direct Git execution with argument arrays and output parsing.        |
| `src-tauri/src/infrastructure/integrations/lm_studio.rs` | Shared local structured-AI client; product prompts stay in features. |
| `ai/`                                                    | Maintained product and engineering knowledge.                        |
| `scripts/`                                               | Reproducible Windows setup, build, and shortcut scripts.             |

Git owns repository facts, SQLite owns project intent, and React state is only their temporary projection. See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow and extension boundaries.
