#!/usr/bin/env bash
set -euo pipefail

TARGET_USER="${REMOTE_USER:-node}"
TARGET_UID="$(id -u)"
TARGET_GID="$(id -g)"

if id "$TARGET_USER" >/dev/null 2>&1; then
  TARGET_UID="$(id -u "$TARGET_USER")"
  TARGET_GID="$(id -g "$TARGET_USER")"
fi

NEXT_RUNTIME_PATHS=(
  "/workspace/apps/nextjs/.next"
  "/workspace/apps/nextjs/.turbo"
  "/workspace/apps/nextjs/.cache"
)

ensure_workspace_permissions() {
  # In devcontainers with bind mounts, runtime cache paths can be owned by root.
  # Keep fixes narrow: adjust ownership/permissions only for Next.js runtime paths.
  local paths_to_check=(
    "/workspace/apps/nextjs"
    "${NEXT_RUNTIME_PATHS[@]}"
  )
  local needs_fix=false

  for path in "${paths_to_check[@]}"; do
    if [ -e "$path" ] && [ ! -w "$path" ]; then
      needs_fix=true
      break
    fi
  done

  if [ "$needs_fix" = false ] && [ "$(id -u)" -ne 0 ]; then
    return
  fi

  if [ "$(id -u)" -eq 0 ]; then
    echo "Fixing Next.js runtime path ownership for ${TARGET_USER}..."
    chown -R "${TARGET_UID}:${TARGET_GID}" /workspace/apps/nextjs "${NEXT_RUNTIME_PATHS[@]}" || true
    # Fallback for host filesystems that ignore chown on bind mounts.
    chmod -R ug+rwX,o-rwx "${NEXT_RUNTIME_PATHS[@]}" || true
    return
  fi

  if ! command -v sudo >/dev/null 2>&1; then
    echo "Workspace paths are not writable and sudo is unavailable"
    exit 1
  fi

  echo "Fixing Next.js runtime path ownership for ${TARGET_USER}..."
  sudo chown -R "${TARGET_UID}:${TARGET_GID}" /workspace/apps/nextjs "${NEXT_RUNTIME_PATHS[@]}" || true
  # Fallback for host filesystems that ignore chown on bind mounts.
  sudo chmod -R ug+rwX,o-rwx "${NEXT_RUNTIME_PATHS[@]}" || true
}

ensure_next_runtime_permissions() {
  mkdir -p /workspace/apps/nextjs/.next/dev "${NEXT_RUNTIME_PATHS[@]}"

  if [ "$(id -u)" -eq 0 ]; then
    chmod 1777 /tmp || true
    chown -R "${TARGET_UID}:${TARGET_GID}" "${NEXT_RUNTIME_PATHS[@]}" || true
    chmod -R ug+rwX,o-rwx "${NEXT_RUNTIME_PATHS[@]}" || true
    rm -f /workspace/apps/nextjs/.next/dev/lock || true
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo chmod 1777 /tmp || true
    sudo chown -R "${TARGET_UID}:${TARGET_GID}" "${NEXT_RUNTIME_PATHS[@]}" || true
    sudo chmod -R ug+rwX,o-rwx "${NEXT_RUNTIME_PATHS[@]}" || true
    sudo rm -f /workspace/apps/nextjs/.next/dev/lock || true
  else
    chmod -R ug+rwX,o-rwx "${NEXT_RUNTIME_PATHS[@]}" || true
    rm -f /workspace/apps/nextjs/.next/dev/lock || true
  fi
}

ensure_workspace_permissions
ensure_next_runtime_permissions

cd /workspace

echo "Checking .env setup..."

DESIRED_POSTGRES_URL='postgresql://postgres:password@localhost:5432/games'

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

if [ -f ".env" ]; then
  DESIRED_URL="POSTGRES_URL=\"${DESIRED_POSTGRES_URL}\""

  if ! grep -q "^POSTGRES_URL=" .env; then
    printf "\n%s\n" "$DESIRED_URL" >> .env
    echo "Added default POSTGRES_URL"
  else
    echo "Keeping existing POSTGRES_URL from .env"
  fi
