#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${REPO_PATH:-/repo}"

if [ ! -d "$REPO_PATH/.git" ]; then
  echo "Repo not found at $REPO_PATH"
  exit 1
fi

cd "$REPO_PATH"
git pull --rebase

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d --build
else
  docker compose up -d --build
fi
