# Orion privacy

Orion is local-first. The public source repository and a user's Orion workspace are separate.

## What stays on the computer

Orion stores the following in `orion.sqlite3` under the operating system's application-data directory:

- registered repository paths;
- project names, goals, lifecycle states, and next actions;
- feature names, descriptions, priorities, statuses, and evidence notes.

On Windows, the database is stored below `%APPDATA%\app.orion.dashboard\`. SQLite may also create `orion.sqlite3-wal` and `orion.sqlite3-shm` beside it.

## What Orion reads

Orion runs the locally installed `git` executable to read repository roots, branches, commits, upstream divergence, and working-tree status. It does not copy repository contents into the Orion source repository.

## What Orion does not send

The MVP has no account, cloud sync, telemetry, analytics, GitHub authentication, or project-data upload. The browser-only demo uses generic fictional paths and identities.

## Public-repository boundary

The Git repository excludes SQLite databases and sidecars, local application data, build artifacts, exports, screenshots, credentials, cookies, and sessions. Publishing Orion's source code therefore does not publish projects registered in the installed application.

Before any future cloud, GitHub, AI, or collaboration integration is enabled, its network and personal-data flow must be documented and require an explicit product decision.

Removing a project from Orion deletes only its Orion records. It never deletes the repository or files in that repository.
