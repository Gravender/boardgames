---
name: vitest-unit-testing
description: Write fast unit tests with Vitest, React Testing Library, mocking, and snapshots. Use when adding or debugging tests in packages/api, packages/shared, or apps/web; configuring Vitest; or building test coverage for utilities, components, or services.
version: 1.2.0
---

# Vitest unit testing

Systematic unit testing with Vitest: fast feedback, colocated tests, and clear mocking patterns. Adapted from community patterns ([Vitest unit testing skill](https://github.com/ThamJiaHe/claude-code-handbook/blob/main/skills/examples/vitest-unit-testing-skill.md)); this repo uses **Bun** at the root (`bun install`, `bun run`, `bunx`).

## Where tests live in this monorepo

| Package           | Role                                     | Typical command                                                                                        |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web`        | Next.js app: components (jsdom), helpers | `cd apps/web && bun run test` / `bun run test:run`                                                     |
| `packages/api`    | tRPC routers, services (Node)            | `cd packages/api && bun run test` (loads root `.env` via script); `bun run test:run` for CI-style once |
| `packages/shared` | Pure TS utilities                        | `cd packages/shared && bun run test` / `bun run test:run`                                              |

**Environment:** `@board-games/api` tests often hit PostgreSQL and auth-related env — use a populated **root `.env`** and a running DB when running them locally. **`packages/shared`** tests do not require Postgres.

`packages/api/vitest.config.ts` loads the repo root `.env` via `dotenv` so Vitest workers receive `POSTGRES_URL` (the `bun --env-file=../../.env` script alone is not always enough for worker processes).

Root convenience (Turbo `test` task): `bun run test:web`, `bun run test:api`, `bun run test:shared`, or `turbo run test` for every workspace that defines `test`.

**Colocate** tests: `*.test.ts` / `*.test.tsx` next to the module under test (e.g. `src/**/*.test.{ts,tsx}` in web).

## Web app setup (already configured)

- Config: `apps/web/vitest.config.ts` — `environment: 'jsdom'`, `@vitejs/plugin-react`, aliases `~` / `@` → `./src`, `setupFiles`, `include` glob.
- Global setup: `apps/web/src/test/setup.ts` — jest-dom matchers, mocks for `next/image` and `next/navigation`.
- Helpers: `apps/web/src/test/` — `createTestQueryClient()`, `renderWithProviders()`, exported navigation mocks from `~/test`.

Import helpers in specs: `import { renderWithProviders, mockRouter } from '~/test'`.

**tRPC in components:** `renderWithProviders` does not wrap `TRPCProvider`. For `useTRPC()`, see **Advanced tRPC and network testing** below.

### Advanced tRPC and network testing

Use one of these patterns depending on maintenance cost and how close to the wire you need to be.

#### Option A — `vi.mock('~/trpc/react')` (preferred for unit tests)

- Mock only the procedures your SUT calls (e.g. `group.getGroups.queryOptions`).
- Use `mockTrpcQueryOptions` from `~/test/trpc-mock` (re-exported from `~/test`) to build `{ queryKey, queryFn }` that matches `useQuery(...)` expectations.
- Put shared mock data in **`vi.hoisted(() => ({ ... }))`** so it exists when the mock factory runs (Vitest hoists `vi.mock` above normal `const` initializers).
- Reference example: `apps/web/src/hooks/queries/group/groups.test.tsx`.
- To assert UI that reads **prefetched cache**, use `renderWithProviders` with an explicit `queryClient` and `queryClient.setQueryData(...)` before render.

**Trade-off:** Fast and stable; mocks can drift from `AppRouter` unless you type payloads with `RouterOutputs` / procedure outputs.

#### Option B — MSW + HTTP (`POST /api/trpc/*`)

- Intercept `POST` to `/api/trpc` (or `*/api/trpc/*`) and return bodies in the **SuperJSON** wire shape tRPC expects.
- **Pros:** Exercises the HTTP batch link path. **Cons:** High setup cost and breaks more easily when inputs or batch encoding change.

Add `msw` (and optionally `@mswjs/http`) as devDependencies in `apps/web`, register `setupServer` in a Vitest `setupFiles` fragment or conditional import, and keep handlers next to the specs that need them. Do **not** replace `@board-games/api` integration tests with client MSW tests — server tests remain the source of truth for procedures.

#### Option C — Playwright e2e (`bun run e2e`)

- Use for **critical user journeys** (auth, navigation, real API). Complements Vitest; see project `CLAUDE.md` Testing section.

## Install / scripts (reference)

Use **Bun** from repo root. Web devDependencies already include `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

Optional later: `vitest run --coverage` with `@vitest/coverage-v8`; `vitest --ui` for [@vitest/ui](https://vitest.dev/guide/ui).

## Config shape (generic)

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Prefer **explicit** `import { describe, it, expect, vi } from 'vitest'` unless you enable `globals: true` and wire `vitest/globals` types.

## Setup file patterns

**RTL cleanup:** React 19 / modern RTL often auto-cleans; if you see leakage, add:

```ts
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

**jest-dom (Vitest 3):** `import '@testing-library/jest-dom/vitest'` in the setup file used by `setupFiles`.

## Writing tests

### Structure

- `describe` groups; `it` / `test` for cases; one behavior per test.
- Prefer **queries by role / label** (`getByRole`, `getByLabelText`) over brittle CSS or test ids.

### Component example

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyButton } from "./MyButton";
import { renderWithProviders } from "~/test";

describe("MyButton", () => {
  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<MyButton onClick={onClick}>Go</MyButton>);
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Pure utilities

```ts
import { describe, it, expect } from "vitest";
import { normalizeScore } from "./normalize-score";

describe("normalizeScore", () => {
  it("clamps to min/max", () => {
    expect(normalizeScore(-1)).toBe(0);
  });
});
```

## Mocking

### `vi.fn` and modules

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
});

it("resolves data", async () => {
  mockFetch.mockResolvedValue({ json: async () => ({ id: 1 }) });
  // ...
});
```

```ts
vi.mock("../lib/http", () => ({
  get: vi.fn(() => Promise.resolve([{ id: 1 }])),
}));
```

### Partial mock

```ts
vi.mock("../utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils")>();
  return {
    ...actual,
    nowIso: () => "2026-01-01T00:00:00.000Z",
  };
});
```

### Spies

```ts
import { vi } from "vitest";

const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
// ...
logSpy.mockRestore();
```

## Async tests

Use `async` tests and `await expect(promise).rejects.toThrow(...)` for rejection paths; avoid bare `setTimeout` without `vi.useFakeTimers()` when you need determinism.

## Snapshots

```tsx
const { container } = render(<Card title="T">Body</Card>);
expect(container.firstChild).toMatchSnapshot();
```

Keep snapshots **small** and review diffs in PRs; avoid snapshotting huge trees without intent.

## Coverage (optional)

```bash
bunx vitest run --coverage
```

Configure `coverage.provider: 'v8'`, `reporter`, and `exclude` in `vitest.config` when you adopt coverage gates.

## Anti-patterns

- **Global mutable state** shared across tests without `beforeEach` reset.
- **Testing implementation details** (private methods, internal state) instead of user-visible behavior.
- **Huge snapshots** that nobody reads.
- **Flaky timers/network** — mock or fake time (`vi.useFakeTimers`) when needed.
- **Skipping cleanup** of mocks (`mockRestore`, `mockReset`) when tests interfere.

## Verification checklist (before merging risky test PRs)

- Tests are isolated and order-independent.
- Async work is awaited; no unhandled rejections.
- Mocks match real module shapes enough to satisfy TypeScript.
- Web: critical flows still covered by e2e where unit tests cannot replace integration (`bun run e2e`).

## Resources

- Vitest: [vitest.dev](https://vitest.dev)
- Testing Library: [testing-library.com](https://testing-library.com)
- Vitest examples: [github.com/vitest-dev/vitest/tree/main/examples](https://github.com/vitest-dev/vitest/tree/main/examples)
- Inspiration / extended patterns: [claude-code-handbook vitest skill](https://github.com/ThamJiaHe/claude-code-handbook/blob/main/skills/examples/vitest-unit-testing-skill.md)
