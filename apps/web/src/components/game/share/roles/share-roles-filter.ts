import type { GameToShare } from "../types";

export type RoleFilter = "all" | "on" | "off";
export type NameSort = "name_asc" | "name_desc";

export const ROLE_FILTER_LABEL: Record<RoleFilter, string> = {
  all: "All roles",
  on: "Included only",
  off: "Not included",
};

export const ROLE_SORT_LABEL: Record<NameSort, string> = {
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
};

export const filterRolesForShareUi = (
  gameRoles: GameToShare["gameRoles"],
  query: string,
  filter: RoleFilter,
  sort: NameSort,
  roleInclusion: Record<string, boolean>,
) => {
  let list = gameRoles;
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }
  if (filter === "on") {
    list = list.filter((r) => roleInclusion[String(r.id)] === true);
  } else if (filter === "off") {
    list = list.filter((r) => roleInclusion[String(r.id)] !== true);
  }
  list = [...list].toSorted((a, b) => {
    const c = a.name.localeCompare(b.name);
    return sort === "name_asc" ? c : -c;
  });
  return list;
};
