# Project focuses

## Outcome

Each project keeps one explicit, smaller outcome that defines what the builder is trying to achieve now. Tasks measure progress inside that focus without pretending to measure the whole application.

## Behavior

- A project has at most one active focus.
- Starting a focus archives the previous active focus instead of deleting or completing it.
- New tasks belong to the active focus; tasks from older focuses never move automatically.
- The completion ratio for a selected focus uses only tasks assigned to that focus.
- The user can view an archived focus and its tasks without making it active again.
- Focus titles contain 1–200 characters and remain local in Orion's SQLite data.
- Existing installations receive one active focus during migration, using the saved next action when available, so existing task progress is preserved.

## Failure and recovery

- Orion prevents adding tasks until a focus exists and offers the focus form in the same panel.
- If saving fails, the entered title remains visible and the error appears in the task panel.
- Starting a new focus is reversible in data terms because the previous focus and tasks remain in history. Viewing history does not reactivate or modify it.

## Deliberate non-goals

- Dates, estimates, owners, or simultaneous active focuses.
- Automatically declaring a focus complete.
- Reassigning old tasks when a new focus starts.

## Visual progress

The mission map uses two distinct measures. The outer ring contains one equal segment per feature and communicates status through color; it does not calculate a project percentage. Each recent focus receives a concentric inner ring, with the newest focus nearest the core. At most six focus rings remain visible to preserve legibility, while every older focus stays available in the task-panel selector. Selecting a ring or task-panel option keeps both surfaces synchronized and changes the explanation beneath the map. Short transitions respect `prefers-reduced-motion`.
