# Project focuses

## Outcome

Each project keeps one explicit current outcome. Tasks measure progress inside each focus, while all focus-assigned tasks collectively measure the saved project goal.

## Behavior

- A project has at most one active focus.
- Starting a focus archives the previous active focus instead of deleting or completing it.
- New tasks belong to the active focus; tasks from older focuses never move automatically.
- The completion ratio for a selected focus uses only tasks assigned to that focus.
- The user can switch between the goal and any focus without changing which focus receives new tasks.
- Goal text and focus titles can be edited directly in the manual flight plan.
- Removing a focus requires confirmation and permanently removes the focus together with its assigned tasks. Other focuses and their tasks remain unchanged.
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
- Reactivating an archived focus; selecting a focus changes the visible plan scope only.

## Visual progress

The mission deck separates identity, progress, and editing. The project planet sits inside interactive progress orbits: the outer ring shows completed tasks across every focus as a percentage of all focus-assigned tasks, while up to six recent focuses form concentric inner task-completion rings. Older focuses remain available in the task-panel selector.

Selecting the goal ring shows all contributing tasks grouped by focus in the read-only `Goal and focuses` panel and switches the editable task list below to its all-focus goal scope. Selecting a focus ring shows only that focus's contributing tasks and synchronizes the editable list. The list's always-visible selector switches between the goal and any focus and updates the orbit and preview in return. Local edit and remove actions operate on the selected goal or focus; destructive focus removal states the number of tasks that will also be removed. A mission path shows recent archived focuses, the current focus, and possible next feature branches. Narrow layouts order planet, progress details, path, then working panels without horizontal overflow. Transitions respect `prefers-reduced-motion`.
