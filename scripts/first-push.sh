#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/first-push.sh https://github.com/OWNER/REPOSITORY.git" >&2
  exit 2
fi

remote="$1"
if [[ -d .git ]]; then
  echo "This directory is already a Git repository. Refusing to reinitialize it." >&2
  exit 1
fi

git init
git branch -M main
git add .
git commit -m "Launch AI Incident Atlas"
git remote add origin "$remote"
git push -u origin main

echo
echo "✓ Project pushed to $remote"
echo "Next: enable GitHub Pages with Settings → Pages → GitHub Actions"
echo "or, if GitHub CLI is authenticated, run: bash scripts/enable-pages.sh"

