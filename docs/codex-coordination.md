# Codex Coordination

This project uses aggressive Codex fan-out, but writing agents must not share a
checkout. The coordinator owns integration; workers own narrow slices.

## Fan-Out Default

The user has given standing authorization for subagent fan-out on non-trivial
work. Start with a fan-out preflight, spawn independent read-only audits,
searches, test/log checks, verification passes, or disjoint writing slices early,
and only skip subagents when the work is trivial, strictly linear, blocked on one
result, or write ownership would overlap.

## Boot Rule

If Codex starts in `/home/thomas/dev/dead-mans-papers`, it is not in a
worker checkout. It may inspect and coordinate, but it must not edit product
files until a dedicated worktree exists.

Writing agents should start from a path like:

```bash
/home/thomas/dev/dead-mans-papers-agent-ui-audit
```

The integration checkout remains available for review, integration, and final
verification only.

## Current Layout

- Integration checkout:
  `/home/thomas/dev/dead-mans-papers`
- Rules worktree:
  `/home/thomas/dev/dead-mans-papers-rules`
- Rules branch:
  `codex/rules`
- Local claim directory:
  `/home/thomas/dev/dead-mans-papers/.agents/claims/`

Run Git from this repo or from a sibling worktree root, or use
`git -C /home/thomas/dev/dead-mans-papers ...`.

## Current Failure Mode

If multiple Codex sessions are launched with:

```bash
codex -C /home/thomas/dev/dead-mans-papers
```

they can all discover and edit the same foreground checkout. That is a process
failure. Rehome each writing agent into its own worktree before further edits.

Do not try to repair this by reverting shared `main` changes. First inspect
ownership, then move or reapply each agent's changes from an isolated worktree.

## Creating A Writing Agent Worktree

From any shell:

```bash
/home/thomas/dev/dead-mans-papers/scripts/codex-worktree.sh ui-audit main
cd /home/thomas/dev/dead-mans-papers-agent-ui-audit
git status -sb
```

For rules and coordination work:

```bash
/home/thomas/dev/dead-mans-papers/scripts/codex-worktree.sh rules main
cd /home/thomas/dev/dead-mans-papers-rules
git status -sb
```

Then start Codex from that worktree:

```bash
codex --cd "$PWD"
```

When starting an agent from a parent thread, assign the agent type, worktree,
branch, and ownership block up front.

## Ownership Block

Every writing agent prompt should include this before edits begin:

```text
Objective:
Worktree:
Branch:
Base ref:
Claimed files:
Forbidden files:
Verification:
Integration owner:
```

Rules:

- Claimed files must be concrete paths when practical.
- Avoid broad claims such as `src/`, `frontend`, or `content`.
- Shared files belong to the coordinator unless explicitly assigned.
- If a needed file is already claimed, stop and report the conflict.

## Claim Files

For longer parallel sessions, create a local claim file:

```bash
mkdir -p /home/thomas/dev/dead-mans-papers/.agents/claims
$EDITOR /home/thomas/dev/dead-mans-papers/.agents/claims/ui-audit.md
```

Suggested content:

```md
# ui-audit

- Status: active
- Worktree: /home/thomas/dev/dead-mans-papers-agent-ui-audit
- Branch: codex/agent/ui-audit
- Objective:
- Claimed files:
- Forbidden files:
- Started:
- Owner:
```

Delete or archive the claim when the work is integrated or abandoned.

## Rehoming A Mislaunched Agent

If an agent has already started in the integration checkout:

1. Stop product edits in that session.
2. Record the dirty files it owns in `.agents/claims/<agent-name>.md`.
3. Create a worktree:

```bash
/home/thomas/dev/dead-mans-papers/scripts/codex-worktree.sh <agent-name> main
```

4. Restart Codex with `-C` pointing at the new worktree.
5. Reapply only that agent's owned changes there. Do not copy unrelated dirty
   files from `main`.

## Integration Checklist

Before integrating another agent's work:

```bash
git -C <agent-worktree> status -sb
git -C <agent-worktree> diff --stat main...
git -C <agent-worktree> diff --check
```

Then inspect the changed paths against the claim. If the agent touched
unclaimed files, review manually before merging or cherry-picking.

For application changes, run the project verification from the integration
checkout. The npm scripts select Node `26.2.0` from `.nvmrc` automatically:

```bash
npm test
```

For rules/docs-only changes, `git diff --check` is enough unless the changed
script needs a shell test.
