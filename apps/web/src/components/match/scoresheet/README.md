# Match scoresheet (web)

How the live match scoresheet is structured, where data comes from, and how edits reach the server.

## Entry point

- **Page shell**: [`scoresheet.tsx`](../scoresheet.tsx) (`Scoresheet` → `ScoresheetContent`) loads match header info, then chooses the grid or a manual-only flow.
- **Table vs manual**: `ScoreSheetTableManualSelector` reads `getMatchScoresheet`. If `winCondition === "Manual"` and there are **no rounds**, it renders **`ManualScoreSheet`** (pick winners without a round grid). Otherwise it renders **`ScoreSheetTable`** from [`table.tsx`](./table.tsx).

## Data (TanStack Query + tRPC)

All keys use the same **`MatchInput`** (`{ type: "original", id }` or `{ type: "shared", sharedMatchId }`) so cache updates line up.

### HTTP batching (tRPC client)

The browser client is created with **`httpBatchStreamLink`** in [`trpc/react.tsx`](../../../trpc/react.tsx). When multiple tRPC operations are **in flight in the same batch window**, tRPC can combine them into **one HTTP request** (streaming). That is separate from app-level “batch this scoresheet” logic.

The scoresheet **write queue** uses **`concurrency: 1`**, so score mutations run **one after another**. Sequential `mutateAsync` calls mostly **do not** stack into the same multi-op HTTP batch the way **parallel** mutations might; the queue exists for **write ordering and optimistic cache / invalidation behavior**, not to replace tRPC’s batching link.

| Query                           | Hook                 | Used for                                                                       |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `match.getMatch`                | `useMatch`           | Name, date, location, comment, duration, finish state, etc.                    |
| `match.getMatchScoresheet`      | `useScoresheet`      | Rounds, scoring rules (coop/competitive, manual totals, best-of, …)            |
| `match.getMatchPlayersAndTeams` | `usePlayersAndTeams` | Columns: players, teams, per-round scores, optional details, **manual totals** |

Suspense boundaries in `ScoresheetContent` wrap the table and footer so loading is incremental.

## `ScoreSheetTable` layout

Implemented in [`table.tsx`](./table.tsx).

1. **`useScoresheetWriteQueue(matchInput)`** — one **serial write queue** per table instance (see below).
2. **Header** — round add button (`AddRoundDialog`), team/player columns with links to **team/player editor** dialogs.
3. **Body** — one row per **round** (`BodyRow`): numeric cells use **`NumberInput`**, checkbox-style rounds use **`DebouncedCheckbox`**.
4. **Footer** — **details** row (`DetailDialog` per cell), **totals** row (`TotalRow`: computed totals or manual `NumberInput` when `roundsScore === "Manual"`).

`matchInput` is threaded through rows so mutations always send a proper `MatchInput`, not the full `getMatch` entity.

## How edits are saved

### Scores and manual totals (round grid)

- Cells do **not** call `mutate` directly. They call **`writeQueue.enqueueRoundScore`** or **`writeQueue.enqueueTotalScore`**.
- **Queue**: [`use-scoresheet-write-queue.ts`](../../../hooks/match/scoresheet/use-scoresheet-write-queue.ts) uses TanStack Pacer **`useAsyncQueuer`** with **`concurrency: 1`**, so at most one mutation runs at a time for that table. Pending work is **`mutateAsync`** on:
  - `match.update.updateMatchRoundScore`
  - `match.update.updateMatchPlayerScore`
- **Unmount**: the queue’s `onUnmount` calls **`flush()`** so in-flight debounced UI changes still try to drain before teardown.
- **Optimistic UI + invalidation**: implemented in [`hooks/mutations/match/scoresheet.tsx`](../../../hooks/mutations/match/scoresheet.tsx) — `onMutate` patches `getMatchPlayersAndTeams` via helpers in [`hooks/match/cache/patch-players-and-teams-cache.ts`](../../../hooks/match/cache/patch-players-and-teams-cache.ts); `onSettled` uses `queryClient.isMutating() <= 1` before invalidating so overlapping updates do not refetch stale data over a newer optimistic state.

