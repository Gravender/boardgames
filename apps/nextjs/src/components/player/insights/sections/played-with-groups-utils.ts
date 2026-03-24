import type { GroupRow, SortKey } from "./played-with-groups-types";

export const OVERVIEW_COUNT = 5;

export const TEXT_ASC_SORT_KEYS: ReadonlySet<SortKey> = new Set<SortKey>([
  "groupKey",
]);

export const GROUP_SORT_PRESETS: {
  value: `${SortKey}:${"asc" | "desc"}`;
  label: string;
}[] = [
  { value: "matches:desc", label: "Most matches" },
  { value: "playerCount:desc", label: "Largest cohorts (player count)" },
  { value: "playerCount:asc", label: "Smallest cohorts" },
  { value: "winRate:desc", label: "Highest sweep %" },
  { value: "stability:desc", label: "Most full-table lineups" },
  { value: "uniqueGames:desc", label: "Most distinct games" },
  { value: "lastPlayed:desc", label: "Recently played" },
  { value: "lastPlayed:asc", label: "Oldest last played" },
  { value: "avgPlacement:asc", label: "Best avg placement (you)" },
  { value: "avgPlacement:desc", label: "Worst avg placement (you)" },
  { value: "avgScore:desc", label: "Highest avg score (you)" },
  { value: "avgScore:asc", label: "Lowest avg score (you)" },
  { value: "groupKey:asc", label: "Group key A–Z" },
];

export const cohortIdentityKey = (
  p: GroupRow["profileInCohort"] | GroupRow["members"][number],
): string =>
  p.type === "shared" ? `shared-${p.sharedId}` : `original-${p.id}`;

export const cohortSize = (g: GroupRow) => g.members.length + 1;

export const pct = (rate: number) => `${Math.round(rate * 100)}%`;

export const cohortLabelShort = (g: GroupRow) => {
  const cohort = [g.profileInCohort, ...g.members];
  if (cohort.length <= 2) {
    return cohort.map((p) => p.name).join(", ");
  }
  return `${cohort[0]?.name ?? ""}, ${cohort[1]?.name ?? ""} +${cohort.length - 2}`;
};

export const sortGroups = (
  list: GroupRow[],
  sortKey: SortKey,
  sortDir: "asc" | "desc",
): GroupRow[] => {
  const dir = sortDir === "asc" ? 1 : -1;
  const out = [...list];
  out.sort((a, b) => {
    switch (sortKey) {
      case "groupKey":
        return a.groupKey.localeCompare(b.groupKey) * dir;
      case "playerCount":
        return (cohortSize(a) - cohortSize(b)) * dir;
      case "matches":
        return (a.matches - b.matches) * dir;
      case "winRate":
        return (a.winRateWithGroup - b.winRateWithGroup) * dir;
      case "stability":
        return (a.stability - b.stability) * dir;
      case "uniqueGames":
        return (a.uniqueGamesPlayed - b.uniqueGamesPlayed) * dir;
      case "lastPlayed": {
        const at = a.lastPlayedAt?.getTime() ?? 0;
        const bt = b.lastPlayedAt?.getTime() ?? 0;
        return (at - bt) * dir;
      }
      case "avgPlacement": {
        const an = a.avgPlacement;
        const bn = b.avgPlacement;
        if (an === null) {
          if (bn === null) return 0;
          return 1;
        }
        if (bn === null) return -1;
        return (an - bn) * dir;
      }
      case "avgScore": {
        const an = a.avgScore;
        const bn = b.avgScore;
        if (an === null) {
          if (bn === null) return 0;
          return 1;
        }
        if (bn === null) return -1;
        return (an - bn) * dir;
      }
      default:
        return 0;
    }
  });
  return out;
};

export type { GroupRow, SortKey } from "./played-with-groups-types";
export type {
  CohortSizeFilter,
  PlayedWithGroupsData,
} from "./played-with-groups-types";
