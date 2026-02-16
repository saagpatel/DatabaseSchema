#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

LEAN_TMP_ROOT="$(mktemp -d -t dbviz-lean-dev-XXXXXX)"
LEAN_CARGO_TARGET_DIR="$LEAN_TMP_ROOT/cargo-target"
LEAN_VITE_CACHE_DIR="$LEAN_TMP_ROOT/vite-cache"
LEAN_DEV_PORT="${LEAN_DEV_PORT:-1420}"

mkdir -p "$LEAN_CARGO_TARGET_DIR" "$LEAN_VITE_CACHE_DIR"

cleanup() {
  local exit_code=$?

  if [ -d "$LEAN_TMP_ROOT" ]; then
    rm -rf "$LEAN_TMP_ROOT"
  fi

  npm run clean:heavy >/dev/null 2>&1 || true

  exit "$exit_code"
}
trap cleanup EXIT INT TERM

export CARGO_TARGET_DIR="$LEAN_CARGO_TARGET_DIR"
export VITE_CACHE_DIR="$LEAN_VITE_CACHE_DIR"
export TAURI_DEV_PORT="$LEAN_DEV_PORT"

echo "[lean-dev] temporary cargo target: $CARGO_TARGET_DIR"
echo "[lean-dev] temporary vite cache: $VITE_CACHE_DIR"
echo "[lean-dev] tauri dev port: $TAURI_DEV_PORT"

npm run tauri dev -- --port "$TAURI_DEV_PORT"
