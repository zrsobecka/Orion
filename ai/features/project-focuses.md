# Project focuses

## Outcome

Each project keeps one explicit current outcome. Tasks measure progress inside it, not across the whole application.

## Behavior

- A project has at most one active focus.
- Starting a focus archives the previous active focus instead of deleting or completing it.
- New tasks belong to the active focus; tasks from older focuses never move automatically.
- The completion ratio for a selected focus uses only tasks assigned to that focus.
- The user can view an archived focus and its tasks without making it active again.
- Focus titles contain 1–200 characters and remain local in Orion's SQLite data.
- Migration gives existing projects an active focus from the saved next action when available, preserving task progress.

## Failure and recovery

- Orion prevents adding tasks until a focus exists and offers the focus form in the same panel.
- If saving fails, the entered title remains visible and the error appears in the task panel.
- Starting a focus preserves the previous focus and tasks in history; viewing history never reactivates or modifies it.

## Deliberate non-goals

- Dates, estimates, owners, or simultaneous active focuses.
- Automatically declaring a focus complete.
- Reassigning old tasks when a new focus starts.

## Visual progress

The mission deck separates identity, progress, and history. The project planet remains in its technical orbits; a neighboring instrument represents the main goal and recent focuses. Its outer ring has one equal, status-colored segment per feature and never calculates a project percentage. Up to six recent focuses form concentric inner rings, newest nearest the core; older focuses remain in the task-panel selector.

A mission path shows recent archived focuses, the current focus, and possible next feature branches. Selecting a ring, path node, or task-panel option synchronizes all three and updates the explanation. Narrow layouts order planet, progress, path, then working panels without horizontal overflow. Transitions respect `prefers-reduced-motion`.
