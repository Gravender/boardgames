import { useQueryClient } from "@tanstack/react-query";

import { useAppForm } from "~/hooks/form";
import { toast } from "@board-games/ui/toast";
import { useTRPC } from "~/trpc/react";

import { buildRequestShareGameInput } from "./share-request-map";
import {
  createInitialFormValues,
  createShareGameSubmitValidators,
} from "./share-game-form-schema";
import { SHARE_GAME_CHILD_FORM_OPTIONS } from "./share-with-form-defaults";
import {
  collapseAdvancedToBasicPermission,
  createDefaultAdvancedUser,
  findShareMatch,
  getMatchIdKeys,
  getRecentMatchIdKeys,
  getShareMatchList,
  locationPermissionKeyForMatch,
  mockMatchIdKey,
  scoresheetPlayersFromPreview,
} from "./share-preview";
import type {
  AdvancedUserShare,
  FriendRow,
  GameData,
  Permission,
  ShareGameFormValues,
} from "./types";

type RequestShareGameMutation = ReturnType<
  typeof import("~/hooks/mutations/sharing/use-request-share-game").useRequestShareGameMutation
>["requestShareGameMutation"];

export function useShareGameForm(args: {
  gameId: number;
  gameData: GameData;
  requestShareGameMutation: RequestShareGameMutation;
}) {
  const { gameId, gameData, requestShareGameMutation } = args;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useAppForm({
    ...SHARE_GAME_CHILD_FORM_OPTIONS,
    defaultValues: createInitialFormValues(gameData),
    validators: createShareGameSubmitValidators(gameData),
    onSubmit: async ({ value }) => {
      const input = buildRequestShareGameInput({
        gameId,
        gameData,
        values: value,
      });
      await requestShareGameMutation.mutateAsync(input);
      await queryClient.invalidateQueries(
        trpc.game.getGameToShare.queryOptions({ id: gameId }),
      );
      toast.success("Share request sent");
    },
  });
}

export type ShareGameForm = ReturnType<typeof useShareGameForm>;

export const clearMatchFields = (
  gameData: GameData,
): ShareGameFormValues["matches"] => {
  const next: ShareGameFormValues["matches"] = {};
  for (const id of getMatchIdKeys(gameData)) {
    next[id] = {
      included: false,
      includePlayers: true,
      includeLocation: true,
    };
  }
  return next;
};

export const clearAdvancedMatchParticipants = (
  prev: ShareGameFormValues["advancedPerUser"],
  gameData: GameData,
): ShareGameFormValues["advancedPerUser"] => {
  const ids = getMatchIdKeys(gameData);
  const out: ShareGameFormValues["advancedPerUser"] = {};
  for (const [uid, u] of Object.entries(prev)) {
    out[uid] = {
      ...u,
      matchPlayerSyncWithMatch: Object.fromEntries(ids.map((id) => [id, true])),
      matchPlayerPermissions: Object.fromEntries(
        ids.map((id) => [id, {} as Record<string, Permission>]),
      ),
    };
  }
  return out;
};

export const handleSharingModeChange = (
  form: ShareGameForm,
  nextMode: ShareGameFormValues["sharingMode"],
  gameData: GameData,
  friends: FriendRow[],
) => {
  const current = form.state.values;
  if (nextMode === current.sharingMode) return;

  if (nextMode === "advanced") {
    const defaultsByUserId = new Map(
      friends.map((f) => [f.id, f.sharingDefaults] as const),
    );
    const advanced: ShareGameFormValues["advancedPerUser"] = {
      ...current.advancedPerUser,
    };
    for (const r of current.recipients) {
      if (advanced[r.userId]) continue;
      const fd = defaultsByUserId.get(r.userId) ?? null;
      const expectedBasic: Permission = fd?.game ?? "view";
      const useFriendGranular = fd != null && r.permission === expectedBasic;
      advanced[r.userId] = createDefaultAdvancedUser(
        r.permission,
        gameData,
        useFriendGranular ? fd : null,
      );
    }
    form.setFieldValue("sharingMode", "advanced");
    form.setFieldValue("advancedPerUser", advanced);
    return;
  }

  const recipients = current.recipients.map((r) => {
    const adv = current.advancedPerUser[r.userId];
    if (!adv) return r;
    return {
      ...r,
      permission: collapseAdvancedToBasicPermission(adv),
    };
  });
  form.setFieldValue("sharingMode", "basic");
  form.setFieldValue("recipients", recipients);
};

