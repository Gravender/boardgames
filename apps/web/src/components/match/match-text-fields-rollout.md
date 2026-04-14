# Match text fields — rollout notes

Shared primitive: [`match-text-field-dialog.tsx`](./match-text-field-dialog.tsx) (collapsed surface + dialog + TanStack Form **field-level** `listeners` with `onChangeDebounceMs`).

## Done (this PR)

1. **Match comment** — [`scoresheet/CommentDialog.tsx`](./scoresheet/CommentDialog.tsx); footer in [`scoresheet.tsx`](./scoresheet/scoresheet.tsx). `canEdit` from `match.type === "original" || match.permissions === "edit"`.
2. **Player / team details** — [`scoresheet/DetailDialog.tsx`](./scoresheet/DetailDialog.tsx). Table wiring in [`scoresheet/table.tsx`](./scoresheet/table.tsx): team cells use match-level edit; player cells use `matchCanEdit && player.permissions === "edit"`. Manual layout in `scoresheet.tsx` matches the same rules.

## Later

3. **Other `getMatch` / match-edit text** — e.g. name/location flows already use dedicated forms; revisit if new nullable text columns are added to the match DTO.
4. **Score / round “notes”** — not in core DB today (`match.comment`, `matchPlayer.details` are the main text fields). Needs schema + `packages/api` router → service → repo + UI last.

## Backend

Continue using existing partial mutations (`updateMatchComment`, `updateMatchDetails`, …) with TanStack Query optimistic patches; avoid invalidating whole suspense queries on every autosave batch.
