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

See [CODEBASE.md](CODEBASE.md) for path ownership. Cross-boundary rules are strict: the frontend uses one typed native adapter, Rust commands validate incoming paths and values, persistence owns migrations and SQL, and Git runs directly with argument arrays. SQLite lives under the operating system's application-data directory, never in the repository.

## Persistent entities

- `projects`: unique local repository path, goal, next action, and lifecycle status.
- `features`: a project-owned capability, priority horizon, working status, and evidence note.
- `project_tasks`: a project-owned manual task with a durable completion state.

Foreign keys and check constraints protect valid relationships and status values. Schema upgrades use `PRAGMA user_version` migrations.

## Failure behavior

- One missing or invalid repository does not block the rest of the dashboard; its Git panel shows an actionable error.
- Adding a duplicate repository returns the existing project instead of creating duplicate state.
- Removing a project only removes it from Orion. It never deletes repository files.
- Removing a project removes its Orion-owned tasks through the SQLite foreign-key relationship.
- Git is launched directly with an argument array, so repository paths are not interpreted as shell commands.
