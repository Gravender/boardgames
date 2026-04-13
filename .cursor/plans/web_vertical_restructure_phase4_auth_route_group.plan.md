---
name: Web vertical restructure — Phase 4 (auth shell + flat URLs)
overview: Use Next.js route groups (auth) and layout.tsx for authenticated shell; flatten URLs. https://nextjs.org/docs/app/getting-started/project-structure — Route groups; https://nextjs.org/docs/app/api-reference/file-conventions/layout
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 4: `(auth)` route group + flat URLs

**Next.js**: [**Route groups**](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) `(folder)` omit the folder from the URL and group **`layout.tsx`** / routes. [**Project structure**](https://nextjs.org/docs/app/getting-started/project-structure) — see **Route groups and private folders** table. Shell behavior uses the [**layout**](https://nextjs.org/docs/app/api-reference/file-conventions/layout) convention.

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

App Router restructuring. Prefer completing after **Phase 1** (stable **`~/components/...`**) and after colocation so layouts import correct paths.

## Goals

1. **Authenticated shell** in **`src/app/(auth)/layout.tsx`**: session check, redirect to `/` if unauthenticated, `SidebarProvider`, `AppSidebar`, header (breadcrumbs, theme toggle) — same behavior as today’s [`apps/web/src/app/dashboard/layout.tsx`](../../apps/web/src/app/dashboard/layout.tsx).
2. **URL flattening**: Only **`/dashboard`** is the home overview. Product routes at **`/games`, `/players`, `/groups`, …** — not under **`/dashboard/...`**.

## URL mapping

| Before                                  | After                                 |
| --------------------------------------- | ------------------------------------- |
| `/dashboard`                            | `/dashboard` (unchanged)              |
| `/dashboard/games` and nested           | `/games` and nested                   |
| `/dashboard/players` and nested         | `/players` and nested                 |
| Other first segments under `dashboard/` | Same path without `dashboard/` prefix |

## Filesystem moves

All paths under **`apps/web/src/app/`**.

- Create **`(auth)/layout.tsx`** — shared shell for grouped routes ([layout](https://nextjs.org/docs/app/api-reference/file-conventions/layout)).
- Move **`dashboard/page.tsx`** and **`dashboard/_components/`** → **`(auth)/dashboard/`** (overview only; [`page`](https://nextjs.org/docs/app/api-reference/file-conventions/page) exposes the route).
- Move each sibling segment **`games`, `players`, `groups`, …** from **`dashboard/<segment>`** → **`(auth)/<segment>`**. Preserve each segment’s **`_components`** and other **private folders** ([private folders](https://nextjs.org/docs/app/getting-started/project-structure#private-folders)).
- Remove duplicate shell: delete **`dashboard/layout.tsx`** once **`(auth)/layout.tsx`** wraps the tree.

## Navigation and links

Update imports and hrefs in:

- Shell: **`~/components/app-sidebar`**, **`~/components/nav-secondary`**, **`~/components/nav-main`**, breadcrumbs
- [`apps/web/src/utils/linkFormatting.ts`](../../apps/web/src/utils/linkFormatting.ts)
- All `Link`, `router.push`, `redirect()`, metadata / Open Graph URLs that hardcode `/dashboard/...`

## Backwards compatibility

Add **redirects** (e.g. [`next.config.ts`](../../apps/web/next.config.ts) `redirects` or middleware): `/dashboard/games` → `/games` (preserve dynamic suffixes). Test old URLs.

## Middleware / proxy

Audit [`middleware.ts` or `proxy`](../../apps/web/src) for path assumptions; extend to `/games`, `/players`, etc.

## Tests

- Update Vitest mocks if they use path strings.
- Update [`packages/playwright-web`](../../packages/playwright-web) E2E if it uses `/dashboard/...` for product pages.

## Out of scope

- Login, sign-up, forgot-password, reset-password stay **outside** `(auth)`.
- Rename `(auth)` to `(app)` or `(main)` if clearer ([route group](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) name is organizational only).

## Verification

```bash
turbo run check --filter=web
bun run test:web
# If e2e is maintained:
bun run e2e
```

## Merge criteria

- Manual smoke: `/dashboard` overview; `/games`, `/players` with sidebar; unauthenticated users blocked from `(auth)` routes.
- Legacy `/dashboard/games`-style URLs redirect per product decision.
