# API router conventions (post–PR5 migration)

This document records the canonical tRPC router namespaces and discriminated-union rules for domains that use the service/repository router model.

## Canonical top-level routers

| Domain    | `AppRouter` key | Notes                                                       |
| --------- | --------------- | ----------------------------------------------------------- |
| Players   | `player`        | Single namespace; stats live under `player.stats`.          |
| Groups    | `group`         |                                                             |
| Locations | `location`      | Shared procedures under `location.shared` where applicable. |

Do not register duplicate namespaces (e.g. transitional `newPlayer` aliases). Client code should use `trpc.player`, `trpc.group`, and `trpc.location`.

## Original vs shared items

For entities that exist both as owner data and as shared copies:

- Outputs use a **discriminated union** on `type`: `"original" | "shared"` (or domain-specific literals where documented).
- Original rows expose primary ids (`id`, etc.); shared rows expose `sharedId` / `sharedPlayerId` (or domain-specific ids) plus `permission` where sharing applies.
- Procedures that accept either branch should use matching **discriminated inputs** (see Zod schemas in `packages/api/src/routers/<domain>/`).

## Cache invalidation helpers

- `invalidatePlayerStatsQueries` — invalidates the `player.stats` subtree (insights, header, summaries).
- `useInvalidatePlayers` — invalidates list/game-scoped player queries (`getPlayers`, `getPlayersByGame`).

## Tests

Contract tests in `packages/api` assert that Zod output schemas still accept representative original/shared payloads (`*.output.contracts.test.ts`). When changing a discriminated contract, update those fixtures and any Playwright flows that depend on labels or routes.

## Local development and CI

- **Type packages**: `@board-games/api` exposes `types` from `packages/api/dist/`. After changing `root.ts` or router types, run `bun run build` in `packages/api` so `dist/` matches (the folder is gitignored; CI should build before typechecking dependents).
- **E2E**: Playwright needs browsers (`bunx playwright install` in `packages/playwright-web`). Run `bun run e2e` from the repo root after install; use `src/player/player.spec.ts` for player flows.