export const addRecipient = (
  form: ShareGameForm,
  gameData: GameData,
  friend: FriendRow,
) => {
  const current = form.state.values;
  if (current.recipients.some((r) => r.userId === friend.id)) return;

  const defaults = friend.sharingDefaults;
  const basicPermission: Permission = defaults?.game ?? "view";

  form.setFieldValue("recipients", [
    ...current.recipients,
    { userId: friend.id, permission: basicPermission },
  ]);

  if (current.sharingMode === "advanced") {
    form.setFieldValue("advancedPerUser", {
      ...current.advancedPerUser,
      [friend.id]: createDefaultAdvancedUser(
        basicPermission,
        gameData,
        defaults,
      ),
    });
  }
};

export const removeRecipient = (form: ShareGameForm, userId: string) => {
  const current = form.state.values;
  form.setFieldValue(
    "recipients",
    current.recipients.filter((r) => r.userId !== userId),
  );
  if (current.sharingMode === "advanced") {
    const { [userId]: _, ...rest } = current.advancedPerUser;
    form.setFieldValue("advancedPerUser", rest);
  }
};

/**
 * Whether every applicable advanced permission matches, or they differ.
 */
export const computeAdvancedBulkTier = (
  adv: AdvancedUserShare,
  values: ShareGameFormValues,
  gameData: GameData,
): Permission | "mixed" => {
  const levels: Array<Permission | "none"> = [adv.game];
  const { shareOptions, roleInclusion, scoresheetInclusion, matches } = values;
  const sheetPlayers = scoresheetPlayersFromPreview(gameData);

  if (shareOptions.roles) {
    for (const r of gameData.gameRoles) {
      if (roleInclusion[String(r.id)]) {
        levels.push(adv.rolePermissions[String(r.id)] ?? "view");
      }
    }
  }
  if (shareOptions.scoresheets) {
    for (const s of gameData.scoresheets) {
      if (scoresheetInclusion[String(s.id)]) {
        levels.push(adv.scoresheetPermissions[String(s.id)] ?? "view");
      }
    }
  }
  if (shareOptions.matches) {
    for (const m of getShareMatchList(gameData)) {
      const key = mockMatchIdKey(m.id);
      const row = matches[key];
      if (row?.included) {
        levels.push(adv.matchPermissions[key] ?? "view");
        const sync = adv.matchPlayerSyncWithMatch[key] ?? true;
        if (!sync) {
          for (const p of m.players) {
            levels.push(
              adv.matchPlayerPermissions[key]?.[String(p.playerId)] ?? "view",
            );
          }
        }
      }
      if (row?.included && row.includeLocation) {
        const locKey = locationPermissionKeyForMatch(m);
        if (locKey) {
          levels.push(adv.locationPermissions[locKey] ?? "view");
        }
      }
    }
  }
  if (shareOptions.scoresheets) {
    for (const p of sheetPlayers) {
      const v = adv.scoresheetPlayerPermissions[p.id];
      levels.push(v === "view" || v === "edit" ? v : "none");
    }
  }

  if (levels.every((p) => p === "view")) return "view";
  if (levels.every((p) => p === "edit")) return "edit";
  return "mixed";
};

