# Orion product contract

## Real objective

Orion keeps one reliable answer to four questions about every application project:

1. Where am I now?
2. What already works and what does not?
3. What changed recently in the repository?
4. What is the next concrete step?

Success means a builder can resume work on any application without opening several folders, reading old chats, or reconstructing project state from memory.

## First complete loop

1. Add a local Git repository through a native folder picker.
2. See it on the overview with current branch, repository cleanliness, recent activity, and feature health.
3. Open its cockpit.
4. Record the project's goal, next action, and feature inventory.
5. Refresh Git evidence without manually copying commit data.

## Sources of truth

- Git owns technical facts: repository root, branches, commits, working-tree state, and ahead/behind counts.
- SQLite owns product intent: registered projects, goals, next actions, and feature status.
- React state is only a current projection of those sources, not another database.

## MVP features

- Overview of all registered applications.
- Native local-repository picker.
- Project cockpit with goal and next action.
- Feature inventory with status: planned, in progress, working, or blocked.
- Priority horizon: now, next, or later.
- Git telemetry: current branch, local branches, recent commits, changed-file count, and upstream divergence.
- Manual refresh and actionable repository errors.

## Explicit non-goals for MVP

- GitHub issues, pull requests, or authentication.
- Automatic code changes or autonomous agents.
- Full project-management suite with sprints, estimates, and team assignment.
- AI asserting that a feature works without verifiable evidence.
- Cloud sync or collaboration.

## Strong next stages

1. Evidence links between a feature and commits/tests.
2. Automatic scan of selected parent directories.
3. Local AI project analyst that proposes changes for confirmation.
4. GitHub enrichment for issues and pull requests.

These stages expand the same core model instead of creating parallel workflows.
