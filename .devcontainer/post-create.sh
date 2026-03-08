#!/usr/bin/env bash
set -euo pipefail

cd /workspace

echo "Setting up pnpm..."

# Shared cache paths are mounted as named Docker volumes in docker-compose.
PNPM_STORE_PATH="${PNPM_STORE_PATH:-$HOME/.pnpm-store}"
mkdir -p "$PNPM_STORE_PATH"

# Named Docker volumes may be root-owned on first mount; ensure node can write caches.
if [ ! -w "$PNPM_STORE_PATH" ]; then
  if command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "$PNPM_STORE_PATH"
    sudo chown -R "$(id -u)":"$(id -g)" "$PNPM_STORE_PATH" || true
    sudo chmod -R ug+rwX,o-rwx "$PNPM_STORE_PATH" || true
  fi
fi

# Activate pnpm without writing to /usr/local/bin
corepack prepare pnpm@10.15.1 --activate

# Ensure pnpm store is user-local
pnpm config set store-dir "$PNPM_STORE_PATH"

echo "Installing dependencies..."
pnpm install --prefer-offline

echo "Starting Playwright sidecar..."
docker compose -f .devcontainer/docker-compose.yml up -d playwright

if [ -d "apps/nextjs" ]; then
  echo "Preparing Next.js runtime directories..."
  (
    cd apps/nextjs
    mkdir -p .next .turbo
    chmod -R ug+rwX,o-rwx .next .turbo || true
  )
fi

echo "Post-create setup complete"
