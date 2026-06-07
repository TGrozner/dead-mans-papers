#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/codex-worktree.sh <agent-name> [base-ref]

Examples:
  scripts/codex-worktree.sh rules main
  scripts/codex-worktree.sh ui-audit main

Creates a sibling Git worktree for a Codex writing agent and a starter local
claim file under .agents/claims/.

Conventions:
  rules        -> ../dead-mans-papers-rules on branch codex/rules
  <agent-name> -> ../dead-mans-papers-agent-<agent-name> on branch codex/agent/<agent-name>

Set CODEX_REPO_ROOT to override the repository path.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

agent_name="${1:-}"
base_ref="${2:-main}"

if [[ -z "$agent_name" ]]; then
  usage >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
candidate_root="$(cd "$script_dir/.." && pwd)"

if [[ -n "${CODEX_REPO_ROOT:-}" ]]; then
  repo_root="$CODEX_REPO_ROOT"
elif git -C "$candidate_root" rev-parse --show-toplevel >/dev/null 2>&1 &&
  [[ "$(git -C "$candidate_root" rev-parse --show-toplevel)" == "$candidate_root" ]]; then
  repo_root="$candidate_root"
else
  workspace_dir="$candidate_root"
  repo_root="$workspace_dir/dead-mans-papers"
fi

repo_root="$(cd "$repo_root" && pwd)"
workspace_dir="$(cd "$(dirname "$repo_root")" && pwd)"

if ! git -C "$repo_root" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Not a Git repository: $repo_root" >&2
  exit 1
fi

safe_name="$(printf '%s' "$agent_name" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9._-' '-')"
safe_name="${safe_name#-}"
safe_name="${safe_name%-}"

if [[ -z "$safe_name" ]]; then
  echo "Agent name must contain at least one ASCII letter, digit, dot, underscore, or dash." >&2
  exit 2
fi

repo_name="$(basename "$(git -C "$repo_root" rev-parse --show-toplevel)")"

if [[ "$safe_name" == "rules" ]]; then
  branch_name="codex/rules"
  target_path="$workspace_dir/$repo_name-rules"
else
  branch_name="codex/agent/$safe_name"
  target_path="$workspace_dir/$repo_name-agent-$safe_name"
fi

worktree_for_branch() {
  git -C "$repo_root" worktree list --porcelain |
    awk -v branch="refs/heads/$branch_name" '
      /^worktree / { current = substr($0, 10) }
      /^branch / && substr($0, 8) == branch { print current }
    '
}

ensure_claim() {
  local claim_dir claim_file started_at
  claim_dir="$repo_root/.agents/claims"
  claim_file="$claim_dir/$safe_name.md"
  started_at="$(date -Iseconds)"

  mkdir -p "$claim_dir"

  if [[ -e "$claim_file" ]]; then
    echo "Claim already exists: $claim_file"
    return
  fi

  cat >"$claim_file" <<EOF
# $safe_name

- Status: active
- Worktree: \`$target_path\`
- Branch: \`$branch_name\`
- Base ref: \`$base_ref\`
- Objective: TODO
- Claimed files:
  - TODO
- Forbidden files:
  - \`/home/thomas/dev/dead-mans-papers\` unless explicitly assigned as integration owner
  - files already owned by another active claim
- Verification: TODO
- Started: $started_at
- Owner: TODO
EOF

  echo "Created claim: $claim_file"
}

if [[ -e "$target_path" ]]; then
  if git -C "$target_path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    existing_top="$(git -C "$target_path" rev-parse --show-toplevel)"
    if [[ "$existing_top" == "$target_path" ]]; then
      echo "Worktree already exists: $target_path"
      ensure_claim
      git -C "$target_path" status -sb
      exit 0
    fi
  fi

  echo "Target path already exists and is not the expected worktree: $target_path" >&2
  exit 1
fi

branch_owner="$(worktree_for_branch)"
if [[ -n "$branch_owner" ]]; then
  echo "Branch $branch_name is already checked out at: $branch_owner" >&2
  echo "Choose another agent name or remove/hand off that worktree first." >&2
  exit 1
fi

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$branch_name"; then
  git -C "$repo_root" worktree add "$target_path" "$branch_name"
else
  git -C "$repo_root" worktree add -b "$branch_name" "$target_path" "$base_ref"
fi

ensure_claim

cat <<EOF
Created worktree:
  path:   $target_path
  branch: $branch_name
  base:   $base_ref

Next:
  cd "$target_path"
  git status -sb
EOF
