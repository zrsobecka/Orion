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

The mission deck separates identity, progress, and history instead of merging them into one graphic. The project planet remains inside its technical orbits, while a neighboring progress instrument represents the main goal and recent focuses. Its outer ring contains one equal segment per feature and communicates status through color; it does not calculate a project percentage. Each recent focus receives a concentric inner ring, with the newest focus nearest the core. At most six focus rings remain visible to preserve legibility, while every older focus stays available in the task-panel selector.

A horizontal mission path beneath both instruments shows recent archived focuses, the current focus, and possible next feature branches. Selecting a focus ring, mission-path node, or task-panel option keeps all three surfaces synchronized and changes the progress explanation. At narrow widths, the order becomes planet, progress, path, then working panels without horizontal page overflow. Short transitions respect `prefers-reduced-motion`.
