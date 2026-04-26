# Scoresheet Analytics And Lifecycle

## Why scoresheet analytics are user-scoped

Scoresheet analytics are not globally canonical in this app. A shared scoresheet or shared match can mean different things to different recipients:

- one user may merge it into their local Cascadia family
- another user may keep it separate as an imported shared family
- round mappings may differ per recipient even when the shared match is the same

Because of that, analytics grouping is resolved per visible user, not from a single global root.

## Storage lineage vs analytics grouping

There are two separate concerns:

- Storage lineage tracks where data came from and how it was copied or forked.
- Analytics grouping decides which visible scoresheets and rounds count together for one user.

Storage lineage uses:

- `scoresheet.forkedFromScoresheetId`
- `scoresheet.forkedFromSharedScoresheetId`
- `round.parentId`
- `round.templateRoundId`

Analytics grouping uses:

- `shared_scoresheet.analytics_linked_scoresheet_id`
- `shared_round.analytics_linked_round_id`
- the user-scoped analytics views

Lineage answers “where did this come from?”

Analytics grouping answers “what should count together for this user?”

## How game, sharedGame, scoresheet, sharedScoresheet, match, and sharedMatch relate

- `game` is the user-owned local game.
- `shared_game` is the recipient-visible wrapper for someone else’s game.
- `scoresheet` stores both local game/original sheets and match forks.
- `shared_scoresheet` stores the recipient-visible wrapper for shared game sheets and shared match sheets.
- `match` stores the real match and always points at a local match scoresheet fork.
- `shared_match` exposes that match to a recipient and points at the recipient-visible shared match scoresheet.

For shared matches, the shared match scoresheet has `parentId` pointing to the shared game-level scoresheet. Analytics resolution uses the game-level shared scoresheet family, not each shared match scoresheet independently.

## Lifecycle: original game -> original scoresheet -> match fork

For a normal local flow:

1. A user owns a `game`.
2. The game has local/original `scoresheet` rows with type `Game` or `Default`.
3. Creating a match forks one of those into a `scoresheet` row with type `Match`.
4. Analytics group the match back under the nearest non-match local scoresheet root.

This family resolves as `linkageState = original`.

## Lifecycle: shared game -> shared scoresheet -> local original copy -> match fork

For shared content:

1. A recipient sees a `shared_game`.
2. The recipient sees a game-level `shared_scoresheet`.
3. On first match creation from that shared scoresheet, the app creates a new local/original `scoresheet` copy in the recipient’s local game.
4. The new local copy stores `forkedFromSharedScoresheetId`.
5. Shared rounds are copied into local rounds.
6. The shared scoresheet analytics link is set to that new local scoresheet.
7. Shared round analytics links are set to the copied local rounds.
8. The actual match scoresheet is then forked from that local/original copy.

This matches the product rule: first local use adopts the shared scoresheet into the recipient’s world.

## How shared scoresheet linking affects analytics

Scoresheet analytics resolution works like this:

- local/original family: group by the nearest non-match local scoresheet root
- shared and unlinked: group by `shared_scoresheet.id`
- shared and linked: group by `shared_scoresheet.analytics_linked_scoresheet_id`
- local materialized from shared: resolve through `forkedFromSharedScoresheetId`

That means two users can see the same shared match but group it differently.

## How round linking affects analytics

Round analytics are resolved separately from scoresheet analytics.

- local/original round family: nearest non-match local root round
- shared and unlinked: group by `shared_round.id`
- shared and linked: group by `shared_round.analytics_linked_round_id`

Round mappings are never inferred from round name, order, or `roundKey` alone.

Partial round linking is allowed. A shared scoresheet can be linked at the scoresheet level while some rounds still remain separate shared round families.

## What current stats endpoints now mean

The existing stats endpoints were retrofitted instead of duplicated:

- `getGameStatsHeader` now aggregates from user-visible analytics rows
- `getGamePlayerStats` now includes shared matches only when visible to the current user
- `getGameScoresheetStats` now returns analytics families, keyed by `analyticsGroupingKey`

`getGameScoresheetStats` also exposes:

- `analyticsGroupingScoresheetId`
- `analyticsGroupingScoresheetSourceType`
- `analyticsGroupingKey`
- `linkageState`
- `contributingVisibleScoresheets`
- `contributingMatchCount`

UI selectors should use `analyticsGroupingKey`, not local/shared ids directly.

## Examples

### original only

- local scoresheet `Game A / Scoresheet 1`
- three local matches fork from it
- analytics family is `local:<scoresheetId>`
- linkage state is `original`

### shared unlinked

- recipient sees shared scoresheet `Shared Cascadia`
- recipient has not linked it
- shared matches group under `shared:<shared_scoresheet.id>`
- they remain separate from local Cascadia analytics

### shared linked

- recipient links `Shared Cascadia` to local scoresheet `My Cascadia`
- shared matches now group under `local:<my_local_scoresheet_id>`
- `linkageState` becomes `shared_linked`

### same shared match grouped differently for different users

- User A links the shared scoresheet to a local copy
- User B leaves it unlinked
- the same shared match contributes to `local:<id>` for User A
- the same shared match contributes to `shared:<id>` for User B

That difference is expected and is the reason analytics grouping is user-scoped.
