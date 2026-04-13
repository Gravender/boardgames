---
name: Web vertical restructure — Phase 1 (leaf + shared)
overview: Move leaf domain verticals and shared foundations into apps/web/src/features/* so forms + shared widgets exist before the game/match/player migration. Consolidate destructive delete flows onto ConfirmDeleteDialog.
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 1: Leaf verticals + forms + shell + shared + account

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

Vertical codebase restructure (TkDodo-style colocation). This phase implements the **first row** of the umbrella phased table: everything **except** `game`, `match`, and `player` core domains.

## Scope

| Area     | Target path                                                 | Source (typical)                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Group    | `features/group/components/**`, `features/group/hooks/**`   | `components/group/**`, `hooks/queries/group`, `hooks/mutations/group`                                                                                                                                                                                                                              |
| Location | `features/location/**`                                      | `components/location/**`, location hooks + invalidate                                                                                                                                                                                                                                              |
| Friend   | `features/friend/**`                                        | `components/friend/**`, `hooks/mutations/friend`                                                                                                                                                                                                                                                   |
| Account  | `features/account/**`                                       | `components/better-auth/**`, `hooks/queries/auth.tsx`                                                                                                                                                                                                                                              |
| Forms    | `features/forms/components/**`, `features/forms/hooks/**`   | `components/form/**`, `hooks/form.tsx`, `hooks/form-context.ts`                                                                                                                                                                                                                                    |
| Shell    | `features/shell/components/**`                              | `app-sidebar`, `nav-*`, `breadcrumbs`, `theme-*`, `login-form`, `signup-form`, `forgot-password-form`, `reset-password-form`, `tan-stack-devtools`, `speedInsights`, etc.                                                                                                                          |
| Shared   | `features/shared/components/**`, `features/shared/hooks/**` | `confirm-delete-dialog`, `feature-info-modal`, `formatted-date`, `spinner`, `debounced-checkbox`, `number-input`, `player-image`, `color-picker`, `sortable-header-table`, `sort-icon`, `game-image`, `input-field-skeleton`, `PostHogPageView`, `analytics`, `use-debounce`, `use-filtered-roles` |

**Do not move in Phase 1**: `components/game`, `components/match`, `components/player` (Phase 2).

## Internal shape per vertical

- `features/<name>/components/**` — UI for that vertical
- `features/<name>/hooks/queries`, `hooks/mutations`, `hooks/invalidate` as needed

Imports use existing aliases: `~/features/<name>/...` ([`apps/web/tsconfig.json`](../../apps/web/tsconfig.json)).

## Destructive dialog consolidation (required in Phase 1)

- Move [`confirm-delete-dialog`](../../apps/web/src/components/confirm-delete-dialog.tsx) into `features/shared/components/` with its test.
- Grep for raw `AlertDialog` used for delete/destructive confirmation in dropdowns and similar; refactor to `ConfirmDeleteDialog` where the UX matches (title, description, cancel, destructive action).

## Verification

```bash
cd /home/gravender/personal/games
turbo run check --filter=web
bun run test:web
```

## Merge criteria

- `turbo run check --filter=web` passes
- `bun run test:web` passes
- No remaining imports to old `~/hooks/form` from files that should point at `~/features/forms/hooks/form` after Phase 1 completes for forms (consumers under `game`/`match`/`player` will be updated in Phase 2 alongside those folders)

## Dependency

Completing **forms** and **shared** in this phase reduces import churn when moving **game**, **match**, and **player** in Phase 2.
