# Project tasks

## Outcome

Each registered application has one small manual list where the user records what they want to do for that project. Orion stores the list locally and does not decide priorities or create tasks automatically.

## Behavior

- A task belongs to exactly one registered project.
- The user can add a task with a title of 1–200 characters.
- A task can be completed or reopened.
- A task can be removed.
- Open tasks appear before completed tasks; equally recent tasks retain a stable order.
- Removing a project from Orion also removes its Orion-owned tasks without touching repository files.

## Deliberate non-goals

- Due dates, estimates, tags, priorities, subtasks, or assignees.
- AI recommendations or automatic status changes.
- Synchronization with external task managers.
- Task-driven project progress percentages.

## Visual behavior

The project cockpit shows open-task count as one node in the mission orbit and keeps direct task entry beside the visual map. Motion provides orientation and atmosphere, while `prefers-reduced-motion` removes continuous animation for users who request it.
