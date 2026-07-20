# Orion product contract

## Real objective

Orion keeps one reliable answer to four questions about every application project:

1. Where am I now?
2. What already works and what does not?
3. What changed recently in the repository?
4. What did I write down to do next?

Success means resuming any application without searching folders, old chats, or memory.

## First complete loop

1. Add a local Git repository through a native folder picker.
2. See its branch, cleanliness, recent activity, and feature health.
3. Open its cockpit.
4. Record the project's goal, active focus, manual task list, and feature inventory.
5. Refresh Git evidence without manually copying commit data.

## Sources of truth

- Git owns technical facts: repository root, branches, commits, working-tree state, and ahead/behind counts.
- SQLite owns product intent: registered projects, goals, focus history, manual tasks, next actions, and feature status.
- React state is only a current projection of those sources, not another database.

## MVP features

- Overview of all registered applications.
- Native local-repository picker.
- Project cockpit with goal and next action.
- Manual project tasks that can be added, completed, reopened, and removed.
- Feature inventory with status: planned, in progress, working, or blocked.
- Priority horizon: now, next, or later.
- Git telemetry: branches, recent commits, file/line evidence, changed-file count, and upstream divergence.
- Manual refresh and actionable repository errors.
- Evidence-backed repository feature proposals through local LM Studio, accepted explicitly by the builder.
- Cached commit-impact explanations and reviewable task/feature updates.

## Explicit non-goals for MVP

- GitHub issues, pull requests, or authentication.
- Automatic code changes or autonomous agents.
- Project-management suite with sprints, estimates, or team assignment.
- AI asserting that a feature works without repository evidence or user confirmation.
- Autonomous task creation or prioritization.
- Cloud sync or collaboration.

## Strong next stages

1. Evidence links between a feature and commits/tests.
2. Expand the visual mission map from current project facts.
3. Automatic scan of selected parent directories.
4. Local AI evaluation of the whole application overview and user flow.
5. GitHub enrichment for issues and pull requests.

These stages extend the same core model, not parallel workflows.
