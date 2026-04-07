import type { RouterInputs } from "@board-games/api";

import { getShareMatchList, mockMatchIdKey } from "./share-preview";
import type { GameToShare, Permission, ShareGameFormValues } from "./types";

type FriendsRequestShareGameInput = Extract<
  RouterInputs["sharing"]["requestShareGame"],
  { type: "friends" }
>;

const buildScoresheetsToShare = (args: {
  values: ShareGameFormValues;
  gameData: GameToShare;
  recipientPermission: Permission;
  adv: ShareGameFormValues["advancedPerUser"][string] | undefined;
}): { scoresheetId: number; permission: Permission }[] => {
  const { values, gameData, recipientPermission, adv } = args;
  if (values.shareOptions.scoresheets) {
    const out: { scoresheetId: number; permission: Permission }[] = [];
    for (const s of gameData.scoresheets) {
      const id = String(s.id);
      if (!values.scoresheetInclusion[id]) continue;
      const perm =
        values.sharingMode === "basic"
          ? recipientPermission
          : (adv?.scoresheetPermissions[id] ?? "view");
      out.push({ scoresheetId: s.id, permission: perm });
    }
    if (out.length === 0) {
      throw new Error("Select at least one scoresheet.");
    }
    return out;
  }
  if (gameData.scoresheets.length === 0) {
    throw new Error(
      "This game has no scoresheets; sharing cannot be submitted.",
    );
  }
  return [{ scoresheetId: gameData.scoresheets[0]!.id, permission: "view" }];
};

const buildGameRolesToShare = (args: {
  values: ShareGameFormValues;
  gameData: GameToShare;
  recipientPermission: Permission;
  adv: ShareGameFormValues["advancedPerUser"][string] | undefined;
}): NonNullable<
  FriendsRequestShareGameInput["friends"][number]["gameRolesToShare"]
> => {
  const { values, gameData, recipientPermission, adv } = args;
  if (!values.shareOptions.roles) return [];
  const out: NonNullable<
    FriendsRequestShareGameInput["friends"][number]["gameRolesToShare"]
  > = [];
  for (const r of gameData.gameRoles) {
    const id = String(r.id);
    if (!values.roleInclusion[id]) continue;
    const perm =
      values.sharingMode === "basic"
        ? recipientPermission
        : (adv?.rolePermissions[id] ?? "view");
    out.push({ gameRoleId: r.id, permission: perm });
  }
  return out;
};

const buildSharedMatches = (args: {
  values: ShareGameFormValues;
  gameData: GameToShare;
  recipientPermission: Permission;
  adv: ShareGameFormValues["advancedPerUser"][string] | undefined;
}): FriendsRequestShareGameInput["friends"][number]["sharedMatches"] => {
  const { values, gameData, recipientPermission, adv } = args;
  if (!values.shareOptions.matches) return [];

  const out: FriendsRequestShareGameInput["friends"][number]["sharedMatches"] =
    [];
  for (const m of getShareMatchList(gameData)) {
    const key = mockMatchIdKey(m.id);
    const row = values.matches[key];
    if (!row?.included) continue;

    let permission: Permission;
    let includePlayers = row.includePlayers;
    let playerIds: number[] | undefined;

    if (values.sharingMode === "basic") {
      permission = recipientPermission;
      playerIds = undefined;
    } else {
      permission = adv?.matchPermissions[key] ?? "view";
      const sync = adv?.matchPlayerSyncWithMatch[key] ?? true;
      if (!includePlayers) {
        includePlayers = false;
      } else if (!sync) {
        const per = adv?.matchPlayerPermissions[key] ?? {};
        const ids = m.players
          .filter((p) => per[String(p.playerId)] !== undefined)
          .map((p) => p.playerId);
        if (ids.length === 0) {
          includePlayers = false;
        } else {
          playerIds = ids;
        }
      } else {
        playerIds = undefined;
      }
    }

    out.push({
      matchId: m.id,
      permission,
      includePlayers,
      includeLocation: row.includeLocation,
      playerIds: playerIds?.length ? playerIds : undefined,
    });
  }
  return out;
};

/**
 * Single `requestShareGame` call with per-recipient matches, scoresheets, roles, and root permission.
 */
export const buildRequestShareGameInput = (args: {
  gameId: number;
  gameData: GameToShare;
  values: ShareGameFormValues;
}): FriendsRequestShareGameInput => {
  const { gameId, gameData, values } = args;

  const friends = values.recipients.map((recipient) => {
    const adv =
      values.sharingMode === "advanced"
        ? values.advancedPerUser[recipient.userId]
        : undefined;

    const rootPermission: Permission =
      values.sharingMode === "basic"
        ? recipient.permission
        : (adv?.game ?? "view");

    return {
      id: recipient.userId,
      permission: rootPermission,
      sharedMatches: buildSharedMatches({
        values,
        gameData,
        recipientPermission: recipient.permission,
        adv,
      }),
      scoresheetsToShare: buildScoresheetsToShare({
        values,
        gameData,
        recipientPermission: recipient.permission,
        adv,
      }),
      gameRolesToShare: buildGameRolesToShare({
        values,
        gameData,
        recipientPermission: recipient.permission,
        adv,
      }),
    };
  });

  return {
    type: "friends",
    gameId,
    friends,
  };
};
