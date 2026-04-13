---
name: Web vertical restructure — Phase 3 (cleanup + docs)
overview: Remove emptied src/components and src/hooks when safe; update Cursor skill, CLAUDE.md, and tanstack-form rule; sweep for stale path references.
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 3: Remove old trees + documentation

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

Run this **after** Phases 1–2 so nothing still imports from legacy top-level `components/` or `hooks/` trees.

## Cleanup

1. Confirm `apps/web/src/components` is empty or only contains removable leftovers (e.g. empty `layout/`). Delete the directory if fully drained.
2. Confirm `apps/web/src/hooks` is empty. Delete if fully drained.
3. Move any stragglers (e.g. `render-smoke.test.tsx`) to an appropriate location such as [`apps/web/src/test/`](../../apps/web/src/test) if not already placed.

## Documentation and rules

| File                                                                                                             | Action                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`.cursor/skills/web-app-src-conventions/SKILL.md`](../../.cursor/skills/web-app-src-conventions/SKILL.md)       | Replace `src/components` + split `src/hooks` guidance with `features/<vertical>/` colocation; `packages/ui` vs `features/*` vs route `_components`; `ConfirmDeleteDialog` from `~/features/shared/...`; note Phase 4 routing when that lands |
| [`CLAUDE.md`](../../CLAUDE.md)                                                                                   | Update app UI location to `apps/web/src/features/...`                                                                                                                                                                                        |
| [`.cursor/rules/tanstack-form-subscribe-selector.mdc`](../../.cursor/rules/tanstack-form-subscribe-selector.mdc) | Point canonical example to `~/features/match/components/.../selector.tsx` (or actual path after Phase 2)                                                                                                                                     |

## Repository sweep

```bash
rg 'apps/web/src/components|~/components/' --glob '*.{md,mdc,tsx,ts}'
rg '~/hooks/' apps/web
```

Fix or remove stale references in docs, rules, and comments.

## Verification

```bash
turbo run check --filter=web
bun run test:web
```

## Merge criteria

- No dangling imports to deleted `src/hooks` or `src/components` roots
- Skill and CLAUDE updates committed
- Grep for old path strings in `.cursor` and `CLAUDE.md` cleaned up
