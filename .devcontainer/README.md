# Dev Container Setup

This repo includes a preconfigured dev container with:

- Node.js `22` on `bookworm`
- Docker-in-Docker support
- A sidecar PostgreSQL service (`postgres:16`)
- A sidecar Playwright runner service (`mcr.microsoft.com/playwright:v1.53.1-noble`)
- Firewall restrictions via `ghcr.io/w3cj/devcontainer-features/firewall:latest`
- Persistent cache for pnpm store

## First run

1. In VS Code/Cursor, run **Dev Containers: Reopen in Container**.
2. Wait for `post-create.sh` to complete (`pnpm install` + Playwright sidecar startup).
3. The container startup script will create `.env` from `.env.example` if missing and automatically run a schema push.

## What is configured

- App workspace path: `/workspace`
- App service name: `app`
- Database service name: `postgres`
- Playwright service name: `playwright`
- Persistent devcontainer volumes:
  - `pnpm-store-cache` mounted at `/home/node/.pnpm-store`
- Default DB URL inside container:
  - `postgresql://postgres:password@postgres:5432/games`
- Forwarded ports:
  - `3000` (Next.js)
  - `5432` (Postgres)
  - `8081` (pgweb)
  - `4983` (Drizzle Studio)
  - `9323` (Playwright HTML report)

## Daily commands

Run from repo root in the dev container:

- Seed data: `pnpm db:seed`
- Start app: `pnpm dev`
- Run e2e suite: `pnpm e2e`

## Spotlight: Next.js startup

Use this sequence when you open a fresh container:

1. (Optional) Seed local data: `pnpm db:seed`
2. Start the app: `pnpm dev`
3. Open `http://localhost:3000`

If you only want the web app process, use:

- `pnpm dev:next`

## Spotlight: port forwarding

- `3000` is forwarded for the Next.js app.
- `5432` is forwarded for direct PostgreSQL access from your host tools.
- `8081` is forwarded for pgweb.
- `4983` is forwarded for Drizzle Studio.
- Open pgweb at `http://localhost:8081` from your host machine.
- Run `pnpm db:studio` and open `http://localhost:4983` from your host machine.

## E2E testing notes

- `pnpm e2e` runs inside the `playwright` compose service via `docker compose exec`.
- Playwright tests target `http://localhost:3000` inside the sidecar (overridden by `PLAYWRIGHT_BASE_URL`).
- Playwright `webServer` config auto-starts Next.js for E2E when no server is already listening on `3000`.
- The sidecar exposes `9323` so failed test HTML reports can be opened from the host.
- Outside the sidecar, tests still default to `http://localhost:3000`.
- Some tests may still require valid env values (for example auth-related test credentials):
  - `E2E_TEST_USERNAME`
  - `E2E_TEST_PASSWORD`
  - `E2E_TEST_EMAIL` (optional)

## Spotlight: running e2e tests

Recommended flow:

1. Run `pnpm e2e` (runs in the Playwright sidecar)
2. Playwright reuses an existing server on `3000` or starts Next.js automatically via `webServer`

Helpful checks before running:

- DB is reachable and migrated (`pnpm db:push`)
- Test auth env vars are set in `.env`

## Firewall notes

- The firewall is default-deny with an explicit allowlist from `devcontainer.json`.
- Current profile is dev-friendly (GitHub, npm, package repos, VS Code marketplace, Docker registry, plus explicit hosts for Playwright and UploadThing).
- If you hit blocked network requests, extend the `hosts` setting in `.devcontainer/devcontainer.json` and rebuild the container.