/** Sets game, roles, scoresheets, matches, locations, and scoresheet players for one user to the same level. */
export const applyAdvancedBulkPermission = (
  form: ShareGameForm,
  userId: string,
  permission: Permission,
  gameData: GameData,
) => {
  const values = form.state.values;
  const adv = values.advancedPerUser[userId];
  if (!adv) return;

  const rolePermissions = { ...adv.rolePermissions };
  for (const r of gameData.gameRoles) {
    if (values.roleInclusion[String(r.id)]) {
      rolePermissions[String(r.id)] = permission;
    }
  }

  const scoresheetPermissions = { ...adv.scoresheetPermissions };
  for (const s of gameData.scoresheets) {
    if (values.scoresheetInclusion[String(s.id)]) {
      scoresheetPermissions[String(s.id)] = permission;
    }
  }

  const matchPermissions = { ...adv.matchPermissions };
  for (const m of getShareMatchList(gameData)) {
    const key = mockMatchIdKey(m.id);
    if (values.matches[key]?.included) {
      matchPermissions[key] = permission;
    }
  }

  const locationPermissions = { ...adv.locationPermissions };
  for (const m of getShareMatchList(gameData)) {
    const key = mockMatchIdKey(m.id);
    const row = values.matches[key];
    if (row?.included && row.includeLocation) {
      const locKey = locationPermissionKeyForMatch(m);
      if (locKey) {
        locationPermissions[locKey] = permission;
      }
    }
  }

  const scoresheetPlayerPermissions = { ...adv.scoresheetPlayerPermissions };
  for (const p of scoresheetPlayersFromPreview(gameData)) {
    scoresheetPlayerPermissions[p.id] = permission;
  }

  const matchPlayerSyncWithMatch = { ...adv.matchPlayerSyncWithMatch };
  const matchPlayerPermissions = { ...adv.matchPlayerPermissions };
  for (const m of getShareMatchList(gameData)) {
    const key = mockMatchIdKey(m.id);
    if (!values.matches[key]?.included) continue;
    matchPlayerSyncWithMatch[key] = true;
    const inner = { ...matchPlayerPermissions[key] };
    for (const p of m.players) {
      inner[String(p.playerId)] = permission;
    }
    matchPlayerPermissions[key] = inner;
  }

  form.setFieldValue("advancedPerUser", {
    ...values.advancedPerUser,
    [userId]: {
      ...adv,
      game: permission,
      rolePermissions,
      scoresheetPermissions,
      matchPermissions,
      locationPermissions,
      scoresheetPlayerPermissions,
      matchPlayerSyncWithMatch,
      matchPlayerPermissions,
    },
  });
};

export const selectAllMatches = (form: ShareGameForm, gameData: GameData) => {
  const current = form.state.values;
  const next = { ...current.matches };
  const ids = getMatchIdKeys(gameData);
  for (const id of ids) {
    const row = next[id];
    if (!row) continue;
    next[id] = {
      included: true,
      includePlayers: true,
      includeLocation: true,
    };
  }
  form.setFieldValue("matches", next);
  ensureScoresheetsForIncludedMatchKeys(form, ids, gameData);
  if (current.sharingMode === "advanced") {
    syncAdvancedParticipantsForMatches(form, next, gameData);
  }
};

/** Select every match currently visible after search / status / scoresheet filters. */
export const selectFilteredMatches = (
  form: ShareGameForm,
  matchIdKeys: string[],
  gameData: GameData,
) => {
  const current = form.state.values;
  const next = { ...current.matches };
  for (const id of matchIdKeys) {
    const row = next[id];
    if (!row) continue;
    next[id] = {
      included: true,
      includePlayers: true,
      includeLocation: true,
    };
  }
  form.setFieldValue("matches", next);
  ensureScoresheetsForIncludedMatchKeys(form, matchIdKeys, gameData);
  if (current.sharingMode === "advanced") {
    syncAdvancedParticipantsForMatches(form, next, gameData);
  }
};

export const clearAllMatches = (form: ShareGameForm, gameData: GameData) => {
  const current = form.state.values;
  form.setFieldValue("matches", clearMatchFields(gameData));
  form.setFieldValue(
    "advancedPerUser",
    clearAdvancedMatchParticipants(current.advancedPerUser, gameData),
  );
};

