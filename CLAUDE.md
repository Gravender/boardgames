# Board Games Tracker - Project Guidelines

## Project Overview

This is a monorepo for tracking board games, players, matches, scoresheets, and sharing data across friends. The project uses a modern full-stack TypeScript architecture with Next.js and Expo clients, tRPC API, Drizzle ORM, and PostgreSQL.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Expo (React Native)
- **Backend**: tRPC, Drizzle ORM, PostgreSQL
- **Package manager**: Bun (root `package.json`); use `bun install`, `bun run`, and `bunx`.

### Code Style

- **TypeScript**: Strict mode enabled, use type inference where appropriate
- **File Size**: TypeScript files should have a maximum of 500 lines before being broken up into separate files
- **Imports**: Use workspace package imports (e.g., `@board-games/ui`, `@board-games/api`, `@board-games/env/web`)
- **File Naming**:
  - Components: PascalCase (e.g., `MatchSummary.tsx`)
  - Utilities/hooks: camelCase (e.g., `useDebounce.ts`)
  - Types: PascalCase interfaces/types

### Component Patterns

- Use React Server Components by default in Next.js app directory
- Client components should be marked with `"use client"` directive
- Prefer TanStack Form for form management
- Use TanStack Query for data fetching and mutations
- When using TanStack `form.Subscribe`, subscribe only to the minimal needed state
  - Prefer a concise selector for specific fields:
    - `selector={(state) => ({ players: state.values.players, teams: state.values.teams })}`
  - Keep selector output minimal and stable in shape
  - Avoid derived computations in selector; derive inside render
  - Use a primitive selector (for example `state.isSubmitting`) only for single scalar subscriptions

### API Patterns

- Organize procedures by domain (e.g., `routers/match/`, `routers/player/`)
- Use repositories pattern for database access (`repositories/`)
- Services contain business logic (`services/`)
- Use Zod schemas for input validation
- Leverage Drizzle ORM for type-safe database queries

### Testing

- Playwright e2e tests in `packages/playwright-web/`
- Note: E2e tests may be outdated and need updates
- Run with: `bun run e2e`

### Package-Specific Commands

After making changes in a specific package, run its check (lint + typecheck + format) or format-fix via Turbo.
Use Turbo task commands like `turbo run check --filter=<package>` and `turbo run format --filter=<package>` (or `format:fix` when available).

### Important Notes

- Expo app may be behind web app in features
- Shared env for Next.js: `@board-games/env/web`; repo layout: `apps/web`, `apps/native`, `packages/*`
- Optional agent skill bundles: `.agents/skills/` (stack patterns, Expo, Turborepo, etc.)

## When Making Changes

1. **New Features**: Add to appropriate package (api, db, ui, etc.)
2. **Database Changes**: Update schema in `packages/db/src/schema/`, then `bun run db:push`
3. **UI Components**: Add to `packages/ui/src/` if reusable, app-specific in `apps/web/src/components/`
4. **API Routes**: Add tRPC procedures in `packages/api/src/routers/`
5. **Dependencies**: Add to root `package.json` `workspaces.catalog` if shared, or package-specific `package.json`
6. **Type Safety**: Leverage TypeScript and Zod for end-to-end type safety
