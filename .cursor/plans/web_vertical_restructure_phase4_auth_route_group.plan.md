---
name: Web vertical restructure — Phase 4 (auth shell + flat URLs)
overview: Introduce app/(auth)/layout.tsx for the sidebar shell; keep /dashboard as overview only; move product routes to /games, /players, etc.; add redirects from legacy /dashboard/* paths.
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 4: `(auth)` route group + flat URLs

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

App Router restructuring. Prefer completing after **Phase 1** (shell in `~/features/shell/...`) and ideally after **Phase 3** so layout imports do not reference removed `~/components/...` paths.

## Goals

1. **Authenticated shell** in **`app/(auth)/layout.tsx`**: session check, redirect to `/` if unauthenticated, `SidebarProvider`, `AppSidebar`, header (breadcrumbs, theme toggle) — behavior equivalent to today’s [`apps/web/src/app/dashboard/layout.tsx`](../../apps/web/src/app/dashboard/layout.tsx).
2. **URL flattening**: Only **`/dashboard`** is the home overview. Product routes live at **`/games`, `/players`, `/groups`, `/friends`, `/locations`, `/calendar`, `/share-requests`, `/settings`, …** — not under `/dashboard/...`.

## URL mapping

| Before                                  | After                                 |
| --------------------------------------- | ------------------------------------- |
| `/dashboard`                            | `/dashboard` (unchanged)              |
| `/dashboard/games` and nested           | `/games` and nested                   |
| `/dashboard/players` and nested         | `/players` and nested                 |
| Other first segments under `dashboard/` | Same path without `dashboard/` prefix |

## Filesystem moves

- Create **`app/(auth)/layout.tsx`** (shell).
- Move **`app/dashboard/page.tsx`** and **`app/dashboard/_components/`** → **`app/(auth)/dashboard/`** (overview only).
- Move each sibling segment **`games`, `players`, `groups`, `locations`, `friends`, `calendar`, `share-requests`, `settings`, …** from **`app/dashboard/<segment>`** → **`app/(auth)/<segment>`**.
- Remove duplicate shell: delete **`app/dashboard/layout.tsx`** once `(auth)/layout.tsx` owns the shell (no second layout wrapping only `dashboard`).

## Navigation and links

Update imports and hrefs in:

- [`features/shell` — `app-sidebar`, `nav-secondary`, `nav-main`, `breadcrumbs`](../../apps/web/src) (paths after Phase 1–3)
- [`apps/web/src/utils/linkFormatting.ts`](../../apps/web/src/utils/linkFormatting.ts)
- All `Link`, `router.push`, `redirect()`, and metadata / Open Graph URLs that hardcode `/dashboard/games`-style paths

## Backwards compatibility

Add **redirects** (e.g. [`next.config.ts`](../../apps/web/next.config.ts) `redirects` or middleware) such as `/dashboard/games` → `/games` (preserve path suffix with dynamic segments as needed). Test representative old URLs.

## Middleware / proxy

Audit [`middleware.ts` or `proxy`](../../apps/web/src) (Next.js 16 naming) for matchers that assume only `/dashboard` as the authenticated prefix; extend to `/games`, `/players`, etc.

## Tests

- Update Vitest mocks if they use full URLs or path strings.
- Update [`packages/playwright-web`](../../packages/playwright-web) E2E flows if they navigate to `/dashboard/...` for product pages.

## Out of scope

- Login, sign-up, forgot-password, reset-password routes remain **outside** `(auth)` (unauthenticated entry).
- The folder name `(auth)` means **authenticated app shell**; rename to `(app)` or `(main)` if clearer for the team.

## Verification

```bash
turbo run check --filter=web
bun run test:web
# If e2e is maintained:
bun run e2e
```

## Merge criteria

- Manual smoke: `/dashboard` shows overview; `/games`, `/players` load with sidebar; unauthenticated user cannot access `(auth)` routes.
- Old `/dashboard/games`-style URLs redirect or match product decision.
