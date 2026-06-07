# Dead Man's Papers Agent Rules

This file makes the `/home/thomas/dev` workspace rules explicit for sessions
started directly in this repo. Follow `/home/thomas/dev/AGENTS.md` first, then
apply these project-specific rules.

## Required Quality Loop

- Before editing, run:
  `/home/thomas/dev/scripts/dev-agent-check --repo /home/thomas/dev/dead-mans-papers --mode preflight`
- During implementation, use small slices and verify with:
  `/home/thomas/dev/scripts/dev-agent-check --repo /home/thomas/dev/dead-mans-papers --tier quick`
- Before handoff for normal code changes, run:
  `/home/thomas/dev/scripts/dev-agent-check --repo /home/thomas/dev/dead-mans-papers --tier standard`
- Before branch-and-push handoff, run:
  `/home/thomas/dev/scripts/dev-agent-check --repo /home/thomas/dev/dead-mans-papers --tier standard --mode final`

Do not report the task complete if content validation, typecheck, e2e, build,
or the harness fails. If a check was failing before your edits, document the
exact failure and separate it from your own changes.

## Project Commands

- Use Node `26.2.0`; project npm scripts select `.nvmrc` through
  `scripts/with-node.mjs`.
- `npm run validate:content`: narrative/content validation.
- `npm run check:types`: Node version check plus TypeScript.
- `npm run e2e`: Playwright.
- `npm test`: content validation, typecheck, and e2e.
- `npm run build`: typecheck plus production build.

## Worktree Coordination

- The foreground checkout is `/home/thomas/dev/dead-mans-papers` and should be
  treated as the integration checkout on `main`.
- Writing agents that need isolation should create sibling worktrees with:
  `/home/thomas/dev/dead-mans-papers/scripts/codex-worktree.sh <agent-name> main`
- Local claim files belong under:
  `/home/thomas/dev/dead-mans-papers/.agents/claims/`
- Do not edit overlapping files owned by another agent. Keep high-conflict files
  coordinator-owned unless explicitly assigned: package manifests, build/test
  config, generated outputs, global styles, broad narrative indexes, and shared
  content schemas.

## Scope Control

- Preserve narrative progression, save behavior, and existing scene routing
  unless the task explicitly asks to change them.
- Treat generated assets and build outputs as intentional only when the task
  explicitly owns them.
- For UI or scene-visible changes, use Playwright or browser evidence before
  handoff; do not rely on a text-only claim that it looks correct.
