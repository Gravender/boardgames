---
name: router-service-migration-pr3-group
overview: Migrate group domain from legacy router DB logic to service/repository router model and add complete original/shared player support for group membership.
todos:
  - id: lock-pr3-group-contracts
    content: Define discriminated group player references for create/updatePlayers inputs and group outputs.
    status: pending
  - id: design-group-shared-storage-strategy
    content: Finalize storage/query strategy for mixed original/shared membership while preserving existing group semantics.
    status: pending
  - id: implement-group-repository
    content: Implement repository methods for get/create/update/updatePlayers/delete with mixed membership support and match count calculations.
    status: pending
  - id: implement-group-service
    content: Implement service mapping, validation, and sorting behavior for group list/detail outputs with discriminated player entries.
    status: pending
  - id: unify-group-routers
    content: Merge legacy group router and newGroup router behavior into one canonical group router path with temporary compatibility aliases if needed.
    status: pending
  - id: migrate-group-callers
    content: Update dashboard groups and match selector callers to canonical migrated procedures.
    status: pending
  - id: add-pr3-tests
    content: Add API tests for mixed original/shared membership create/update/remove plus authorization and edge cases.
    status: pending
  - id: run-pr3-validation
    content: Run package checks and smoke test groups list/add/edit/delete and match selector group usage.
    status: pending
isProject: false
---

# PR3 - Group Migration Plan

## Goal

Fully migrate group endpoints to service/repository model and ensure groups can correctly operate across original and shared players.

## In Scope

- `getGroups`
- `create`
- `update`
- `updatePlayers`
- `deleteGroup`
- Existing `getGroupsWithPlayers` merged into canonical group router behavior.

## Contract Plan

- Group member references in input:
  - `{ type: "original", id: number }`
  - `{ type: "shared", sharedId: number }`
- Group output player entries must be discriminated with the same `type` field.
- Group-level payloads remain stable (`id`, `name`, `matches`, `players`).

## Implementation Steps

1. Update group schemas in `packages/api/src/routers/group/*` to support discriminated player references.
2. Implement repository methods for mixed membership resolution and match-overlap calculations.
3. Implement service mapping and sorting in `group/service/group.service.ts`.
4. Consolidate behavior from legacy `routers/group.ts` and new `routers/group/group.router.ts`.
5. Maintain short-lived compatibility alias in `root.ts` only if frontend rollout cannot be atomic.
6. Update all group callers in web app and hooks.

## Design Constraints

- Preserve existing ordering and match-count semantics where possible.
- Avoid duplicate player identities when linked shared players reference originals.
- Enforce ownership/permission boundaries for shared entities.

## Validation

- API tests for:
  - all-original membership
  - all-shared membership
  - mixed membership
  - add/remove/update idempotency
- UI smoke tests for groups dashboard and match player selector.

## Exit Criteria

- Group domain no longer depends on legacy router DB logic.
- Canonical group router supports original/shared members consistently.
- `newGroup` and legacy `group` split is resolved or reduced to compatibility stubs.
