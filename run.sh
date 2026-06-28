#!/usr/bin/env bash
# One-liner runner — picks whichever runtime is available.
#
#   ./run.sh         → docker compose (recommended)
#   ./run.sh node    → local node 22
#   ./run.sh static  → just serve the dist/ folder with Python
set -euo pipefail

mode="${1:-auto}"

case "$mode" in
  auto)
    if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
      mode=docker
    elif command -v node >/dev/null; then
      mode=node
    else
      mode=static
    fi
    ;;
esac

case "$mode" in
  docker)
    exec docker compose up --build web
    ;;
  node)
    [ -d node_modules ] || npm install
    [ -d dist ] || npm run build
    exec npx vite preview --host --port 8080
    ;;
  static)
    [ -d dist ] || { echo "dist/ missing — build it first with: npm install && npm run build"; exit 1; }
    cd dist
    exec python3 -m http.server 8080
    ;;
  *)
    echo "Unknown mode: $mode (use: docker | node | static)" >&2
    exit 2
    ;;
esac
