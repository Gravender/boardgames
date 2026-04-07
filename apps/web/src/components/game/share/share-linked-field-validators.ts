import type { AnyFieldApi } from "@tanstack/react-form";

import { MATCH_SCORESHEET_MSG } from "./share-game-form-schema";
import {
  findShareMatch,
  getShareMatchList,
  getScoresheetNameById,
  mockMatchIdKey,
} from "./share-preview";
import type { GameData, ShareGameFormValues } from "./types";

type ListenKey =
  | `scoresheetInclusion.${string}`
  | `matches.${string}`
  | "shareOptions.matches"
  | "shareOptions.scoresheets";

/**
 * Linked validators: re-run when the match’s scoresheet inclusion, or share toggles, change
 * ([linked fields](https://tanstack.com/form/latest/docs/framework/react/guides/linked-fields)).
 *
 * `onChangeListenTo` uses exact form field names (see TanStack `FieldApi#getLinkedFields`).
 */
export const matchRowScoresheetLinkedValidators = (
  gameData: GameData,
  matchIdKey: string,
) => {
  const m = findShareMatch(gameData, matchIdKey);
  const onChangeListenTo: ListenKey[] = [
    "shareOptions.matches",
    "shareOptions.scoresheets",
  ];
  if (m) {
    onChangeListenTo.push(`scoresheetInclusion.${String(m.scoresheetId)}`);
  }
  return {
    onChangeListenTo,
    onChange: ({
      value,
      fieldApi,
    }: {
      value: ShareGameFormValues["matches"][string] | undefined;
      fieldApi: AnyFieldApi;
    }) => {
      const v = fieldApi.form.state.values as ShareGameFormValues;
      if (!v.shareOptions.matches || !v.shareOptions.scoresheets)
        return undefined;
      if (!value?.included) return undefined;
      const rowMatch = findShareMatch(gameData, matchIdKey);
      if (!rowMatch) return undefined;
      const sid = String(rowMatch.scoresheetId);
      if (v.scoresheetInclusion[sid] !== true) {
        return MATCH_SCORESHEET_MSG(
          rowMatch.name,
          getScoresheetNameById(gameData, rowMatch.scoresheetId),
        );
      }
      return undefined;
    },
  };
};

/**
 * When a scoresheet is unchecked, error if any included match still uses it.
 * Listens to each `matches.${id}` that can reference this sheet, plus share toggles.
 */
export const scoresheetInclusionLinkedValidators = (
  gameData: GameData,
  sheetIdStr: string,
) => {
  const matchKeys = getShareMatchList(gameData)
    .filter((m) => String(m.scoresheetId) === sheetIdStr)
    .map((m) => `matches.${mockMatchIdKey(m.id)}` as const);

  const onChangeListenTo: ListenKey[] = [
    "shareOptions.matches",
    "shareOptions.scoresheets",
    ...matchKeys,
  ];

  return {
    onChangeListenTo,
    onChange: ({
      value,
      fieldApi,
    }: {
      value: boolean | undefined;
      fieldApi: AnyFieldApi;
    }) => {
      const v = fieldApi.form.state.values as ShareGameFormValues;
      if (!v.shareOptions.matches || !v.shareOptions.scoresheets)
        return undefined;
      if (value === true) return undefined;
      for (const [mid, row] of Object.entries(v.matches)) {
        if (!row.included) continue;
        const matchRow = findShareMatch(gameData, mid);
        if (matchRow && String(matchRow.scoresheetId) === sheetIdStr) {
          return MATCH_SCORESHEET_MSG(
            matchRow.name,
            getScoresheetNameById(gameData, matchRow.scoresheetId),
          );
        }
      }
      return undefined;
    },
  };
};
