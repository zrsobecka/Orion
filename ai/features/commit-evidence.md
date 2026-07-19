# Commit evidence

## Outcome

Recent commits explain the concrete technical evidence behind project progress without requiring the builder to leave Orion or read a raw Git log first.

## Behavior

- The evidence workspace gives repository context and recent commits the wide reading column; active-focus tasks and the compact capability map form the planning rail beside it.
- Current branch, divergence, and working-tree state stay visible in one horizontal strip. The fuller branch list is disclosed on demand so it does not compete with commit evidence.
- Below 900 px, the workspace follows resume-work priority: focus tasks first, repository evidence second, and the feature map last, without horizontal overflow.
- The recent-commit list shows the real changed-file count plus added and deleted line totals from `git log --numstat`.
- Expanding a commit requests details on demand: file path, added/modified/deleted/renamed type, per-file line totals, and an optional technical diff.
- Loaded details remain cached in the current React session, so collapsing and reopening the same commit does not rerun Git.
- The diff is limited to 60,000 characters and clearly marked when truncated.
- Binary files show `binary` instead of invented line counts.

## Boundary and failure behavior

- Rust resolves the repository path from the Orion-owned project record; the frontend never supplies a filesystem path.
- Commit hashes must contain 7–64 hexadecimal characters before Git runs.
- Every Git invocation uses an executable plus an argument array, never a shell command string.
- Loading and errors stay local to the expanded commit, with retry available.

## Deliberate non-goals

- Full diff-review tooling, comments, staging, or history rewriting.
- Eagerly loading diffs for every recent commit.
- Treating commit size as proof that product progress occurred.
