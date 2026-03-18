---
name: router-service-migration-pr5-cutover-cleanup
overview: Complete router migration cutover by removing old/new dual namespaces, deleting compatibility wrappers, and enforcing canonical discriminated contracts with test coverage.
todos:
  - id: inventory-remaining-legacy-usage
    content: Confirm all frontend/API callers using legacy player/group/location namespaces and identify final compatibility dependencies.
    status: pending
  - id: finalize-canonical-router-namespaces
    content: Choose and enforce final canonical router paths for player, group, and location domains in root router exports.
    status: pending
  - id: remove-legacy-router-wrappers
    content: Delete legacy wrapper procedures/files and remove duplicate registrations from appRouter.
    status: pending
  - id: migrate-final-callers
    content: Update any remaining web hooks/components/tests to canonical procedure paths and remove transitional aliases.
    status: pending
  - id: add-contract-regression-tests
    content: Add tests to lock discriminated original/shared contracts and ensure no regressions in migrated endpoints.
    status: pending
  - id: run-e2e-parity-checks
    content: Run focused Playwright flows for players/groups/locations covering both shared and original item paths.
    status: pending
  - id: document-final-contract-conventions
    content: Add migration notes for discriminator policy, canonical procedure naming, and future endpoint design standards.
    status: pending
  - id: run-final-validation
    content: Run package checks for changed workspaces and ensure CI-ready state for merge.
    status: pending
isProject: false
---

# PR5 - Cutover and Cleanup Plan

## Goal

Finalize the migration by removing old router model artifacts and making the service/repository router model the only active path.

## In Scope

- Remove dual router namespace usage in `packages/api/src/root.ts`.
- Remove legacy wrappers in old router files for migrated player/group/location procedures.
- Keep one canonical path per domain.
- Lock discriminated original/shared contracts with tests and docs.

## Cleanup Targets

- `player` vs `newPlayer` duplication
- `group` vs `newGroup` duplication
- Transitional wrapper logic in legacy router files
- Obsolete input/output schema aliases used only for migration compatibility

## Implementation Steps

1. Remove duplicate router registrations and alias exports from root router.
2. Delete deprecated wrapper procedures/files after confirming no remaining callers.
3. Update all frontend hooks/components/tests to canonical procedure paths.
4. Remove dead types/contracts introduced only for transition support.
5. Add/expand contract regression tests for discriminated endpoints.
6. Run focused e2e checks for mixed original/shared flows.
7. Document final conventions for future endpoint work.

## Validation

- `turbo run check` for affected packages.
- API tests pass for all discriminated branches.
- Playwright smoke checks pass on players/groups/locations critical flows.

## Exit Criteria

- No remaining runtime usage of legacy router model for migrated domains.
- Single canonical router namespace per migrated domain.
- Contract and behavior parity preserved across original and shared items.
