set dotenv-load

default:
    @just --list

# Install backend and web dependencies
install:
    uv sync
    cd web && pnpm install

# Run API (:8000) and web UI (:5173) together with hot reload
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    uv run ytiq --reload &
    (cd web && pnpm dev) &
    wait

# Run the API only
server:
    uv run ytiq --reload

# Run the web UI only
web:
    cd web && pnpm dev

# Build the UI into ytiq/static and serve it from FastAPI on :8000
start: build
    uv run ytiq

# Build the UI into ytiq/static
build:
    cd web && pnpm build

# Run backend tests
test:
    uv run pytest
