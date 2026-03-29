---
name: router-service-migration-pr4-location
overview: Complete location migration to service/repository router model by moving remaining legacy procedures and unifying discriminated original/shared behavior.
todos:
  - id: lock-pr4-location-contracts
    content: Finalize discriminated input/output contracts for getLocation and verify mutation contracts for update/default/delete paths.
    status: completed
  - id: implement-location-repository-queries
    content: Add repository coverage for location detail retrieval, create/update/delete, default toggling, and shared-link behavior.
    status: completed
  - id: implement-location-service-flows
    content: Implement service orchestration for permission checks, default consistency, shared/original mapping, and mutation branching.
    status: completed
  - id: wire-location-router-procedures
    content: Migrate getLocation, create, update, editDefaultLocation, and deleteLocation to service/repository-backed location router procedures.
    status: completed
  - id: align-location-shared-subrouter
    content: Ensure shared location sub-router contracts and mapping are consistent with primary location discriminated contracts.
    status: completed
  - id: migrate-location-callers
    content: Update dashboard location pages/hooks/mutations to the finalized migrated contracts.
    status: completed
  - id: add-pr4-tests
    content: Add API tests for original/shared location detail and mutation branches including permission and default-location edge cases.
    status: completed
  - id: run-pr4-validation
    content: Run package checks and smoke test locations list/detail/add/edit/default/delete flows.
    status: completed
isProject: false
---

# PR4 - Location Migration Plan

## Goal

Finish location migration by moving all remaining legacy location procedures to service/repository architecture and preserving full shared/original behavior.

## In Scope

- `getLocation`
- `create`
- `update`
- `editDefaultLocation`
- `deleteLocation`
- Align with existing migrated paths:
  - `getLocations`
  - `location.shared.getSharedLocationsFromSharedMatch`

## Contract Plan

- `getLocation`
  - Input: `{ type: "original" | "shared"; id: number }`
  - Output: discriminated location plus discriminated nested references where applicable.
- `update`, `editDefaultLocation`, `deleteLocation`
  - Keep discriminated `type` input and normalize result handling.
- `create`
  - Original-create semantics stay explicit.

## Implementation Steps

1. Update location input/output schemas for full discriminated consistency.
2. Implement repository methods for location detail aggregation and shared link resolution.
3. Implement service methods in `routers/location/service/location.service.ts` for all migrated procedures.
4. Refactor `routers/location.ts` to delegate to service methods only.
5. Keep shared sub-router behavior aligned to same naming and identity conventions.
6. Update app hooks/pages for any input shape changes (especially `getLocation`).

## Behavior Rules

- Shared update/delete requires proper permission (`edit` where applicable).
- Default toggling must remain globally consistent across user-visible original and shared locations.
- Shared delete should not remove source owner location data.

## Validation

- API tests for both `original` and `shared` branches per procedure.
- Regression checks for default-location toggling and detail page aggregates.
- UI smoke tests for locations dashboard and related match edit flows.

## Exit Criteria

- All location router procedures are service/repository-backed.
- Original/shared location behavior remains parity-safe.
- No legacy location business logic remains inline in router handlers.