export const selectRecentMatches = (
  form: ShareGameForm,
  gameData: GameData,
) => {
  const current = form.state.values;
  const next = clearMatchFields(gameData);
  const recentIds = getRecentMatchIdKeys(gameData);
  for (const id of recentIds) {
    next[id] = {
      included: true,
      includePlayers: true,
      includeLocation: true,
    };
  }
  form.setFieldValue("matches", next);
  ensureScoresheetsForIncludedMatchKeys(form, recentIds, gameData);
  if (current.sharingMode === "advanced") {
    syncAdvancedParticipantsForMatches(form, next, gameData);
  }
};

function ensureScoresheetsForIncludedMatchKeys(
  form: ShareGameForm,
  matchIdKeys: string[],
  gameData: GameData,
) {
  const current = form.state.values;
  const next = { ...current.scoresheetInclusion };
  let changed = false;
  for (const key of matchIdKeys) {
    const m = findShareMatch(gameData, key);
    if (!m) continue;
    const sid = String(m.scoresheetId);
    if (next[sid] !== true) {
      next[sid] = true;
      changed = true;
    }
  }
  if (changed) {
    form.setFieldValue("scoresheetInclusion", next);
  }
}

function syncAdvancedParticipantsForMatches(
  form: ShareGameForm,
  matches: ShareGameFormValues["matches"],
  gameData: GameData,
) {
  const current = form.state.values;
  const advanced: ShareGameFormValues["advancedPerUser"] = {
    ...current.advancedPerUser,
  };
  for (const [uid, u] of Object.entries(advanced)) {
    const mpSync = { ...u.matchPlayerSyncWithMatch };
    const mpPerms = { ...u.matchPlayerPermissions };
    for (const m of getShareMatchList(gameData)) {
      const key = mockMatchIdKey(m.id);
      if (matches[key]?.included) {
        mpSync[key] = mpSync[key] ?? true;
        const inner = { ...mpPerms[key] };
        const mp = u.matchPermissions[key] ?? "view";
        for (const p of m.players) {
          if (inner[String(p.playerId)] === undefined) {
            inner[String(p.playerId)] = mp;
          }
        }
        mpPerms[key] = inner;
      } else {
        mpSync[key] = true;
        mpPerms[key] = {};
      }
    }
    advanced[uid] = {
      ...u,
      matchPlayerSyncWithMatch: mpSync,
      matchPlayerPermissions: mpPerms,
    };
  }
  form.setFieldValue("advancedPerUser", advanced);
}

export const onMatchIncludedChange = (
  form: ShareGameForm,
  matchId: string,
  included: boolean,
  gameData: GameData,
) => {
  const current = form.state.values;
  const row = current.matches[matchId];
  if (!row) return;
  const nextRow = included
    ? {
        included: true,
        includePlayers: true,
        includeLocation: true,
      }
    : {
        included: false,
        includePlayers: row.includePlayers,
        includeLocation: row.includeLocation,
      };

  form.setFieldValue("matches", {
    ...current.matches,
    [matchId]: nextRow,
  });

  if (included) {
    const shareMatch = findShareMatch(gameData, matchId);
    if (shareMatch) {
      const sid = String(shareMatch.scoresheetId);
      if (current.scoresheetInclusion[sid] !== true) {
        form.setFieldValue("scoresheetInclusion", {
          ...current.scoresheetInclusion,
          [sid]: true,
        });
      }
    }
  }

  if (current.sharingMode === "advanced") {
    const advanced = { ...current.advancedPerUser };
    const match = findShareMatch(gameData, matchId);
    for (const uid of Object.keys(advanced)) {
      const u = advanced[uid];
      if (!u) continue;
      const mpSync = { ...u.matchPlayerSyncWithMatch };
      const mpPerms = { ...u.matchPlayerPermissions };
      if (included && match) {
        mpSync[matchId] = true;
        const mp = u.matchPermissions[matchId] ?? "view";
        mpPerms[matchId] = Object.fromEntries(
          match.players.map((p) => [String(p.playerId), mp]),
        );
      } else {
        mpSync[matchId] = true;
        mpPerms[matchId] = {};
      }
      advanced[uid] = {
        ...u,
        matchPlayerSyncWithMatch: mpSync,
        matchPlayerPermissions: mpPerms,
      };
    }
    form.setFieldValue("advancedPerUser", advanced);
  }
};
