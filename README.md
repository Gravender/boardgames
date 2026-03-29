# Board Game Tracker

A web and mobile project for logging board games, players, matches, scoresheets, and sharing data across friends. The stack pairs Next.js and Expo clients with a tRPC API backed by Drizzle ORM and PostgreSQL.

## Project goals

- Track games and matches with flexible scoring (rounds, placements, manual or cooperative scoring).
- Provide meaningful insights: win rates, streaks, placement charts, and match timelines.
- Make sharing first-class with link-based access, friend requests, and permissioned edits.
- Keep players, teams, locations, and groups reusable across matches and shared contexts.

## Monorepo layout

- `apps/web` — React 19 / Next.js 16 web app (package name `web`).
- `apps/native` — React Native client using Expo Router (package name `native`).
- `packages/api` — tRPC procedures, match services, and auth integration.
- `packages/db` — Drizzle schema, migrations, seeds, and database helpers.
- `packages/ui` — Shared UI components (Tailwind + Radix).
- `packages/shared` — Cross-platform utilities and score logic.
- `packages/auth` — Auth configuration consumed by the apps.
- `packages/env` — Shared environment validation for the web app (`@board-games/env/web`).
- `packages/config` — Shared TypeScript config (`@board-games/config`).
- `.agents/skills/` — Optional stack-specific guidance for agents (Next, Expo, Turborepo, etc.).

## Current status notes

- Expo app is behind the web app and may not reflect the latest features or APIs. Expect setup drift until it is refreshed.
- Playwright e2e tests are outdated; they may fail or reference removed flows and need updates before relying on them.

## Prerequisites

- Node.js >= 22.21.0 and [Bun](https://bun.sh) 1.2.x (see root `package.json` `packageManager`).
- Docker (for the local PostgreSQL container).
- Optional: Expo tooling for mobile (`npm i -g expo` plus Android/iOS tooling if you plan to run the app).

## Setup

1. Install dependencies  
   `bun install`

2. Create environment file  
   `cp .env.example .env` then fill in required secrets (UploadThing token, Sentry token). The `POSTGRES_URL` value is used by the database scripts.

3. Start the local database (Docker)  
   `./start-database.sh`  
   This script creates/starts a `games-postgres` container using the credentials from `POSTGRES_URL`.

4. Apply schema and seed data

- `bun run db:push` to sync the Drizzle schema.
- `bun run db:seed` to populate sample data (optional but recommended for local exploration).

5. Run the web app

- `bun run dev` to start Turbo in watch mode.
- Or scope to the web app: `bun run dev:web` or `bunx turbo watch dev -F web...`.

6. Run the Expo client (optional)  
   `bunx turbo watch dev -F native` then open the Expo bundler for your platform.

## Useful scripts

- `bun run db:studio` — Open Drizzle Studio against the local database.
- `bun run lint` / `bun run lint:fix` — Run oxlint checks or autofix.
- `bun run format` / `bun run format:fix` — Run oxfmt checks or apply formatting.
- `bun run typecheck` — Run TypeScript checks.
- `bun run check` — Run `oxlint` and `oxfmt --write` on the whole tree (like CI-style quick pass).
- `bun run e2e` — Playwright tests for the web client.
- `./stop-database.sh` — Stop the local PostgreSQL container.

## Linting and formatting

- `oxlint` and `oxfmt` are the default linting and formatting tools across the monorepo.
- Husky runs `lint-staged` on pre-commit (`oxlint` + `oxfmt --write` on staged files).
- CI runs `bun run lint` and `bun run format` as required checks.

## E2E Testing

Playwright e2e tests require the following environment variables:

- `E2E_TEST_USERNAME` — Username for the test user (will be created if it doesn't exist)
- `E2E_TEST_PASSWORD` — Password for the test user
- `E2E_TEST_EMAIL` — Email for the test user (optional, defaults to `{username}@test.local`)

The test setup will automatically:

1. Create the test user if it doesn't exist
2. Sign in using Better Auth
3. Extract and save the userId from the authentication response
4. Save the authenticated session state for use across tests

The userId is automatically retrieved from Better Auth and made available to tests, so you don't need to set it manually.

## What to expect in development

- Turbo coordinates workspaces; most scripts respect the shared `.env`.
- Sharing features rely on Better-Auth; ensure test keys are present or requests will fail.
- Stats and charts depend on seeded data; run `bun run db:seed` if pages look empty.
