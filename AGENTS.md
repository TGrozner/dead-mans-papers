# Dead Man's Papers Codex Rules

## Runtime

- Use Node `23.8.0` for project commands.
- If the default shell Node is older, prefix commands with:
  `PATH=/home/thomas/.nvm/versions/node/v23.8.0/bin:$PATH`
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