### Numeric / checkbox cell behavior

- **`NumberInput`** ([`number-input.tsx`](../../number-input.tsx)): local string state, **`useDebouncedCallback`** (Pacer) on change, **immediate** `onValueChange` on **blur** so leaving the field commits without waiting for the debounce timer.
- [**DebouncedCheckbox**](../../debounced-checkbox.tsx): local checked state synced from props when the server/cache updates; debounced callback with **flush on unmount** so a quick navigation still persists the last toggle when possible.

### Comment and per-player/team details (dialogs)

- Shared primitive: **[`match-text-field-dialog.tsx`](../match-text-field-dialog.tsx)** — collapsed “fake input”, **TanStack Form** `form.Field` **`listeners.onChange` + `onChangeDebounceMs`**, status line (**Saving… / Unsaved changes / Saved**), **Done** (flush + close), **Cancel** (reset + close). No `useRef` for autosave bookkeeping.
- **`CommentDialog`**: wraps the primitive with **`updateMatchComment`**; **`canEdit`** when `match.type === "original"` or shared **`permissions === "edit"`**. Optimistic **`patchMatchQueryData`** on `getMatch` ([`patch-match-cache.ts`](../../../hooks/match/cache/patch-match-cache.ts)).
- **`DetailDialog`**: same primitive with **`updateMatchDetails`**; team cells use match-level edit; player cells use **`matchCanEdit && player.permissions === "edit"`**. Optimistic patch via **`applyMatchDetailsOptimisticPatch`**.

Rollout notes: [`match-text-fields-rollout.md`](../match-text-fields-rollout.md).

### Other actions (not autosaved)

- Finish match, manual winner, tie-breaker placements, add round, edit team/player, images — **explicit submit** dialogs or buttons; they use the relevant mutations in `scoresheet.tsx` / sibling hooks.

## File map

| Area                                   | Location                                                                                                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page + footer + manual sheet           | [`scoresheet.tsx`](../scoresheet.tsx)                                                                                                                                                                                                                       |
| Main grid                              | [`table.tsx`](./table.tsx)                                                                                                                                                                                                                                  |
| Serial score queue                     | [`use-scoresheet-write-queue.ts`](../../../hooks/match/scoresheet/use-scoresheet-write-queue.ts)                                                                                                                                                            |
| Score + comment + details mutations    | [`scoresheet.tsx`](../../../hooks/mutations/match/scoresheet.tsx) (mutations), [`patch-players-and-teams-cache.ts`](../../../hooks/match/cache/patch-players-and-teams-cache.ts), [`patch-match-cache.ts`](../../../hooks/match/cache/patch-match-cache.ts) |
| Debounce constants                     | [`constants.ts`](../../../hooks/match/autosave/constants.ts)                                                                                                                                                                                                |
| Legacy autosave hook (other use cases) | [`use-autosave-text-field.ts`](../../../hooks/match/autosave/use-autosave-text-field.ts)                                                                                                                                                                    |
| Query wrappers                         | [`hooks/queries/match/match.tsx`](../../../hooks/queries/match/match.tsx)                                                                                                                                                                                   |
| tRPC client (HTTP batch + stream)      | [`trpc/react.tsx`](../../../trpc/react.tsx)                                                                                                                                                                                                                 |

## Tests

- Component tests with mocked data/mutations: [`table.test.tsx`](./table.test.tsx), [`CommentDialog.test.tsx`](./CommentDialog.test.tsx), [`DetailDialog.test.tsx`](./DetailDialog.test.tsx).
- Mutation cache behavior: [`scoresheet-hooks.test.tsx`](../../../hooks/mutations/match/scoresheet-hooks.test.tsx).
- End-to-end flows: `packages/playwright-web` (match/scoresheet specs).

## Future (optional product/API change)

- A **single domain mutation** (e.g. `applyScoresheetPatch` with many cell ops in **one DB transaction**) is still a different lever from tRPC’s **HTTP** batching: it changes **server semantics** (atomicity, one validation pass), not whether the transport batches parallel requests. The current design keeps **separate** procedures and a **serial client queue** for correctness.
