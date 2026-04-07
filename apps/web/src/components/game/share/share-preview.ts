import type {
  AdvancedUserShare,
  FriendSharingDefaults,
  GameToShare,
  Permission,
} from "./types";

/**
 * One session row from `getGameToShare`. Router inference can omit some fields; the API sends them.
 */
export type GameToShareMatchRow = GameToShare["finishedMatches"][number] & {
  scoresheetId: number;
  location?: { id: number; name: string };
};

export const mockMatchIdKey = (id: number): string => String(id);

/** Matches shown in the share UI (finished then unfinished, same as legacy `matches` wiring). */
export const getShareMatchList = (
  gameData: GameToShare,
): GameToShareMatchRow[] =>
  [
    ...gameData.finishedMatches,
    ...gameData.unfinishedMatches,
  ] as GameToShareMatchRow[];

export const getMatchIdKeys = (gameData: GameToShare): string[] =>
  getShareMatchList(gameData).map((m) => mockMatchIdKey(m.id));

export const getRecentMatchIdKeys = (
  gameData: GameToShare,
  count = 5,
): string[] => getMatchIdKeys(gameData).slice(0, count);

export const scoresheetPlayersFromPreview = (
  gameData: GameToShare,
): { id: string; name: string }[] => {
  const byId = new Map<string, string>();
  for (const m of getShareMatchList(gameData)) {
    for (const p of m.players) {
      const key = String(p.playerId);
      if (!byId.has(key)) byId.set(key, p.name);
    }
  }
  return [...byId.entries()].map(([id, name]) => ({ id, name }));
};

export const getMatchCountByScoresheetId = (
  gameData: GameToShare,
): Record<number, number> => {
  const counts: Record<number, number> = {};
  for (const m of getShareMatchList(gameData)) {
    counts[m.scoresheetId] = (counts[m.scoresheetId] ?? 0) + 1;
  }
  return counts;
};

export const getScoresheetNameById = (
  gameData: GameToShare,
  scoresheetId: number,
): string => {
  const s = gameData.scoresheets.find((x) => x.id === scoresheetId);
  return s?.name ?? `Scoresheet ${scoresheetId}`;
};

export const findShareMatch = (gameData: GameToShare, matchIdKey: string) =>
  getShareMatchList(gameData).find((m) => mockMatchIdKey(m.id) === matchIdKey);

/**
 * Stable key for `locationPermissions` — stringified {@link GameToShareMatchRow.location} id.
 */
export const locationPermissionKeyForMatch = (
  m: GameToShareMatchRow,
): string | null => {
  if (m.location != null) return String(m.location.id);
  return null;
};

/** Distinct location permission keys used by at least one session in the preview. */
export const uniqueLocationPermissionKeysForShare = (
  gameData: GameToShare,
): string[] => {
  const s = new Set<string>();
  for (const m of getShareMatchList(gameData)) {
    const k = locationPermissionKeyForMatch(m);
    if (k) s.add(k);
  }
  return [...s].toSorted((a, b) => a.localeCompare(b));
};

/** Display label for a `locationPermissions` record key. */
export const locationDisplayNameForPermissionKey = (
  key: string,
  gameData: GameToShare,
): string => {
  if (key.startsWith("legacy:")) return key.slice("legacy:".length);
  const byId = gameData.locationsReferenced.find(
    (loc) => String(loc.id) === key,
  );
  return byId?.name ?? key;
};

export const getGameInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
};

/**
 * Default advanced permissions for a recipient.
 * When `sharingDefaults` is set (from {@link FriendRow.sharingDefaults}), those values
 * apply per area; roles and scoresheet definitions use the friend’s game default.
 * Otherwise every area uses `permission` (typically basic-mode tier).
 */
export const createDefaultAdvancedUser = (
  permission: Permission,
  gameData: GameToShare,
  sharingDefaults?: FriendSharingDefaults | null,
): AdvancedUserShare => {
  const permGame = sharingDefaults?.game ?? permission;
  const permMatches = sharingDefaults?.matches ?? permission;
  const permSheetPlayers = sharingDefaults?.scoresheetPlayers ?? permission;
  const permLocation = sharingDefaults?.location ?? permission;

  const matchIds = getMatchIdKeys(gameData);
  const shareList = getShareMatchList(gameData);
  const players = scoresheetPlayersFromPreview(gameData);
  const rolePermissions = Object.fromEntries(
    gameData.gameRoles.map((r) => [String(r.id), permGame]),
  );
  const scoresheetPermissions = Object.fromEntries(
    gameData.scoresheets.map((s) => [String(s.id), permGame]),
  );
  const matchPermissions = Object.fromEntries(
    matchIds.map((id) => [id, permMatches]),
  );
  const locationPermissions = Object.fromEntries(
    uniqueLocationPermissionKeysForShare(gameData).map((locKey) => [
      locKey,
      permLocation,
    ]),
  );
  return {
    permissionsVisible: true,
    game: permGame,
    rolePermissions,
    scoresheetPermissions,
    matchPermissions,
    locationPermissions,
    scoresheetPlayerPermissions: Object.fromEntries(
      players.map((p) => [p.id, permSheetPlayers]),
    ),
    matchPlayerSyncWithMatch: Object.fromEntries(
      matchIds.map((id) => [id, true]),
    ),
    matchPlayerPermissions: Object.fromEntries(
      shareList.map((m) => {
        const k = mockMatchIdKey(m.id);
        return [
          k,
          Object.fromEntries(
            m.players.map((p) => [String(p.playerId), permMatches]),
          ),
        ];
      }),
    ),
  };
};

export const collapseAdvancedToBasicPermission = (
  a: AdvancedUserShare,
): Permission => {
  if (a.game === "edit") return "edit";
  if (Object.values(a.rolePermissions).some((p) => p === "edit")) return "edit";
  if (Object.values(a.scoresheetPermissions).some((p) => p === "edit")) {
    return "edit";
  }
  if (Object.values(a.matchPermissions).some((p) => p === "edit"))
    return "edit";
  if (Object.values(a.locationPermissions).some((p) => p === "edit")) {
    return "edit";
  }
  if (Object.values(a.scoresheetPlayerPermissions).some((p) => p === "edit")) {
    return "edit";
  }
  for (const inner of Object.values(a.matchPlayerPermissions)) {
    if (Object.values(inner).some((p) => p === "edit")) return "edit";
  }
  return "view";
};
