#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${PROJECT_ROOT}/.venv/bin/activate"

echo "Starting workers..."

exec watchfiles "python -m app.workers" "$PROJECT_ROOT/app"