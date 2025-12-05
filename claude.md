# Board Games Tracker - Project Guidelines

## Project Overview

This is a monorepo for tracking board games, players, matches, scoresheets, and sharing data across friends. The project uses a modern full-stack TypeScript architecture with Next.js and Expo clients, tRPC API, Drizzle ORM, and PostgreSQL.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Expo (React Native)
- **Backend**: tRPC, Drizzle ORM, PostgreSQL
- **Styling**: Tailwind CSS 4, Radix UI components
- **State Management**: TanStack Query (React Query), Zustand, TanStack Form
- **Authentication**: Better Auth
- **Build System**: Turbo (Turborepo), pnpm workspaces
- **Language**: TypeScript 5.9+
- **Validation**: Zod 4.1+
- **Package Manager**: pnpm 10.15.1+

## Monorepo Structure

```
apps/
  nextjs/     - Next.js 16 web application (React 19)
  expo/       - Expo/React Native mobile application

packages/
  api/        - tRPC procedures, services, repositories
  db/         - Drizzle schema, migrations, seeds, database helpers
  ui/         - Shared UI components (Tailwind + Radix)
  shared/     - Cross-platform utilities and score logic
  auth/       - Auth configuration consumed by apps

tooling/
  eslint/     - Shared ESLint configuration
  prettier/   - Shared Prettier configuration
  tailwind/   - Shared Tailwind configuration
  typescript/ - Shared TypeScript configuration
```

## Development Guidelines

### Package Management

- Use `pnpm` exclusively (version 10.15.1+)
- Dependencies are managed via `pnpm-workspace.yaml` catalog
- Use workspace protocol (`workspace:*`) for internal packages
- Use catalog references for shared dependencies (e.g., `"react": "catalog:react19"`)
- Run `pnpm install` at the root after adding dependencies

### Code Style

- **TypeScript**: Strict mode enabled, use type inference where appropriate
- **Imports**: Use workspace package imports (e.g., `@board-games/ui`, `@board-games/api`)
- **File Naming**:
  - Components: PascalCase (e.g., `MatchSummary.tsx`)
  - Utilities/hooks: camelCase (e.g., `useDebounce.ts`)
  - Types: PascalCase interfaces/types
- **Formatting**: Prettier with shared config (`@board-games/prettier-config`)
- **Linting**: ESLint with shared config (`@board-games/eslint-config`)

### Component Patterns

- Use React Server Components by default in Next.js app directory
- Client components should be marked with `"use client"` directive
- Prefer TanStack Form for form management
- Use TanStack Query for data fetching and mutations
- UI components live in `@board-games/ui` package
- Use `cn()` utility from `@board-games/ui/utils` for className merging

### API Patterns

- All API routes use tRPC procedures in `packages/api`
- Organize procedures by domain (e.g., `routers/match/`, `routers/player/`)
- Use repositories pattern for database access (`repositories/`)
- Services contain business logic (`services/`)
- Use Zod schemas for input validation
- Leverage Drizzle ORM for type-safe database queries

### Database Patterns

- Schema definitions in `packages/db/src/schema/`
- Use Drizzle migrations (`pnpm db:push`)
- Seed data via `packages/db/src/seeding/` (`pnpm db:seed`)
- Access database via `packages/db` exports
- Use Drizzle Studio for database inspection (`pnpm db:studio`)

### Environment Variables

- Root `.env` file contains all environment variables
- Use `@t3-oss/env-nextjs` for type-safe env validation
- Environment variables are passed through Turbo config
- Use `pnpm with-env` script wrapper for commands that need env vars

### Development Workflow

1. **Start Database**: `./start-database.sh` (Docker PostgreSQL)
2. **Sync Schema**: `pnpm db:push`
3. **Seed Data** (optional): `pnpm db:seed`
4. **Start Dev Server**: `pnpm dev` (runs Turbo watch mode)
5. **Scope to App**: `pnpm turbo run dev --filter=@board-games/nextjs`

### Testing

- Playwright e2e tests in `tooling/playwright-web/`
- Note: E2e tests may be outdated and need updates
- Run with: `pnpm e2e`

### Build & Deployment

- Use Turbo for builds: `pnpm build`
- Turbo handles dependency graph and caching
- Build outputs: `.cache/`, `dist/`, `.next/`

### Key Conventions

- **Sharing**: First-class feature with link-based access, friend requests, permissioned edits
- **Reusability**: Players, teams, locations, and groups are reusable across matches
- **Scoring**: Flexible scoring system (rounds, placements, manual, cooperative)
- **Analytics**: PostHog for product analytics, Sentry for error tracking
- **File Uploads**: UploadThing integration for images

### Common Commands

```bash
# Development
pnpm dev                    # Start all apps in watch mode
pnpm dev:next              # Start only Next.js app
pnpm db:push               # Sync database schema
pnpm db:seed               # Seed database
pnpm db:studio             # Open Drizzle Studio

# Quality
pnpm lint                  # Lint all packages
pnpm lint:fix              # Fix linting issues
pnpm typecheck             # Type check all packages
pnpm format                # Check formatting
pnpm format:fix            # Fix formatting

# Build
pnpm build                 # Build all packages
pnpm clean                 # Clean all node_modules
pnpm clean:workspaces      # Clean workspace build artifacts
```

### Important Notes

- Expo app may be behind web app in features
- Playwright tests may be outdated
- Requires Node.js >= 22.21.0
- Uses Docker for local PostgreSQL
- Better Auth keys required for sharing features
- Seeded data recommended for local development

## When Making Changes

1. **New Features**: Add to appropriate package (api, db, ui, etc.)
2. **Database Changes**: Update schema in `packages/db/src/schema/`, then `pnpm db:push`
3. **UI Components**: Add to `packages/ui/src/` if reusable, app-specific in `apps/nextjs/src/components/`
4. **API Routes**: Add tRPC procedures in `packages/api/src/routers/`
5. **Dependencies**: Add to root `pnpm-workspace.yaml` catalog if shared, or package-specific `package.json`
6. **Type Safety**: Leverage TypeScript and Zod for end-to-end type safety
