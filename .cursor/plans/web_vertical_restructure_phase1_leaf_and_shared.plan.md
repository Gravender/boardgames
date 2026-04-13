---
name: Web vertical restructure — Phase 1 (leaf + shared)
overview: Per Next.js project structure (https://nextjs.org/docs/app/getting-started/project-structure), consolidate shared code in src/components and src/hooks; colocate leaf-domain UI in private folders app/.../_components. No src/features/. Include destructive-dialog consolidation onto ConfirmDeleteDialog.
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 1: Shared foundations + leaf route colocation

**Next.js**: Align with [**Project structure and organization**](https://nextjs.org/docs/app/getting-started/project-structure) — **colocation**, [**private folders**](https://nextjs.org/docs/app/getting-started/project-structure#private-folders) (`_components`, optional `_lib`), and the strategy [**store project files outside of `app`**](https://nextjs.org/docs/app/getting-started/project-structure#store-project-files-outside-of-app) for `src/components` + `src/hooks`, plus [**split by feature or route**](https://nextjs.org/docs/app/getting-started/project-structure#split-project-files-by-feature-or-route) for segment-local UI.

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

This phase does **not** create `src/features/`. **Shared** code stays in **`src/components`** and **`src/hooks`**. **Leaf** product areas move toward **`src/app/.../_components`** under each route segment (or current `app/dashboard/...` until Phase 4), matching the docs pattern `app/blog/_components/Post.tsx`.

## Scope

| Area                  | Shared / colocated target                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared UI**         | Remain or consolidate under **`src/components`** (`confirm-delete-dialog`, `feature-info-modal`, `formatted-date`, `spinner`, table helpers, etc.)                                                               |
| **Shared hooks**      | Remain under **`src/hooks`** (`use-debounce`, `use-filtered-roles`, analytics, form context, queries/mutations for leaf domains until tightened)                                                                 |
| **Group**             | Route-specific UI under the **groups** segment’s **`_components`** (private folder; not a routable segment)                                                                                                      |
| **Location**          | Same under **locations** routes                                                                                                                                                                                  |
| **Friend**            | Same under **friends** routes                                                                                                                                                                                    |
| **Account / auth UI** | Shared pieces in **`src/components`** (e.g. better-auth-related components); entry routes may use local **`_components`**                                                                                        |
| **Forms**             | Shared field helpers in **`src/components/form`**; `hooks/form.tsx` in **`src/hooks`**                                                                                                                           |
| **Shell**             | App chrome (`app-sidebar`, `nav-*`, `breadcrumbs`, theme, global marketing/auth forms) in **`src/components`** unless scoped to a single **`layout.tsx`** — then colocate under that segment’s **`_components`** |

**Defer to Phase 2**: heavy **`game` / `match` / `player`** trees.

## Conventions

- **`src/components/**`** — `~/components/...` when shared across routes.
- **`src/hooks/**`** — `~/hooks/...` for shared data logic.
- **`src/app/.../<segment>/\_components/**`** — route-local UI; import with **relative** paths from `page.tsx`/`layout.tsx` (see [private folders](https://nextjs.org/docs/app/getting-started/project-structure#private-folders)).
- Optional **`_lib`** beside `_components` for non-UI helpers tied to that segment.

Imports use existing aliases: `"~/*": ["./src/*"]` ([`apps/web/tsconfig.json`](../../apps/web/tsconfig.json)).

## Destructive dialog consolidation (required in Phase 1)

- Keep [`confirm-delete-dialog`](../../apps/web/src/components/confirm-delete-dialog.tsx) in **`src/components/`**. Co-locate its test beside the component or under `src/test` per project convention.
- Grep for raw `AlertDialog` used for delete/destructive confirmation; refactor to `ConfirmDeleteDialog` where the UX matches.

## Verification

```bash
cd /home/gravender/personal/games
turbo run check --filter=web
bun run test:web
```

## Merge criteria

- `turbo run check --filter=web` passes
- `bun run test:web` passes
- No new **`src/features`** directory
- Destructive flows prefer **`ConfirmDeleteDialog`** over duplicated `AlertDialog` trees where applicable

## Dependency

Stabilizing **shared** components and **shell** in **`src/components`** reduces churn before Phase 2 moves **game / match / player** UI into **`games/.../_components`**.
