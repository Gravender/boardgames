import type { GameToShare } from "../types";

export type SheetSort = "name_asc" | "name_desc" | "type_asc";

export const SHEET_SORT_LABEL: Record<SheetSort, string> = {
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  type_asc: "Type, then name",
};

export const filterScoresheetsForShareUi = (
  scoresheets: GameToShare["scoresheets"],
  query: string,
  sort: SheetSort,
  selectedWinConditions: Set<string>,
  showCoop: boolean,
  showCompetitive: boolean,
) => {
  let list = scoresheets;
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.winCondition.toLowerCase().includes(q),
    );
  }
  list = list.filter((s) => selectedWinConditions.has(s.winCondition));
  list = list.filter((s) => {
    if (s.isCoop && !showCoop) {
      return false;
    }
    if (!s.isCoop && !showCompetitive) {
      return false;
    }
    return true;
  });
  list = [...list].toSorted((a, b) => {
    if (sort === "type_asc") {
      const t = a.type.localeCompare(b.type);
      return t !== 0 ? t : a.name.localeCompare(b.name);
    }
    const c = a.name.localeCompare(b.name);
    return sort === "name_asc" ? c : -c;
  });
  return list;
};
