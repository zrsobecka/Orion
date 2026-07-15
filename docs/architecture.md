# Orion architecture

## Shape

Orion is a local-first Tauri 2 desktop application with a React + TypeScript interface and a Rust application core.

```text
React view
  -> feature hook
    -> typed desktop-runtime adapter
      -> narrow Tauri command
        -> project database service -> SQLite in the OS app-data directory
        -> Git service -> git executable with argument arrays (never a shell string)
```

## Ownership boundaries

- `src/app/` owns startup and the stable desktop shell.
- `src/features/projects/` owns project workflow, UI, state coordination, and domain projections.
- `src/services/desktop-runtime.ts` is the only frontend boundary to Tauri and native plugins.
- `src-tauri/src/commands/` validates and translates frontend requests.
- `src-tauri/src/services/database.rs` owns schema, migrations, and SQL.
- `src-tauri/src/services/git.rs` owns safe Git process execution and parsing.
- SQLite is stored below the operating system's application-data directory, never in the repository.

## Persistent entities

- `projects`: unique local repository path, goal, next action, and lifecycle status.
- `features`: a project-owned capability, priority horizon, working status, and evidence note.

Foreign keys and check constraints protect valid relationships and status values. Schema upgrades use `PRAGMA user_version` migrations.

## Failure behavior

- One missing or invalid repository does not block the rest of the dashboard; its Git panel shows an actionable error.
- Adding a duplicate repository returns the existing project instead of creating duplicate state.
- Removing a project only removes it from Orion. It never deletes repository files.
- Git is launched directly with an argument array, so repository paths are not interpreted as shell commands.
