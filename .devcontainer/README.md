# Dev Container Setup

This repo includes a preconfigured dev container with:

- Node.js `22` on `bookworm`
- Docker-in-Docker support
- A sidecar PostgreSQL service (`postgres:16`)
- Firewall restrictions via `ghcr.io/w3cj/devcontainer-features/firewall:latest`
- Playwright browser/dependency bootstrap for e2e tests
- Persistent caches for pnpm store and Playwright browsers

## First run

1. In VS Code/Cursor, run **Dev Containers: Reopen in Container**.
2. Wait for `post-create.sh` to complete (`pnpm install` + Playwright install).
3. The container startup script will create `.env` from `.env.example` if missing and automatically run a schema push.

## What is configured

- App workspace path: `/workspace`
- App service name: `app`
- Database service name: `postgres`
- Persistent devcontainer volumes:
  - `pnpm-store-cache` mounted at `/home/node/.pnpm-store`
  - `playwright-cache` mounted at `/home/node/.cache/ms-playwright`
- Default DB URL inside container:
  - `postgresql://postgres:password@postgres:5432/games`
- Forwarded ports:
  - `3000` (Next.js)
  - `5432` (Postgres)
  - `8081` (pgweb)
  - `4983` (Drizzle Studio)

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

- Playwright browsers are installed by `.devcontainer/post-create.sh`.
- Playwright tests target `http://localhost:3000` by default in local mode.
- Some tests may still require valid env values (for example auth-related test credentials):
  - `E2E_TEST_USERNAME`
  - `E2E_TEST_PASSWORD`
  - `E2E_TEST_EMAIL` (optional)

## Spotlight: running e2e tests

Recommended flow:

1. Terminal A: `pnpm dev` and wait for the app to be ready on `3000`
2. Terminal B: `pnpm e2e`

Helpful checks before running:

- DB is reachable and migrated (`pnpm db:push`)
- Test auth env vars are set in `.env`

## Firewall notes

- The firewall is default-deny with an explicit allowlist from `devcontainer.json`.
- Current profile is dev-friendly (GitHub, npm, package repos, VS Code marketplace, Docker registry, plus explicit hosts for Playwright and UploadThing).
- If you hit blocked network requests, extend the `hosts` setting in `.devcontainer/devcontainer.json` and rebuild the container.
