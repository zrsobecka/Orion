# Project tasks

## Outcome

Each registered application has one small manual list where the user records what they want to do for that project. Orion stores the list locally and does not decide priorities or create tasks automatically.

## Behavior

- A task belongs to exactly one registered project and, when created, to its active focus.
- A task can optionally point to one feature from that same project. General work can remain unlinked.
- The user can add a task with a title of 1–200 characters.
- A task can be completed or reopened.
- A task can be removed.
- Open tasks appear before completed tasks; equally recent tasks retain a stable order.
- Starting a new focus leaves existing tasks attached to the previous focus.
- Removing a project from Orion also removes its Orion-owned tasks without touching repository files.

## Deliberate non-goals

- Due dates, estimates, tags, priorities, subtasks, or assignees.
- AI recommendations or automatic status changes.
- Synchronization with external task managers.
- Treating task completion as the project's overall progress.

## Visual behavior

The project cockpit shows open-task count as one node in the mission orbit and keeps direct task entry beside the visual map. The composer offers an optional feature relationship and each linked task shows the feature name. Motion provides orientation and atmosphere, while `prefers-reduced-motion` removes continuous animation for users who request it.
