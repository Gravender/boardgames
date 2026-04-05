---
name: router-service-repo-model
description: Implements API domains using the repo service router model with explicit Zod input/output schemas, inferred types, and shared vs original discriminated unions. Use when adding or migrating tRPC procedures in packages/api, especially when a feature needs parity across original and shared entities.
---

# Router Service Repo Model

Use this skill when building or migrating a domain to the `repository -> service -> router` pattern in `packages/api`, including `input/output` schema contracts and `shared` vs `original` branching.

## Source Patterns To Mirror

- `packages/api/src/routers/game/game.input.ts`
- `packages/api/src/routers/game/game.output.ts`
- `packages/api/src/routers/game/game.router.ts`
- `packages/api/src/routers/match/match.input.ts`
- `packages/api/src/routers/match/match.output.ts`
- `packages/api/src/routers/match/match.router.ts`

## Required Architecture

1. **Repository** (`repositories/<domain>/...repository.ts` or `routers/<domain>/repository/`)
   - **Persistence only**: `select` / `insert` / `update` / `delete`, and straightforward relational reads (e.g. `findMany` with `with`).
   - **No exported DTO / return types** for the repository layer: do not define shared `Raw` / `Row` types for repo outputs; let TypeScript infer from Drizzle, or keep shapes anonymous inside the repo file.
   - **No redundant mapping**: return query results directly when the shape already matches the ORM (avoid `.map()` that only copies the same fields).
   - **No business orchestration**: do not call other domain repos for derived metrics (e.g. group **match counts** belong in **service**, which calls `groupMatchesRepository` after loading group members).
   - **No `TRPCError`**: return `null`, `[]`, or booleans when a row set is empty; **service** decides `NOT_FOUND` / `FORBIDDEN`.
   - **No authorization rules as narrative logic** — express scope as **query filters** (`where: { createdBy: userId }`). Returning raw columns (e.g. `deletedAt`) is fine; **service** filters and maps to API output.

2. **Service** (`services/<domain>/...service.ts` or `routers/<domain>/service/`)
   - **All business rules**: dedupe, validation, ownership checks, sorting, filtering, composing multiple repositories.
   - **Ownership and policy-heavy reads** (e.g. “which of these player ids belong to this user?”) live in the **service** layer: implement as private helpers next to the service (or a dedicated `*.queries.ts` colocated with the service), not on the domain repository, when the check is a business rule rather than a simple scoped entity load.
   - Maps raw rows to **output** contract shapes.
   - **Throws `TRPCError`** for client-facing failures (`NOT_FOUND`, `FORBIDDEN`, etc.).
   - Keeps compatibility fields expected by clients.
   - **Never `Promise.all` a dynamic list of independent DB round-trips** (e.g. per-row / per-entity queries in a loop mapped to `Promise.all`). Prefer a **single** batched query, a SQL CTE, or **sequential** `await` when you must issue multiple statements and want predictable load (avoid hammering the pool with unbounded concurrency).

3. **Router** (`routers/<domain>/<domain>.router.ts`)
   - Thin tRPC layer.
   - Wires `.input(...)` and `.output(...)` schemas from domain files.
   - Delegates to service with `{ ctx, input }`.

4. **Contracts**
   - `routers/<domain>/<domain>.input.ts`: all procedure input schemas.
   - `routers/<domain>/<domain>.output.ts`: all procedure output schemas.
   - Export inferred types for every public schema.

## Contract Rules

- Prefer `z.discriminatedUnion("type", [...])` for `original` vs `shared`.
- Keep branch field names explicit and stable:
  - `original`: usually `id`
  - `shared`: domain-specific ids such as `sharedGameId`, `sharedMatchId`, or `sharedId` for nested items
- Reuse base schemas from:
  - `@board-games/db/zodSchema` for DB entities
  - `@board-games/shared` for shared primitives (`imageSchema`, `sharedOrOriginalSchema`, roles, etc.)
- Export schema infer types:
  - `export type GetThingInputType = z.infer<typeof getThingInput>;`
  - `export type GetThingOutputType = z.infer<typeof getThingOutput>;`

## Implementation Workflow

Copy this checklist and complete it in order:

```md
Migration checklist:

- [ ] Define procedure list for the domain
- [ ] Add input schemas in `<domain>.input.ts`
- [ ] Add output schemas in `<domain>.output.ts`
- [ ] Export all `z.infer` contract types
- [ ] Implement repository read methods (original/shared branches)
- [ ] Implement service orchestration + mapping
- [ ] Wire router procedures with `.input/.output` and service calls
- [ ] Keep legacy wrappers only if migration risk requires it
- [ ] Add tests for original/shared branches and authorization
- [ ] Run checks for changed package(s)
```

## Pseudocode Template

Use this shape when creating new procedures:

```ts
// input.ts
const getEntityInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("original"), id: z.number() }),
  z.object({ type: z.literal("shared"), sharedEntityId: z.number() }),
]);
export type GetEntityInputType = z.infer<typeof getEntityInput>;

// output.ts
const entitySharedFields = {
  name: z.string(),
  image: imageSchema.nullable(),
};
const getEntityOutput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("original"), id: z.number(), ...entitySharedFields }),
  z.object({
    type: z.literal("shared"),
    id: z.number(),
    permissions: z.literal("view").or(z.literal("edit")),
    ...entitySharedFields,
  }),
]);
export type GetEntityOutputType = z.infer<typeof getEntityOutput>;

// repository.ts
const getOriginalEntity = async (deps) => { /* DB query only */ };
const getSharedEntity = async (deps) => { /* DB query only */ };

// service.ts
const getEntity = async ({ ctx, input }) => {
  if (input.type === "original") return mapOriginal(await repo.getOriginalEntity(...));
  return mapShared(await repo.getSharedEntity(...));
};

// router.ts
getEntity: protectedUserProcedure
  .input(getEntityInput)
  .output(getEntityOutput)
  .query(({ ctx, input }) => service.getEntity({ ctx, input }));
```

## Shared vs Original Guidance

- Branch at input boundary, not deep inside random helpers.
- Keep mapping functions branch-specific when shapes diverge.
- Normalize fields that UI expects across both branches (`name`, `image`, aggregate stats).
- Include permission fields on shared branches when available.
- For nested entities, use explicit discriminators if nested branch behavior matters.

## Naming Conventions

- Schema constants: `getPlayersOutput`, `getMatchInput`, `editGameOutput`
- Inferred types: `GetPlayersOutputType`, `GetMatchInputType`
- Service methods: `getPlayers`, `getPlayer`, `createMatch`
- Repository methods: `getOriginalPlayers`, `getSharedPlayers`, `getPlayerStats...`

## Quality Gate Before Finish

1. Router has no direct DB reads.
2. Repository has no `TRPCError`, no cross-repo orchestration for domain rules, and no exported repository-layer DTO types.
3. No `Promise.all` over an unbounded set of per-row / per-entity DB calls unless replaced by a batched query or intentional sequential `await`.
4. Every router procedure has `.output(...)`.
5. Input/output files export infer types for all public contracts.
6. Original/shared parity is covered in tests.
7. Existing frontend contract fields are preserved.

## When To Use A Legacy Wrapper

If frontend migration is in progress, keep old router endpoints as temporary pass-through wrappers to the new service methods. Remove wrappers after consumers are migrated and parity is verified.
