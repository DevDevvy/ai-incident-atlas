#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required for this optional helper." >&2
  echo "You can instead use GitHub: Settings → Pages → Source: GitHub Actions." >&2
  exit 1
fi

repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
api="repos/${repo}/pages"
headers=(-H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2026-03-10")

if gh api "${headers[@]}" "$api" >/dev/null 2>&1; then
  gh api --method PUT "${headers[@]}" "$api" -f build_type=workflow >/dev/null
  echo "✓ GitHub Pages updated to use the Actions workflow for $repo"
else
  gh api --method POST "${headers[@]}" "$api" -f build_type=workflow >/dev/null
  echo "✓ GitHub Pages enabled with Actions workflow for $repo"
fi

echo "Push to main or run the 'Deploy GitHub Pages' workflow to publish."

