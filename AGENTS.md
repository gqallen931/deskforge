# Deskforge Agent Operating Contract

This file is the mandatory starting point for every AI coding agent working in this repository. Read it completely before planning, editing, running commands, or recommending architecture. The rules below are persistent project requirements, not suggestions.

## 1. Project identity and scope

- Product name: **Deskforge**. Do not reintroduce `WenXiBuddy`, `WenXinBuddy`, `WB`, or similar legacy branding in the product UI, package metadata, window title, documentation, or new identifiers. The only acceptable legacy references are historical explanations and the immutable visual reference source.
- Product direction: a commercial-quality, installable **Windows local personal workbench**.
- Main repository and upload boundary: `D:\WebStorm-work\wenxibuddy-main\deskforge` only. Do not treat the parent folder, `A-UI`, or unrelated sibling projects as part of the Git repository.
- GitHub repository: private repository `gqallen931/deskforge`. Never make it public or push secrets, local databases, test profiles, installers, or user data.
- Current phase is local single-user software. Do not add cloud accounts, synchronization, multi-user collaboration, remote services, or a network backend unless the user explicitly starts that phase.

## 2. Non-negotiable visual contract

- The canonical visual reference is `..\A-UI\展示\task-dashboard.html` with `task-dashboard.js`.
- The running Dashboard must look like that reference: same three-column structure, spacing, content density, task presentation, right panel, Gantt chart, motion, and overall dark-glass visual language.
- Allowed intentional visual difference: replace the old brand with **DF / Deskforge**.
- Do not redesign, modernize, simplify, reinterpret, or create a visually different Dashboard. Functional correctness does not excuse visual drift.
- `public/dashboard.html` is the current Deskforge-branded visual shell. Preserve its A-UI DOM/CSS/animation behavior.
- React migration follows a strangler approach: migrate business modules behind the existing visual entry points. Do not remove the visual iframe until the replacement preserves the same DOM/layout/animation under visual regression tests and the user explicitly accepts it.
- Every migrated module must retain its SQLite path, secure IPC path, and visual regression coverage.

## 3. Explicit feature constraints


- Current migrated React modules: settings, notifications/reminders, projects and project-task links, task board/filter/sort/details, files/knowledge archive, timeline, analysis, team, workspaces, and global search.
- Existing buttons should call real functionality through IPC and SQLite. Do not leave fake success messages, in-memory-only mutations, or decorative controls for a feature described as complete.
- Settings includes local preferences, JSON import/export, backup/restore/history/retention, password change, update status, privacy policy, and terms.
- Preserve local authentication and all-business IPC session guards.

## 4. Architecture and security boundaries

```text
A-UI visual entry
  → postMessage / React module host
  → React feature
  → window.deskforge API
  → context-isolated Preload whitelist
  → Electron Main service/repository
  → SQLite / local filesystem
```

- Frontend: Electron + React + Vite.
- Local backend/business layer: Electron Main in Node.js/CommonJS.
- Database: Electron's SQLite (`node:sqlite`). Users must not need to install SQLite or MySQL.
- MySQL 8.1 credentials previously discussed are not part of the local product and must not be committed or required.
- Keep `contextIsolation: true` and `nodeIntegration: false`.
- Renderer code must never import Node.js modules, open SQLite directly, or bypass Preload.
- Every Preload channel must have a matching Main handler and be covered by `npm run verify:ipc`.
- Validate and normalize inputs in Main services. Preserve authentication, login throttling, scrypt password hashing, migration snapshots, safe imports, and backup retention.
- Preserve user data across upgrades and normal uninstalls. Never delete `%APPDATA%\Deskforge`, local databases, backups, or user-selected files without explicit user authorization and a verified target.
- For a future network phase, the current recommendation is Python + FastAPI, but it must be introduced only after an explicit architecture decision. Java is not required for the local desktop phase.

## 5. Current implementation map

