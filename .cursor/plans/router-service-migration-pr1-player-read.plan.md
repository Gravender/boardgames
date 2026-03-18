---
name: router-service-migration-pr1-player-read
overview: Migrate player read endpoints from legacy router DB queries to the service/repository router model with full original/shared parity and no behavior regressions.
todos:
  - id: lock-pr1-contracts
    content: Define and approve discriminated Zod input/output contracts for getPlayers, getPlayersByGame, and getPlayer.
    status: completed
  - id: implement-player-repository-queries
    content: Add repository methods for player read models covering original players, shared players, linked entities, stats, and filtering branches.
    status: completed
  - id: implement-player-read-service
    content: Implement service mapping/aggregation logic for combined original/shared outputs, including sorting and compatibility fields used by UI.
    status: completed
  - id: wire-new-player-router-reads
    content: Expose getPlayers, getPlayersByGame, and getPlayer in player/player.router.ts and keep old router procedures as temporary wrappers.
    status: completed
  - id: migrate-read-callers
    content: Update web query hooks/pages to consume new player read procedures and preserve cache invalidation behavior.
    status: completed
  - id: add-pr1-tests
    content: Add API tests for original/shared branches and key authorization cases for all migrated read procedures.
    status: completed
  - id: run-pr1-validation
    content: Run package checks and targeted UI smoke tests for players list/detail/game-filter flows.
    status: completed
isProject: false
---

# PR1 - Player Read Migration Plan

## Goal

Move player read paths to the service/repository router model while preserving all existing behavior and response shape guarantees used by the web app.

## In Scope

- `getPlayers`
- `getPlayersByGame`
- `getPlayer`
- Existing `getPlayersForMatch` and `getRecentMatchWithPlayers` remain in place and aligned to shared contract conventions.

## Contract Plan

- `getPlayers`
  - Output uses `type: "original" | "shared"` discriminator.
- `getPlayersByGame`
  - Input uses `type: "original" | "shared"` plus `id`.
  - Output uses `type: "original" | "shared"` discriminator.
- `getPlayer`
  - Input uses `type: "original" | "shared"` plus `id`.
  - Output includes discriminated root entity and discriminated nested references where applicable.

## Implementation Steps

1. Add/extend player read output schemas in `packages/api/src/routers/player/player.output.ts`.
2. Implement repository query methods in `packages/api/src/repositories/player/player.repository.ts` for:

- original entities
- shared entities
- linked shared/original relationships
- match/game aggregates required by detail pages

1. Implement mapping and aggregation in `packages/api/src/services/player/player.service.ts`.
2. Wire procedures in `packages/api/src/routers/player/player.router.ts`.
3. Keep legacy `packages/api/src/routers/players.ts` procedures as pass-through wrappers to reduce frontend migration risk during PR1.
4. Migrate read callers in Next.js app hooks/pages.

## Validation

- Add API tests for each procedure branch (`original`, `shared`).
- Verify players list, player detail, and players-by-game pages produce identical behavior.
- Run package checks for changed workspaces.

## Exit Criteria

- Player reads are served by service/repository path.
- No direct DB read logic for migrated procedures remains in legacy player router implementation.
- Frontend read flows remain stable without contract regressions.
