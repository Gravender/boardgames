# Board Games Tracker - Project Guidelines

## Project Overview

This is a monorepo for tracking board games, players, matches, scoresheets, and sharing data across friends. The project uses a modern full-stack TypeScript architecture with Next.js and Expo clients, tRPC API, Drizzle ORM, and PostgreSQL.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Expo (React Native)
- **Backend**: tRPC, Drizzle ORM, PostgreSQL

### Code Style

- **TypeScript**: Strict mode enabled, use type inference where appropriate
- **File Size**: TypeScript files should have a maximum of 500 lines before being broken up into separate files
- **Imports**: Use workspace package imports (e.g., `@board-games/ui`, `@board-games/api`)
- **File Naming**:
  - Components: PascalCase (e.g., `MatchSummary.tsx`)
  - Utilities/hooks: camelCase (e.g., `useDebounce.ts`)
  - Types: PascalCase interfaces/types

### Component Patterns

- Use React Server Components by default in Next.js app directory
- Client components should be marked with `"use client"` directive
- Prefer TanStack Form for form management
- Use TanStack Query for data fetching and mutations

### API Patterns

- Organize procedures by domain (e.g., `routers/match/`, `routers/player/`)
- Use repositories pattern for database access (`repositories/`)
- Services contain business logic (`services/`)
- Use Zod schemas for input validation
- Leverage Drizzle ORM for type-safe database queries

### Testing

- Playwright e2e tests in `tooling/playwright-web/`
- Note: E2e tests may be outdated and need updates
- Run with: `pnpm e2e`

### Package-Specific Commands

After making changes in a specific package, run its check (lint + typecheck + format) or format-fix via Turbo.

### Important Notes

- Expo app may be behind web app in features

## When Making Changes

1. **New Features**: Add to appropriate package (api, db, ui, etc.)
2. **Database Changes**: Update schema in `packages/db/src/schema/`, then `pnpm db:push`
3. **UI Components**: Add to `packages/ui/src/` if reusable, app-specific in `apps/nextjs/src/components/`
4. **API Routes**: Add tRPC procedures in `packages/api/src/routers/`
5. **Dependencies**: Add to root `pnpm-workspace.yaml` catalog if shared, or package-specific `package.json`
6. **Type Safety**: Leverage TypeScript and Zod for end-to-end type safety