- `src/features/auth/`: local login and initial account setup.
- `src/features/dashboard/LegacyDashboardHost.jsx`: A-UI visual shell and React module routing boundary.
- `src/features/settings/`: settings and local data management.
- `src/features/notifications/`: notifications and reminders.
- `src/features/projects/`: projects and project-task association.
- `src/features/tasks/`: task board, filter, sort, detail and CRUD.
- `src/features/files/`: local file index and knowledge archive.
- `src/features/timeline/`: deadline timeline.
- `electron/`: Main-process business services, repositories, migrations, authentication, updates and SQLite.
- `public/dashboard.html`: active A-UI-compatible visual shell.
- `public/task-dashboard.js`: legacy visual interactions and bridge events.
- `docs/`: engineering source of truth and task history.
- `_templates/`: mandatory documentation formats and maintenance rules.

## 6. Required workflow for every task

1. Read this file, `_templates/README.md`, `docs/INDEX.md`, and the relevant architecture/feature/bug documents before editing.
2. Inspect the current Git status and preserve unrelated user changes. Never reset or overwrite them.
3. State assumptions when they affect architecture, data, visual behavior, or scope.
4. Implement the smallest complete change that preserves the contracts above.
5. Test in proportion to the change. A feature is not complete when only the UI renders; verify its service, IPC, SQLite persistence, and relevant real Electron entry point.
6. After **every completed task**, and again before ending the working conversation, update `docs` according to `_templates/README.md`:
   - feature work → `docs/features/YYYY-MM-DD_*.md`;
   - bug fixes → `docs/bugs/YYYY-MM-DD_*.md`;
   - architecture changes → ADR and `docs/architecture/project-architecture.md` version/history;
   - every phase → `docs/architecture/YYYY-MM-DD_development-journal.md`;
   - every new document/status change → `docs/INDEX.md`.
7. Documentation must record operations, results, errors, root causes, solutions, verification output, changed files, limitations, and next work. Match existing Chinese document style and template structure.
8. Do not claim completion while required tests or documentation are missing.

## 7. Minimum verification matrix

Run the relevant subset; run all core checks after cross-module or architecture changes.

```powershell
npm run build
npm run verify:tasks
npm run verify:data
npm run verify:workbench
npm run verify:migrations
npm run verify:reminders
npm run verify:auth
npm run verify:ipc
npm run verify:react-migration
```

- Visual migration must verify A-UI three-column layout, Deskforge branding, original Gantt/animations, and each React module entry.
- Packaged runtime tests are required when changing Electron startup, production asset paths, Preload/Main IPC, native runtime behavior, installer behavior, or release assets.
- Packaging is a verification tool, not permission to publish. Do not create a GitHub release, alter update feeds, sign, install, uninstall, or push unless the user requests that external action.

## 8. Git and release rules

- Never commit `.env`, credentials, tokens, SQLite files, backup data, `.tmp-*`, `release/`, or user-selected documents.
- Do not commit or push automatically unless the user asks for it or the active request explicitly includes repository publication.
- Before a requested push: run tests, inspect the staged diff, use a descriptive commit, push only the `deskforge` repository, and confirm the remote remains private.
- Release work is currently deferred. Do not prioritize auto-update feeds, code signing, installer lifecycle, legal finalization, or cloud deployment unless requested.
- Existing release scaffolding may be preserved, but do not represent unsigned builds or disabled update feeds as commercially ready.

## 9. Decision precedence

When instructions conflict, use this order:

1. The user's latest explicit request.
2. Safety, privacy, and user-data preservation.
3. This `AGENTS.md` contract.
4. `docs/architecture/project-architecture.md` and accepted ADRs.
5. Feature documents and development journal.
6. Historical implementation details.

If the latest request would intentionally break a persistent constraint, explain the conflict before changing it and update this file plus the architecture documents after the user confirms.

## 10. Fast onboarding checklist

An incoming agent should be able to answer all of these before coding:

- Is the work confined to `deskforge`?
- Does the plan preserve the A-UI appearance exactly except Deskforge branding?
- Are AI suggestions and Messages still `正在开发中`?
- Does data flow through React → Preload IPC → Main → SQLite?
- Is local authentication and user data preserved?
- Are release/cloud tasks outside the current request?
- Which tests will prove the UI, IPC, and persistence paths?
- Which `docs` files must be updated before completion?

If any answer is unknown, inspect the repository and documentation before acting.
