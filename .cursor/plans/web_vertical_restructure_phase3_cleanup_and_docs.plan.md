---
name: Web vertical restructure — Phase 3 (cleanup + docs)
overview: Update skills/CLAUDE/rules to match Next.js project structure (https://nextjs.org/docs/app/getting-started/project-structure) — src/components, src/hooks, app/.../_components. Sweep stale paths.
isProject: false
umbrella: .cursor/plans/web_vertical_restructure_0596f2bd.plan.md
---

# Phase 3: Documentation + repository sweep

**Next.js**: Documentation should cite [**Project structure and organization**](https://nextjs.org/docs/app/getting-started/project-structure) for **special files** (`layout`, `page`, …), **private folders**, **route groups**, and **colocation**.

**Umbrella**: [web_vertical_restructure_0596f2bd.plan.md](./web_vertical_restructure_0596f2bd.plan.md) (canonical copy in this monorepo).

Run this **after** Phases 1–2 so conventions match **Next.js-aligned** layout.

## Cleanup (lightweight)

1. Remove **empty** directories left after moves (if any); fix duplicate files.
2. Ensure tests (e.g. `render-smoke.test.tsx`) live under agreed locations such as [`apps/web/src/test/`](../../apps/web/src/test).
3. **Do not** delete **`src/components`** or **`src/hooks`** — they remain shared roots per the [**store outside `app`**](https://nextjs.org/docs/app/getting-started/project-structure#store-project-files-outside-of-app) strategy.

## Documentation and rules

| File                                                                                                             | Action                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`.cursor/skills/web-app-src-conventions/SKILL.md`](../../.cursor/skills/web-app-src-conventions/SKILL.md)       | Link [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure); **no** `src/features/`; **`src/components`** + **`src/hooks`**; **`src/app/.../_components`** / **`_lib`**; `packages/ui`; **`ConfirmDeleteDialog`**; Phase 4 `(auth)` + URLs |
| [`CLAUDE.md`](../../CLAUDE.md)                                                                                   | Shared `apps/web/src/components` + `apps/web/src/hooks`; route-local `src/app/.../_components`                                                                                                                                                                                 |
| [`.cursor/rules/tanstack-form-subscribe-selector.mdc`](../../.cursor/rules/tanstack-form-subscribe-selector.mdc) | Canonical example path under `src/app/.../_components/...` after colocation                                                                                                                                                                                                    |

## Repository sweep

```bash
rg 'src/features|~/features/' --glob '*.{md,mdc,tsx,ts}'
rg 'apps/web/src/features' .
```

Fix or remove stale references in docs, rules, and comments.

## Verification

```bash
turbo run check --filter=web
bun run test:web
```

## Merge criteria

- Skill and CLAUDE updates committed
- Grep for obsolete **`features/`** path strings in `.cursor` and `CLAUDE.md` cleaned up
- Checks/tests green for `web`
