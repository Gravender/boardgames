---
name: router-service-migration-pr2-player-write
overview: Migrate player write operations to service/repository router model, including original/shared mutation paths, side effects, and share-related read support.
todos:
  - id: lock-pr2-mutation-contracts
    content: Define and approve discriminated contracts for update and delete flows and finalize getPlayerToShare contract scope.
    status: completed
  - id: implement-player-write-repository
    content: Add repository operations for create/update/delete/unlink flows with transaction-safe branching for original and shared paths.
    status: completed
  - id: implement-player-write-service
    content: Implement service orchestration for validation, permissions, image lifecycle side effects, and mutation return shaping.
    status: completed
  - id: wire-new-player-router-writes
    content: Expose create, update, deletePlayer, and getPlayerToShare in player/player.router.ts and maintain temporary legacy wrappers.
    status: completed
  - id: migrate-write-callers
    content: Update mutation hooks and invalidation helpers to target migrated player procedures and preserve optimistic behavior.
    status: completed
  - id: add-pr2-tests
    content: Add API tests for original/shared mutation branches, permission failures, and image delete side effects.
    status: completed
  - id: run-pr2-validation
    content: Run package checks and smoke test create/edit/delete/share-player UI flows.
    status: completed
isProject: false
---

# PR2 - Player Write Migration Plan

## Goal

Move player mutation logic and share-adjacent player read support to the service/repository architecture with strict original/shared behavior parity.

## In Scope

- `create`
- `update`
- `deletePlayer`

## Contract Plan

- `update`
  - Input is discriminated (`original` update variants and `shared` rename path).
- `deletePlayer`
  - Input is discriminated by `type: "original" | "shared"` and `id`.

## Implementation Steps

1. Finalize Zod mutation schemas in player router input/output files.
2. Extend player repository with write-path utilities for:

- soft delete and unlink operations
- shared-item detachment behavior
- image ownership and lookup support

1. Implement service-level permission checks and transaction orchestration in `player.service.ts`.
2. Preserve post-commit side effects (analytics and file deletion) in service layer.
3. Wire router procedures in `player/player.router.ts`.
4. Keep old `players.ts` mutation procedures as wrappers during transition.
5. Update Next.js mutation hooks and query invalidation paths.

## Behavior Rules

- Original delete soft-deletes owned player and unlinks dependent shared references.
- Shared delete removes recipient-side shared relation (does not delete owner source entity).
- Shared update requires explicit edit permission.

## Validation

- API tests for happy-path and permission-denied branches.
- Regression checks around image update/clear and orphaned file cleanup.
- UI smoke for player create/update/delete/share.

## Exit Criteria

- Player write logic is fully service/repository backed.
- Mutation behavior matches legacy semantics for both original and shared items.
- Legacy write code paths are wrappers only (no duplicated business logic).
