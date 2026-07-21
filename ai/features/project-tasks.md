# Project tasks

## Outcome

Each project has one local manual task list. Orion neither decides priorities nor creates tasks automatically.

## Behavior

- A task belongs to exactly one registered project and, when created, to its active focus.
- A task can optionally point to one feature from that same project. General work can remain unlinked.
- The user can add a task with a title of 1–200 characters.
- A task can be completed or reopened.
- A task can be removed.
- Open tasks appear before completed tasks; equally recent tasks retain a stable order.
- Starting a new focus leaves existing tasks attached to the previous focus.
- The panel switches between active and archived focuses; tasks can be added only to the active focus.
- Removing a project from Orion also removes its Orion-owned tasks without touching repository files.

## Deliberate non-goals

- Due dates, estimates, tags, priorities, subtasks, or assignees.
- AI recommendations or automatic status changes.
- Synchronization with external task managers.
- Estimates, weights, or manually overridden progress percentages.

## Visual behavior

The cockpit shows the active focus's open-task count in the mission orbit and keeps the editable task list below the map. The orbit's outer ring aggregates all focus-assigned tasks; each inner ring uses only one focus's tasks. The read-only `Goal and focuses` panel previews the tasks behind the selected percentage without replacing the editable list. A selector changes focus history without moving tasks. The composer optionally links a feature, whose name appears on the task. In narrow panels the title uses a full row so the feature selector and add action remain readable. `prefers-reduced-motion` removes continuous animation.
