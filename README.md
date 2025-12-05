# Board Game Tracker

A web and mobile project for logging board games, players, matches, scoresheets, and sharing data across friends. The stack pairs Next.js and Expo clients with a tRPC API backed by Drizzle ORM and PostgreSQL.

## Project goals

- Track games and matches with flexible scoring (rounds, placements, manual or cooperative scoring).
- Provide meaningful insights: win rates, streaks, placement charts, and match timelines.
- Make sharing first-class with link-based access, friend requests, and permissioned edits.
- Keep players, teams, locations, and groups reusable across matches and shared contexts.

## Monorepo layout

- `apps/nextjs` — React 19 / Next.js 16 web app.
- `apps/expo` — React Native client using Expo Router.
- `packages/api` — tRPC procedures, match services, and auth integration.
- `packages/db` — Drizzle schema, migrations, seeds, and database helpers.
- `packages/ui` — Shared UI components (Tailwind + Radix).
- `packages/shared` — Cross-platform utilities and score logic.
- `packages/auth` — Auth configuration consumed by the apps.

## Current status notes

- Expo app is behind the web app and may not reflect the latest features or APIs. Expect setup drift until it is refreshed.
- Playwright e2e tests are outdated; they may fail or reference removed flows and need updates before relying on them.

## Prerequisites

- Node.js >= 22.21.0 and pnpm >= 10.15.1.
- Docker (for the local PostgreSQL container).
- Optional: Expo tooling for mobile (`npm i -g expo` plus Android/iOS tooling if you plan to run the app).

## Setup

1. Install dependencies  
   `pnpm install`

2. Create environment file  
   `cp .env.example .env` then fill in required secrets (UploadThing token, Sentry token). The `POSTGRES_URL` value is used by the database scripts.

3. Start the local database (Docker)  
   `./start-database.sh`  
   This script creates/starts a `games-postgres` container using the credentials from `POSTGRES_URL`.

4. Apply schema and seed data

- `pnpm db:push` to sync the Drizzle schema.
- `pnpm db:seed` to populate sample data (optional but recommended for local exploration).

5. Run the web app

- `pnpm dev` to start Turbo in watch mode.
- Or scope to the web app: `pnpm turbo run dev --filter=@board-games/nextjs`.

6. Run the Expo client (optional)  
   `pnpm turbo run dev --filter=@board-games/expo` then open the Expo bundler for your platform.

## Useful scripts

- `pnpm db:studio` — Open Drizzle Studio against the local database.
- `pnpm lint` / `pnpm typecheck` — Static checks.
- `pnpm e2e` — Playwright tests for the web client.
- `./stop-database.sh` — Stop the local PostgreSQL container.

## What to expect in development

- Turbo coordinates workspaces; most scripts respect the shared `.env`.
- Sharing features rely on Better-Auth; ensure test keys are present or requests will fail.
- Stats and charts depend on seeded data; run `pnpm db:seed` if pages look empty.
