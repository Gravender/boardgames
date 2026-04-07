import { format } from "date-fns";

import {
  findShareMatch,
  locationDisplayNameForPermissionKey,
  locationPermissionKeyForMatch,
  scoresheetPlayersFromPreview,
} from "./share-preview";
import {
  SHARE_GAME_FORM_WARNING_MESSAGES,
  safeParseShareGameFormSubmit,
  shareSubmitIssuesToValidationSections,
} from "./share-game-form-schema";
import type {
  FriendRow,
  GameData,
  Permission,
  ShareGameFormValues,
  ShareValidationSections,
  SharingMode,
} from "./types";

export type MatchPlayerWithoutPlayerIssue = {
  userId: string;
  /** `playerId` strings (same keys as scoresheet player permissions). */
  playerIds: string[];
};

/**
 * Recipients whose match seats are shared but the same people are not shared
 * under Players (scoresheets).
 */
export const deriveMatchPlayerWithoutPlayerIssues = (
  values: ShareGameFormValues,
  gameData: GameData,
): MatchPlayerWithoutPlayerIssue[] => {
  if (values.sharingMode !== "advanced") return [];
  if (!values.shareOptions.matches || !values.shareOptions.scoresheets) {
    return [];
  }

  const out: MatchPlayerWithoutPlayerIssue[] = [];

  for (const r of values.recipients) {
    const adv = values.advancedPerUser[r.userId];
    if (!adv) continue;

    const playerIds = new Set<string>();

    for (const [matchId, row] of Object.entries(values.matches)) {
      if (!row.included) continue;
      const m = findShareMatch(gameData, matchId);
      if (!m) continue;

      const sync = adv.matchPlayerSyncWithMatch[matchId] ?? true;
      for (const p of m.players) {
        const pid = String(p.playerId);
        const seatPerm: Permission = sync
          ? (adv.matchPermissions[matchId] ?? "view")
          : (adv.matchPlayerPermissions[matchId]?.[pid] ?? "view");

        const playerSharedOnScoresheet =
          adv.scoresheetPlayerPermissions[pid] === "view" ||
          adv.scoresheetPlayerPermissions[pid] === "edit";

        if (
          (seatPerm === "view" || seatPerm === "edit") &&
          !playerSharedOnScoresheet
        ) {
          playerIds.add(pid);
        }
      }
    }

    if (playerIds.size > 0) {
      out.push({ userId: r.userId, playerIds: [...playerIds] });
    }
  }

  return out;
};

export const deriveMatchPlayerWithoutPlayerWarning = (
  values: ShareGameFormValues,
  gameData: GameData,
): boolean => deriveMatchPlayerWithoutPlayerIssues(values, gameData).length > 0;

export type SummaryDerived = {
  recipientCount: number;
  rolesIncluded: boolean;
  scoresheetsIncluded: boolean;
  selectedMatchCount: number;
  matchesWithPlayersCount: number;
  matchesWithLocationsCount: number;
  showPlayersWarning: boolean;
  /**
   * Advanced: a match seat is shared (shared_match_player) but the same person
   * is “Not shared” under scoresheet Players (shared_player / scoresheet list).
   */
  showMatchPlayerWithoutPlayerWarning: boolean;
};

/** Dense preview of concrete names for the summary sidebar. */
export type ShareSummaryCompact = {
  sharingMode: SharingMode;
  recipientNames: string[];
  roleNamesIncluded: string[];
  scoresheetNamesIncluded: string[];
  /** Advanced mode: players shared with scoresheets — label includes permission (union: edit wins). */
  playerShareLabels: string[];
  matchSummaries: Array<{ name: string; subtitle?: string }>;
  /** Distinct location names included with at least one match. */
  locationsShared: string[];
  /** Players shared via match selections (basic or advanced). */
  matchPlayerNamesIncluded: string[];
};

