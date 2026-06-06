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

## Mandatory Subagent Fan-Out

- Treat subagent fan-out as a standing user preference for non-trivial work; do
  not wait for another per-task request.
- Start each non-trivial task with a visible fan-out preflight before the first
  substantial local investigation or implementation step.
- If two or more independent read-only questions, searches, verification checks,
  or disjoint write slices exist, spawn useful subagents immediately in the
  first round.
- Parallel shell/tool calls are useful, but they do not satisfy this requirement
  on substantial work when a subagent tool is available.
- If no subagents are spawned, state the blocking reason in the first update:
  no subagent tool is available, the task is tiny, the path is strictly linear,
  the next step depends on one blocking result, or write ownership would overlap.
- If no subagent tool is available, say so and use maximum safe parallel tool
  calls as the fallback.
- The QCM rule blocks writing decisions, not safe read-only fan-out. When the
  repo target is clear, start independent read-only audits/searches in parallel
  even if implementation choices still need clarification.
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
