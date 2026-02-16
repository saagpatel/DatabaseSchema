#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

paths=(
  "dist"
  "src-tauri/target"
  "node_modules/.vite"
)

for path in "${paths[@]}"; do
  if [ -e "$path" ]; then
    rm -rf "$path"
    echo "removed $path"
  fi
done
