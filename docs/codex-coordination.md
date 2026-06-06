# Codex Coordination

This project uses aggressive Codex fan-out, but writing agents must not share a
checkout. The coordinator owns integration; workers own narrow slices.

## Current Layout

- Integration checkout:
  `/home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers`
- Rules worktree:
  `/home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers-rules`
- Rules branch:
  `codex/rules`
- Local claim directory:
  `/home/thomas/dev/dead-mans-papers-workspace/.agents/claims/`

The workspace root has support files, but the Git repository is the
`dead-mans-papers` directory. Run Git from a repo/worktree root, or use
`git -C /home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers ...`.

## Creating A Writing Agent Worktree

From any shell:

```bash
/home/thomas/dev/dead-mans-papers-workspace/scripts/codex-worktree.sh ui-audit main
cd /home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers-agent-ui-audit
git status -sb
```

For rules and coordination work:

```bash
/home/thomas/dev/dead-mans-papers-workspace/scripts/codex-worktree.sh rules main
cd /home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers-rules
git status -sb
```

Then start Codex from that worktree:

```bash
codex --cd "$PWD"
```

If the agent is started from a parent thread, ask for the relevant agent type
and include the ownership block below in the prompt.

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
mkdir -p /home/thomas/dev/dead-mans-papers-workspace/.agents/claims
$EDITOR /home/thomas/dev/dead-mans-papers-workspace/.agents/claims/ui-audit.md
```

Suggested content:

```md
# ui-audit

- Status: active
- Worktree: /home/thomas/dev/dead-mans-papers-workspace/dead-mans-papers-agent-ui-audit
- Branch: codex/agent/ui-audit
- Objective:
- Claimed files:
- Forbidden files:
- Started:
- Owner:
```

Delete or archive the claim when the work is integrated or abandoned.

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
checkout with Node `23.8.0`:

```bash
PATH=/home/thomas/.nvm/versions/node/v23.8.0/bin:$PATH npm test
```

For rules/docs-only changes, `git diff --check` is enough unless the changed
script needs a shell test.