export const deriveShareSummary = (
  values: ShareGameFormValues,
  gameData: GameData,
): SummaryDerived => {
  const recipientCount = values.recipients.length;
  const rolesIncluded =
    values.shareOptions.roles &&
    Object.values(values.roleInclusion).some(Boolean);
  const scoresheetsIncluded =
    values.shareOptions.scoresheets &&
    Object.values(values.scoresheetInclusion).some(Boolean);

  let selectedMatchCount = 0;
  let matchesWithPlayersCount = 0;
  let matchesWithLocationsCount = 0;
  let includedWithoutPlayers = false;

  for (const [matchId, row] of Object.entries(values.matches)) {
    if (!row.included) continue;
    selectedMatchCount += 1;

    if (values.sharingMode === "advanced") {
      const anyRecipientHasPlayers = values.recipients.some((r) => {
        const adv = values.advancedPerUser[r.userId];
        if (!adv) return false;
        if (adv.matchPlayerSyncWithMatch[matchId] ?? true) return true;
        return (
          Object.keys(adv.matchPlayerPermissions[matchId] ?? {}).length > 0
        );
      });
      const everyRecipientEmpty =
        values.recipients.length > 0 &&
        values.recipients.every((r) => {
          const adv = values.advancedPerUser[r.userId];
          if (!adv) return true;
          if (adv.matchPlayerSyncWithMatch[matchId] ?? true) return false;
          return (
            Object.keys(adv.matchPlayerPermissions[matchId] ?? {}).length === 0
          );
        });
      if (anyRecipientHasPlayers) {
        matchesWithPlayersCount += 1;
      }
      if (everyRecipientEmpty) {
        includedWithoutPlayers = true;
      }
    } else {
      if (row.includePlayers) {
        matchesWithPlayersCount += 1;
      } else {
        includedWithoutPlayers = true;
      }
    }

    if (row.includeLocation) {
      matchesWithLocationsCount += 1;
    }
  }

  return {
    recipientCount,
    rolesIncluded,
    scoresheetsIncluded,
    selectedMatchCount,
    matchesWithPlayersCount,
    matchesWithLocationsCount,
    showPlayersWarning:
      values.shareOptions.matches &&
      selectedMatchCount > 0 &&
      includedWithoutPlayers,
    showMatchPlayerWithoutPlayerWarning: deriveMatchPlayerWithoutPlayerWarning(
      values,
      gameData,
    ),
  };
};

/**
 * Non-blocking warnings aligned with {@link deriveShareSummary} (for copy / tooling).
 */
export const getShareGameFormWarningMessages = (
  values: ShareGameFormValues,
  gameData: GameData,
): string[] => {
  const d = deriveShareSummary(values, gameData);
  const out: string[] = [];
  if (d.showPlayersWarning) {
    out.push(SHARE_GAME_FORM_WARNING_MESSAGES.matchesWithoutPlayers);
  }
  if (d.showMatchPlayerWithoutPlayerWarning) {
    out.push(SHARE_GAME_FORM_WARNING_MESSAGES.matchSeatWithoutScoresheetPlayer);
  }
  return out;
};

/**
 * Issues grouped by share UI section (for inline highlights).
 * Uses the same Zod rules as {@link createShareGameFormSubmitSchema} / TanStack Form `onSubmit`.
 */
export const getShareValidationSections = (
  values: ShareGameFormValues,
  gameData: GameData,
): ShareValidationSections => {
  const parsed = safeParseShareGameFormSubmit(values, gameData);
  if (parsed.success) {
    return { recipients: [], scoresheets: [], matches: [] };
  }
  return shareSubmitIssuesToValidationSections(parsed.error.issues);
};

/** First section anchor to scroll to when inline validation is shown (order: recipients → scoresheets → matches). */
export const firstInvalidShareSectionId = (
  sections: ShareValidationSections,
): string | null => {
  if (sections.recipients.length > 0) return "share-section-recipients";
  if (sections.scoresheets.length > 0) return "share-section-scoresheets";
  if (sections.matches.length > 0) return "share-section-matches";
  return null;
};

/** Flat list for summaries (deduped). */
export const getShareValidationErrors = (
  values: ShareGameFormValues,
  gameData: GameData,
): string[] => {
  const s = getShareValidationSections(values, gameData);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const msg of [...s.recipients, ...s.scoresheets, ...s.matches]) {
    if (seen.has(msg)) continue;
    seen.add(msg);
    out.push(msg);
  }
  return out;
};

export const canSubmitShare = (
  values: ShareGameFormValues,
  gameData: GameData,
): boolean => getShareValidationErrors(values, gameData).length === 0;

