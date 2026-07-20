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
        -> LM Studio service -> local structured chat API
```

## Ownership boundaries

See [CODEBASE.md](CODEBASE.md) for path ownership. The frontend uses one typed native adapter; Rust commands validate incoming paths and values; persistence owns migrations and SQL. SQLite lives in the operating system's application-data directory, never in the repository.

## Persistent entities

- `projects`: unique local repository path, goal, next action, and lifecycle status.
- `features`: a project-owned capability, priority horizon, working status, and evidence note.
- `project_tasks`: a project-owned manual task with a durable completion state.

LM Studio is a replaceable inference boundary, not a source of truth. Each consumer owns its prompt, context policy, schema, and acceptance rules. AI proposals become durable only after explicit confirmation and validated SQLite writes.

Foreign keys and check constraints protect valid relationships and status values. Schema upgrades use `PRAGMA user_version` migrations.

## Failure behavior

- One missing or invalid repository does not block the rest of the dashboard; its Git panel shows an actionable error.
- Adding a duplicate repository returns the existing project instead of creating duplicate state.
- Removing a project deletes its Orion records, including related tasks, but never repository files.
- Git is launched directly with an argument array, so repository paths are not interpreted as shell commands.
