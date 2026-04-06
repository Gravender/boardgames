---
name: base-ui-primitives
description: Use Base UI via @board-games/ui instead of Radix for dialogs, popovers, selects, and related primitives. Use when adding or debugging UI components, migrating shadcn/Radix snippets, or choosing import paths for overlays and form controls.
---

# Base UI primitives (this repo)

## Context

The web design system uses [**Base UI** (`@base-ui/react`)](https://base-ui.com/react) inside `packages/ui`. **Radix UI is not used** for primitives here.

## Rules

1. **Import from `@board-games/ui`** (e.g. `@board-games/ui/dialog`, `@board-games/ui/popover`, `@board-games/ui/select`) — not from `@radix-ui/*`.
2. **Do not rely on Radix** variable names (`--radix-*`), APIs, or Radix-only docs when wiring behavior or layout; check `packages/ui/src/components/*.tsx` and [Base UI docs](https://base-ui.com/react).
3. **Command** search UIs use **`cmdk`** via `@board-games/ui/command`; that is separate from the Base UI primitive set.
4. **shadcn-style** copy-paste often assumes Radix; **adapt** props, slots, and styling to match our Base UI wrappers.

## Where to look

- Shared wrappers: `packages/ui/src/components/`
- Project note: [CLAUDE.md](CLAUDE.md) → “UI primitives (Base UI, not Radix)”
- Cursor rule: `.cursor/rules/base-ui-primitives.mdc`
