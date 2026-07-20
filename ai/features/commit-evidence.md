# Commit evidence

## Outcome

Recent commits expose technical evidence of progress without requiring a raw Git log.

## Behavior

- Repository context and commits occupy the wide reading column; focus tasks and the capability map form the planning rail.
- Branch, divergence, and working-tree state stay visible; the full branch list opens on demand.
- Below 900 px, the workspace follows resume-work priority: focus tasks first, repository evidence second, and the feature map last, without horizontal overflow.
- The recent-commit list shows the real changed-file count plus added and deleted line totals from `git log --numstat`.
- Expanding a commit loads paths, change types, per-file line totals, and an optional diff on demand; details stay cached for the React session.
- The diff is limited to 60,000 characters and clearly marked when truncated.
- Binary files show `binary` instead of invented line counts.

## Boundary and failure behavior

- Rust resolves the path from Orion's project record; the frontend never supplies one.
- Commit hashes must contain 7–64 hexadecimal characters before Git runs.
- Every Git invocation uses an executable plus an argument array, never a shell command string.
- Loading and errors stay local to the expanded commit, with retry available.

## Deliberate non-goals

- Full diff-review tooling, comments, staging, or history rewriting.
- Eagerly loading diffs for every recent commit.
- Treating commit size as proof that product progress occurred.