export const deriveShareSummaryCompact = (
  values: ShareGameFormValues,
  gameData: GameData,
  friends: FriendRow[],
): ShareSummaryCompact => {
  const recipientNames = values.recipients.map((r) => {
    const f = friends.find((u) => u.id === r.userId);
    return f?.name ?? r.userId;
  });

  const roleNamesIncluded: string[] = [];
  if (values.shareOptions.roles) {
    for (const [id, on] of Object.entries(values.roleInclusion)) {
      if (!on) continue;
      const role = gameData.gameRoles.find((gr) => String(gr.id) === id);
      if (role) roleNamesIncluded.push(role.name);
    }
    roleNamesIncluded.sort((a, b) => a.localeCompare(b));
  }

  const scoresheetNamesIncluded: string[] = [];
  if (values.shareOptions.scoresheets) {
    for (const [id, on] of Object.entries(values.scoresheetInclusion)) {
      if (!on) continue;
      const sheet = gameData.scoresheets.find((s) => String(s.id) === id);
      if (sheet) scoresheetNamesIncluded.push(sheet.name);
    }
    scoresheetNamesIncluded.sort((a, b) => a.localeCompare(b));
  }

  const sheetPlayers = scoresheetPlayersFromPreview(gameData);

  const playerShareLabels: string[] = [];
  if (values.shareOptions.scoresheets && values.sharingMode === "advanced") {
    const playerMaxPerm = new Map<string, Permission>();
    for (const r of values.recipients) {
      const adv = values.advancedPerUser[r.userId];
      const perms = adv?.scoresheetPlayerPermissions ?? {};
      for (const [pid, perm] of Object.entries(perms)) {
        const prev = playerMaxPerm.get(pid);
        if (!prev || perm === "edit") playerMaxPerm.set(pid, perm);
      }
    }
    for (const [pid, perm] of playerMaxPerm) {
      const p = sheetPlayers.find((x) => x.id === pid);
      if (p) {
        playerShareLabels.push(
          `${p.name} · ${perm === "edit" ? "Edit" : "View"}`,
        );
      }
    }
    playerShareLabels.sort((a, b) => a.localeCompare(b));
  }

  const matchSummaries: ShareSummaryCompact["matchSummaries"] = [];
  const locationPermissionKeys = new Set<string>();
  const matchPlayerIdsIncluded = new Set<string>();

  const playerNameById = new Map(
    sheetPlayers.map((sp) => [sp.id, sp.name] as const),
  );

  if (values.shareOptions.matches) {
    for (const [matchId, row] of Object.entries(values.matches)) {
      if (!row.included) continue;
      const m = findShareMatch(gameData, matchId);
      if (!m) continue;
      matchSummaries.push({
        name: m.name,
        subtitle: format(m.date, "MMM d, yyyy"),
      });
      if (row.includeLocation) {
        const locKey = locationPermissionKeyForMatch(m);
        if (locKey) locationPermissionKeys.add(locKey);
      }

      if (values.sharingMode === "basic") {
        if (row.includePlayers) {
          for (const p of m.players) {
            matchPlayerIdsIncluded.add(String(p.playerId));
          }
        }
      } else {
        for (const r of values.recipients) {
          const adv = values.advancedPerUser[r.userId];
          if (!adv) continue;
          if (adv.matchPlayerSyncWithMatch[matchId] ?? true) {
            for (const p of m.players) {
              matchPlayerIdsIncluded.add(String(p.playerId));
            }
          } else {
            const rowPerms = adv.matchPlayerPermissions[matchId] ?? {};
            for (const p of m.players) {
              if (rowPerms[String(p.playerId)] !== undefined) {
                matchPlayerIdsIncluded.add(String(p.playerId));
              }
            }
          }
        }
      }
    }
  }

  const locationsShared = [...locationPermissionKeys]
    .map((k) => locationDisplayNameForPermissionKey(k, gameData))
    .toSorted((a, b) => a.localeCompare(b));

  const matchPlayerNamesIncluded = [...matchPlayerIdsIncluded]
    .map((id) => playerNameById.get(id) ?? id)
    .toSorted((a, b) => a.localeCompare(b));

  return {
    sharingMode: values.sharingMode,
    recipientNames,
    roleNamesIncluded,
    scoresheetNamesIncluded,
    playerShareLabels,
    matchSummaries,
    locationsShared,
    matchPlayerNamesIncluded,
  };
};
