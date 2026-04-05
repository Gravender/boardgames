---
name: web-app-src-conventions
description: >-
  Where to put React components, hooks, and related code in apps/web (src layout,
  route-local _components, hooks/queries vs mutations, tRPC patterns). Use when
  adding or moving UI in the web app, deciding between src/components vs
  packages/ui, or organizing TanStack Query hooks.
---

# Web app (`apps/web`) — `src/` conventions

Root: `apps/web/src/`. Path aliases: `~/` and `@/` both resolve to `./src/` (see `apps/web/tsconfig.json`). Prefer `~/` for app imports (e.g. `~/trpc/react`, `~/components/...`).

## Shared vs app-only UI

| Location                   | Use for                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `packages/ui/src/`         | Reusable primitives, toast, design-system pieces imported as `@board-games/ui/...`    |
| `apps/web/src/components/` | Product/domain UI used across multiple routes (games, matches, players, forms, shell) |

Do not duplicate generic buttons/cards in `apps/web` if they belong in `@board-games/ui`.

## `src/components/`

- Group by **domain** folders: `game/`, `match/`, `player/`, `form/`, plus cross-cutting files at the root (`app-sidebar.tsx`, `breadcrumbs.tsx`, etc.).
- **Components**: PascalCase filenames for React files (project also uses kebab-case in places; match siblings in the same folder).
- **Client components** must start with `"use client"` when they use hooks, event handlers, or browser APIs.
- Prefer **TanStack Form** field helpers under `components/form/` (`select-field.tsx`, `date-field.tsx`, …) for shared form controls.

## `src/app/` (Next.js App Router)

- **Server Components by default** — no `"use client"` on `page.tsx` / `layout.tsx` unless required.
- Data: `prefetch` / `trpc` from `~/trpc/server` in Server Components; pass serializable props or wrap client subtrees in `Suspense` as needed.

## `src/hooks/`

All hooks that call **tRPC** or **React Query** should live here — not inside `components/` — so data logic stays reusable and testable.

### Layout

- **`hooks/queries/<domain>/`** — `useQuery` / `useSuspenseQuery` wrappers around `useTRPC()` + `trpc.<router>.<proc>.queryOptions()`. Name exports clearly: `useGroupsQuery`, `useGroupsSuspenseQuery`, `useGroupsWithPlayers`.
- **`hooks/mutations/<domain>/`** — `useMutation` via `trpc.<router>.<proc>.mutationOptions({ onSuccess: ... })`. Invalidate related queries, show `toast` from `@board-games/ui/toast` on success/error when it improves UX.
- **`hooks/invalidate/`** — small helpers that encapsulate `queryClient.invalidateQueries` for domains that need manual invalidation.
- **Feature folders** (e.g. `hooks/game-stats/`) — hooks tied to a feature that are not a single CRUD domain.
- **Root hooks** — generic utilities: `use-debounce.ts`, `use-filtered-roles.tsx`, `form.tsx` (shared form helpers if present).

### Rules

- Every file that uses hooks + tRPC client must be a **client** module: start with `"use client"`.
- Import tRPC client as: `import { useTRPC } from "~/trpc/react";`
- Keep hooks **thin**: wire TRPC options, invalidation, and toasts; avoid embedding large JSX.

## Other top-level `src/` folders (reference)

| Path         | Role                                                        |
| ------------ | ----------------------------------------------------------- |
| `trpc/`      | `react.tsx` (client), `server.tsx` (RSC), `query-client.ts` |
| `providers/` | App-level React providers                                   |
| `stores/`    | Client state (e.g. Zustand)                                 |
| `utils/`     | Non-React helpers (analytics, upload, links)                |

## Quick decision tree

1. **Is it a shadcn-style primitive or shared across apps?** → `packages/ui`.
2. **Is it only used on one route?** → `app/.../_components/`.
3. **Is it domain UI shared across routes?** → `src/components/<domain>/`.
4. **Is it data fetching or mutation wiring (TRPC + React Query)?** → `src/hooks/queries/` or `src/hooks/mutations/` (by domain).

## Import examples

```tsx
// Server page
import { prefetch, trpc } from "~/trpc/server";

// Client hook
import { useTRPC } from "~/trpc/react";

// Shared UI
import { Button } from "@board-games/ui/button";
import { toast } from "@board-games/ui/toast";

// App component
import { GameHeaderSection } from "~/components/game/detail/game-header-section";
```

For API and router patterns outside the web app, see the repo’s router–service–repository skill (`router-service-repo-model`).