fi

DB_HOST="localhost"
DB_PORT="5432"
if [[ "$DESIRED_POSTGRES_URL" =~ @([^:/]+):([0-9]+) ]]; then
  DB_HOST="${BASH_REMATCH[1]}"
  DB_PORT="${BASH_REMATCH[2]}"
fi

DB_TARGET_LABEL="${DB_HOST}:${DB_PORT}"
echo "Using database target ${DB_TARGET_LABEL}"

is_host_port_reachable() {
  local host="$1"
  local port="$2"
  timeout 1 bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" >/dev/null 2>&1
}

is_db_reachable() {
  is_host_port_reachable "$DB_HOST" "$DB_PORT"
}

if is_db_reachable; then
  echo "Postgres is already reachable at ${DB_TARGET_LABEL}"
else
  echo "Postgres is not reachable yet; starting docker compose services (postgres, pgweb, playwright)..."
  COMPOSE_FILE=".devcontainer/docker-compose.yml"
  COMPOSE_MAX_RETRIES=5
  COMPOSE_RETRY_DELAY_SECONDS=2
  COMPOSE_SUCCEEDED=false

  for ATTEMPT in $(seq 1 "$COMPOSE_MAX_RETRIES"); do
    if docker compose -f "$COMPOSE_FILE" up -d postgres pgweb playwright; then
      COMPOSE_SUCCEEDED=true
      echo "Docker compose services are up"
      break
    fi

    if [ "$ATTEMPT" -eq "$COMPOSE_MAX_RETRIES" ]; then
      break
    fi

    echo "compose attempt ${ATTEMPT}/${COMPOSE_MAX_RETRIES} failed; retrying in ${COMPOSE_RETRY_DELAY_SECONDS}s..."
    sleep "$COMPOSE_RETRY_DELAY_SECONDS"
  done

  if [ "$COMPOSE_SUCCEEDED" = false ]; then
    echo "docker compose up failed after ${COMPOSE_MAX_RETRIES} attempts"
    echo "Will continue only if Postgres is already reachable from this container at ${DB_TARGET_LABEL}."
  fi
fi

echo "Ensuring Playwright sidecar is running..."
docker compose -f .devcontainer/docker-compose.yml up -d playwright

DB_READY_MAX_RETRIES=5
DB_READY_DELAY_SECONDS=1

for ATTEMPT in $(seq 1 "$DB_READY_MAX_RETRIES"); do
  if is_db_reachable; then
    echo "Postgres connection check passed"
    break
  fi

  if [ "$ATTEMPT" -eq "$DB_READY_MAX_RETRIES" ]; then
    echo "Postgres is not reachable at ${DB_TARGET_LABEL} after ${DB_READY_MAX_RETRIES} attempts"
    exit 1
  fi

  echo "waiting for Postgres (${ATTEMPT}/${DB_READY_MAX_RETRIES})..."
  sleep "$DB_READY_DELAY_SECONDS"
done

echo "Ensuring PostgreSQL schema is up to date..."
MAX_RETRIES=5
RETRY_DELAY_SECONDS=1

for ATTEMPT in $(seq 1 "$MAX_RETRIES"); do
  if pnpm --dir packages/db with-env drizzle-kit push --config=drizzle.config.ts; then
    echo "Database schema push completed"
    break
  fi

  if [ "$ATTEMPT" -eq "$MAX_RETRIES" ]; then
    echo "Database schema push failed after ${MAX_RETRIES} attempts"
    exit 1
  fi

  echo "db:push attempt ${ATTEMPT}/${MAX_RETRIES} failed; retrying in ${RETRY_DELAY_SECONDS}s..."
  sleep "$RETRY_DELAY_SECONDS"
done

echo "Applying canonical views migration..."
if pnpm db:createviews; then
  echo "Views migration applied successfully"
else
  echo "Failed to apply views migration via pnpm db:createviews"
  exit 1
fi

echo ""
echo "Devcontainer ready"
echo ""
echo "Recommended commands:"
echo "pnpm db:seed"
echo "pnpm dev"
echo "pnpm e2e"