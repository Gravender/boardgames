#!/usr/bin/env bash
set -euo pipefail

cd /workspace

echo "Setting up pnpm..."

# Shared cache paths are mounted as named Docker volumes in docker-compose.
PNPM_STORE_PATH="${PNPM_STORE_PATH:-$HOME/.pnpm-store}"
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
mkdir -p "$PNPM_STORE_PATH" "$PLAYWRIGHT_BROWSERS_PATH"

# Activate pnpm without writing to /usr/local/bin
corepack prepare pnpm@10.15.1 --activate

# Ensure pnpm store is user-local
pnpm config set store-dir "$PNPM_STORE_PATH"

echo "Installing dependencies..."
pnpm install

if [ -d "tooling/playwright-web" ]; then
  echo "Installing Playwright browsers..."
  PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" \
    pnpm --dir tooling/playwright-web exec playwright install --with-deps
fi

if [ -d "apps/nextjs" ]; then
  echo "Preparing Next.js runtime directories..."
  (
    cd apps/nextjs
    mkdir -p .next .turbo
    chmod -R 777 .next .turbo || true
  )
fi

echo "Post-create setup complete"
