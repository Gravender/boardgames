---
name: Web vertical restructure — Phase 2 (core domains)
overview: Move game, match, and player verticals (components + hooks) in one atomic change; update all imports and cross-references. Prefer a single PR to avoid hybrid ~/components vs ~/features paths between these three.
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 2: Game + match + player (single batch)

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

This phase migrates the **dense cross-import** trio together.

## Scope

| Vertical          | Components             | Hooks                                                                                            |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `features/game`   | `components/game/**`   | `hooks/queries/game`, `hooks/mutations/game`, `hooks/invalidate/game.tsx`, `hooks/game-stats/**` |
| `features/match`  | `components/match/**`  | `hooks/queries/match`, `hooks/mutations/match`                                                   |
| `features/player` | `components/player/**` | `hooks/queries/player`, `hooks/mutations/player`, `hooks/invalidate/player.tsx`                  |

## Why one PR

These areas import each other frequently (e.g. match UI importing game roles, player mutations). Migrating one vertical without the others leaves confusing `~/components/game` vs `~/features/match` boundaries. Move all three and rewrite imports in one pass.

## Import rewrite patterns

- `~/components/game/...` → `~/features/game/components/...`
- `~/components/match/...` → `~/features/match/components/...`
- `~/components/player/...` → `~/features/player/components/...`
- `~/hooks/queries/game/...` → `~/features/game/hooks/queries/game/...` (mirror existing subpaths)
- Same idea for `match` and `player` mutations/queries/invalidate
- Cross-feature imports (e.g. match → `~/features/game/hooks/...`, match → `~/features/group/hooks/...`) must resolve to the new paths

## Consumers outside the three folders

Update **every** file that still imports old paths, including:

- `app/dashboard/**` route files and `_components`
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
- Grep shows no stale `~/components/(game|match|player)/` or `~/hooks/(queries|mutations)/{game,match,player}/` for migrated modules (allowlist any intentional shims if you add them temporarily)
