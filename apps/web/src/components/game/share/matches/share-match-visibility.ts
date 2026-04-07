import { getShareMatchList, mockMatchIdKey } from "../share-preview";
import type { GameData } from "../types";
import {
  sortShareMatches,
  type GameToShareMatch,
  type ShareMatchSortId,
} from "../share-match-detail";
import type { ShareGameFormValues } from "../types";

export type MatchFilterId =
  | "all"
  | "finished"
  | "unfinished"
  | "with_location"
  | "without_location";

export const MATCH_SORT_OPTIONS: { value: ShareMatchSortId; label: string }[] =
  [
    { value: "date_desc", label: "Date (newest first)" },
    { value: "date_asc", label: "Date (oldest first)" },
    { value: "status_finished_first", label: "Status (finished first)" },
    { value: "players_desc", label: "Players (most)" },
    { value: "players_asc", label: "Players (fewest)" },
    { value: "location_asc", label: "Location (A–Z)" },
    { value: "name_asc", label: "Name (A–Z)" },
  ];

export const MATCH_FILTER_OPTIONS: { value: MatchFilterId; label: string }[] = [
  { value: "all", label: "All sessions" },
  { value: "finished", label: "Finished" },
  { value: "unfinished", label: "In progress" },
  { value: "with_location", label: "Has location" },
  { value: "without_location", label: "No location" },
];

export const matchSortLabel = (id: ShareMatchSortId) =>
  MATCH_SORT_OPTIONS.find((o) => o.value === id)?.label ?? id;

export const matchFilterLabel = (id: MatchFilterId) =>
  MATCH_FILTER_OPTIONS.find((o) => o.value === id)?.label ?? id;

/** Sheet counts as shared if checked, or if an included match uses it (auto-include on match select). */
export const isScoresheetEffectivelySharedForMatchesUi = (
  scoresheetId: number,
  scoresheetInclusion: Record<string, boolean>,
  matches: ShareGameFormValues["matches"],
  gameData: GameData,
) => {
  const sid = String(scoresheetId);
  if (scoresheetInclusion[sid] === true) return true;
  return getShareMatchList(gameData).some(
    (m) =>
      String(m.scoresheetId) === sid &&
      matches[mockMatchIdKey(m.id)]?.included === true,
  );
};

export const computeVisibleMatchesForShareUi = (
  gameData: GameData,
  matchSort: ShareMatchSortId,
  matchSearch: string,
  matchFilter: MatchFilterId,
  scoresheetInclusion: Record<string, boolean>,
  matchesSnapshot: ShareGameFormValues["matches"],
  scoresheetListFilter: "all" | string,
  showSessionsWithoutScoresheetSelection: boolean,
) => {
  let list = sortShareMatches(getShareMatchList(gameData), matchSort);
  const q = matchSearch.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.location?.name?.toLowerCase().includes(q) ?? false),
    );
  }
  switch (matchFilter) {
    case "finished":
      list = list.filter((m) => m.finished);
      break;
    case "unfinished":
      list = list.filter((m) => !m.finished);
      break;
    case "with_location":
      list = list.filter((m) => m.location != null);
      break;
    case "without_location":
      list = list.filter((m) => m.location == null);
      break;
    default:
      break;
  }
  if (scoresheetListFilter !== "all") {
    list = list.filter((m) => String(m.scoresheetId) === scoresheetListFilter);
  }
  if (!showSessionsWithoutScoresheetSelection) {
    list = list.filter((m) =>
      isScoresheetEffectivelySharedForMatchesUi(
        m.scoresheetId,
        scoresheetInclusion,
        matchesSnapshot,
        gameData,
      ),
    );
  }
  return list;
};

/**
 * Rows that drive the "not sharing sheet" header badge. Keeps the same sort and
 * "show without sheet" rule as the list, but skips search, session scope, and
 * scoresheet dropdown filters so the badge stays aligned with Scoresheets to
 * include (and matches marked included).
 */
export const computeListedMatchesForNotSharingBadge = (
  gameData: GameData,
  matchSort: ShareMatchSortId,
  scoresheetInclusion: Record<string, boolean>,
  matchesSnapshot: ShareGameFormValues["matches"],
  showSessionsWithoutScoresheetSelection: boolean,
): GameToShareMatch[] =>
  computeVisibleMatchesForShareUi(
    gameData,
    matchSort,
    "",
    "all",
    scoresheetInclusion,
    matchesSnapshot,
    "all",
    showSessionsWithoutScoresheetSelection,
  );
