# Commit impact analysis

## Outcome

Orion translates one commit into product evidence and proposes a small, reviewable state update. AI never changes tasks, features, focus, or goal by itself.

## Context and execution

- Analysis runs through the configured local LM Studio server.
- Context is limited to one recent commit: subject, author, file/status/line evidence, up to 18,000 diff characters, project goal, active focus, and at most 30 existing tasks and features.
- Structured output is validated after generation. Unknown task/feature IDs and invalid feature statuses are discarded.
- Text fields are trimmed and length-limited before persistence.

## Cache

- Cache identity is project ID + commit hash + prompt version (`commit-impact-v1`).
- The first valid result wins if duplicate requests finish concurrently.
- Reopening or re-requesting the same analysis returns SQLite data without calling the model again.
- Because cached relationships may become stale, review controls show current tasks and features and the backend revalidates them on approval.

## Review loop

1. The user expands a commit and asks Orion to analyze its impact.
2. Orion shows what changed, what is now possible, a concrete caution, focus impact, big-goal impact, and optional task/feature relationships.
3. The user can replace or remove the task/feature relationships and choose the proposed feature status.
4. `Approve updates` applies only the edited fields in one SQLite transaction; `Reject` records the decision without product-state changes.
5. Accepted task/feature changes return a fresh project snapshot, which moves the relevant progress ring.

Repeated review is idempotent. An already accepted or rejected analysis cannot apply a different decision later.

## Failure and recovery

- The interface shows local loading beside the commit and remains usable elsewhere.
- LM Studio connection, timeout, model, structured-output, Git, validation, and persistence failures retain the commit details and offer retry.
- A failed or dismissed wait never performs project-state writes. Valid completed analysis is cached when it arrives.

## Deliberate non-goals

- Automatic task creation, feature creation, goal scoring, or focus completion.
- Silent status updates, autonomous prioritization, or background analysis of all commits.
- Cloud-model fallback or repository upload.
