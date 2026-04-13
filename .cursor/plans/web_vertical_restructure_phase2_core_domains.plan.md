---
name: Web vertical restructure — Phase 2 (core domains)
overview: Colocate game/match/player UI in Next.js private folders under src/app (e.g. games/_components, games/[id]/_components, nested dynamic segments). Shared hooks stay in src/hooks. https://nextjs.org/docs/app/getting-started/project-structure
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 2: Game + match + player (single batch)

**Next.js**: Route-local files live in [**private folders**](https://nextjs.org/docs/app/getting-started/project-structure#private-folders) such as **`_components`**; [**dynamic segments**](https://nextjs.org/docs/app/getting-started/project-structure#dynamic-routes) use `[param]` folder names. Reference: [**Project structure**](https://nextjs.org/docs/app/getting-started/project-structure).

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

This phase migrates the **dense cross-import** trio together. **Do not** introduce `src/features/`.

## Goals

- Move **route-specific** UI from `src/components/game`, `src/components/match`, `src/components/player` into the **appropriate segments** under **`src/app`**, using **`_components`** (and optional **`_lib`**) per the docs, for example:
  - `src/app/(auth)/games/_components` — widgets used by the games list route only
  - `src/app/(auth)/games/[id]/_components` — game detail–scoped UI
  - `src/app/(auth)/games/[id]/matches/[matchId]/_components` — match-scoped UI (rename segments to match this repo’s folders, e.g. `[gameId]` / `[matchId]`)
  - `src/app/(auth)/players/.../_components` — player-route UI as needed
- Leave **genuinely shared** pieces in **`src/components`** (used from multiple unrelated routes).
- Keep **shared** data modules in **`src/hooks`** (`hooks/queries/game`, `hooks/mutations/match`, `hooks/invalidate/*`, etc.). Colocate a hook under **`_lib`** or beside **`_components`** only if it is **single-route** private.

## Why one PR

These areas import each other frequently. Migrating one domain without the others leaves mixed paths. Move all three and rewrite imports in **one** pass when possible.

## Import patterns

- Shared: `~/components/...`, `~/hooks/...`
- Route-local: `import { Foo } from "./_components/foo"` from the owning **`page.tsx`** / **`layout.tsx`**
- Rewrite stale `~/components/game/...` to new colocated paths or to `~/components/...` when the module remains shared

## Consumers to update

Update **every** file that still imports old paths, including:

- `src/app/dashboard/**` or **`src/app/(auth)/**`** route files and **`\_components`\*\*
- `packages/playwright-web` if it references paths (grep)
- Tests and `vi.mock('~/hooks/...')` strings

## Verification

```bash
turbo run check --filter=web
bun run test:web
```

## Merge criteria

- Typecheck clean for `web`
- Vitest for `apps/web` passes
- No new **`src/features`** directory
- Grep shows no unintentional stale paths for migrated modules (allowlist shims only if briefly needed)
