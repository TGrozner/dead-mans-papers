# Dead Man's Papers Codex Rules

## Runtime

- Use Node `26.2.0` for project commands.
- Project npm scripts automatically select `.nvmrc` via `scripts/with-node.mjs`.
- For code changes, run `npm test` unless the user explicitly narrows verification.
- For docs/rules-only changes, run `git diff --check`.

## Worktree Coordination

- The foreground checkout is:
  `/home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers`
- The dedicated rules worktree is:
  `/home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers-rules`
- The rules branch is:
  `codex/rules`
- Use the rules worktree for durable Codex instructions, coordination docs, custom agents, and helper scripts.
- Do not edit product code from the rules worktree unless the user explicitly widens the scope.

## Agent Fan-Out

- Treat subagent fan-out as a standing user preference for non-trivial work.
- Start each non-trivial task with a fan-out preflight: identify independent
  read-only audits, searches, test/log checks, verification passes, or disjoint
  writing slices that can run in parallel.
- Spawn useful independent subagents early instead of waiting for a per-task
  request. If none are spawned, state why: trivial task, strictly linear path, a
  single blocking result, or overlapping write ownership.
- Read-only agents may inspect the foreground checkout. Writing agents must use
  isolated worktrees, explicit ownership, and claim files before editing.

## Hard Stop For Writing Agents

- The foreground checkout on `main` is for integration, inspection, and final
  verification.
- If you are a writing agent and you are in
  `/home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers` on `main`,
  stop before editing unless the user explicitly made you the integration
  owner.
- If the session was launched from
  `/home/thomas/dev/dead-mans-papers-workspace`, create and enter an agent
  worktree before product edits.
- Do not continue writing in `main` just because the working tree is already
  dirty. Inspect the dirty paths, identify ownership, and return to the
  coordinator if ownership is unclear.
- Existing dirty changes from another agent are not permission to edit the same
  files. Treat them as a conflict unless your ownership block says otherwise.

## Writing Agents

- Default to one Git worktree per writing agent.
- Create agent worktrees from the real repo root with:
  `/home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers/scripts/codex-worktree.sh <agent-name> main`
- Every writing agent must have explicit ownership before editing:
  objective, branch, worktree path, claimed files, and forbidden files.
- Claims can be recorded locally under:
  `/home/thomas/dev/dead-mans-papers-workspace/.agents/claims/`
- The worktree helper creates a starter claim file when possible. Fill it in
  before editing.
- If two agents need the same file, stop and return to the coordinator.
- Read-only agents may inspect the foreground checkout, but they must not edit it.

## Coordinator-Owned Files

Unless explicitly assigned, keep these with the main coordinator:

- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `vite.config.ts`
- `tsconfig.json`
- global CSS such as `src/style.css`
- broad narrative indexes and shared content schemas
- generated assets and build outputs

## Git Safety

- Do not run Git from `/home/thomas/dev/dead-mans-papers-workspace`; use a real repo/worktree root.
- Start edits with `git status -sb`.
- Inspect changed paths before integration with `git diff --stat`.
- Never revert user changes or another agent's changes unless the user explicitly asks.
- Never check out the same branch in two worktrees.
