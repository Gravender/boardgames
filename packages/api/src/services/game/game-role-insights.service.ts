import type {
  CorePlayer,
  MatchInsightData,
  MatchPlayerEntry,
  PlayerRoleEntry,
  PlayerRolePerformance,
  RoleClassification,
  RoleInsightsOutput,
  RolePresenceEffect,
  RolePresencePlayerEffect,
  RolePresenceRoleEffect,
  RoleSummary,
  TeamRelationEffect,
} from "./game-insights.service.types";

// ─── Helpers ─────────────────────────────────────────────────────

const buildCorePlayer = (entry: MatchPlayerEntry): CorePlayer => ({
  playerKey: entry.playerKey,
  playerId: entry.playerId,
  playerName: entry.playerName,
  playerType: entry.playerType,
  isUser: entry.isUser,
  image: entry.image,
});

const classifyRoleInMatch = (
  matchData: MatchInsightData,
  roleId: number,
): RoleClassification => {
  const playersWithRole = matchData.players.filter((p) =>
    p.roles.some((r) => r.roleId === roleId),
  );

  if (playersWithRole.length <= 1) return "unique";

  // Check if all players with this role are on the same team
  const teamIds = playersWithRole.map((p) => p.teamId);
  const firstTeamId = teamIds[0];
  if (firstTeamId !== null && teamIds.every((t) => t === firstTeamId)) {
    return "team";
  }

  return "shared";
};

const getPredominantClassification = (breakdown: {
  unique: number;
  team: number;
  shared: number;
}): RoleClassification => {
  if (
    breakdown.team >= breakdown.unique &&
    breakdown.team >= breakdown.shared
  ) {
    return "team";
  }
  if (
    breakdown.shared >= breakdown.unique &&
    breakdown.shared >= breakdown.team
  ) {
    return "shared";
  }
  return "unique";
};

// ─── Collect all distinct roles from match map ──────────────────

const collectAllRoles = (
  matchMap: Map<number, MatchInsightData>,
): Map<
  number,
  { roleId: number; name: string; description: string | null }
> => {
  const roleMap = new Map<
    number,
    { roleId: number; name: string; description: string | null }
  >();
  for (const matchData of matchMap.values()) {
    for (const p of matchData.players) {
      for (const r of p.roles) {
        if (!roleMap.has(r.roleId)) {
          roleMap.set(r.roleId, {
            roleId: r.roleId,
            name: r.roleName,
            description: r.roleDescription,
          });
        }
      }
    }
  }
  return roleMap;
};

// ─── Compute Role Summaries ─────────────────────────────────────

export const computeRoleSummaries = (
  matchMap: Map<number, MatchInsightData>,
): RoleSummary[] => {
  const allRoles = collectAllRoles(matchMap);
  const summaries: RoleSummary[] = [];

  for (const role of allRoles.values()) {
    const breakdown = { unique: 0, team: 0, shared: 0 };
    let matchCount = 0;
    let wins = 0;
    let totalAssignments = 0;

    for (const matchData of matchMap.values()) {
      const playersWithRole = matchData.players.filter((p) =>
        p.roles.some((r) => r.roleId === role.roleId),
      );
      if (playersWithRole.length === 0) continue;

      matchCount++;
      const classification = classifyRoleInMatch(matchData, role.roleId);
      breakdown[classification]++;

      for (const p of playersWithRole) {
        totalAssignments++;
        if (p.winner) wins++;
      }
    }

    if (matchCount === 0) continue;

    summaries.push({
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      matchCount,
      winRate: totalAssignments > 0 ? wins / totalAssignments : 0,
      classificationBreakdown: breakdown,
      predominantClassification: getPredominantClassification(breakdown),
    });
  }

  return summaries.sort((a, b) => b.matchCount - a.matchCount);
};

// ─── Compute Role Presence Effects ──────────────────────────────

const getPlayerPresenceCategories = (
  player: MatchPlayerEntry,
  holders: MatchPlayerEntry[],
): { self: boolean; sameTeam: boolean; opposing: boolean } => {
  let self = false;
  let sameTeam = false;
  let opposing = false;

  for (const h of holders) {
    if (h.playerKey === player.playerKey) {
      self = true;
      continue;
    }
    if (
      h.teamId !== null &&
      player.teamId !== null &&
      h.teamId === player.teamId
    ) {
      sameTeam = true;
    } else {
      opposing = true;
    }
  }

  // When the player holds the role, their relationship is "self" — do not
  // also mark as opposing (other holders on different teams are irrelevant).
  if (self) {
    opposing = false;
  }

  return { self, sameTeam, opposing };
};

/** Build a TeamRelationEffect or null from accumulated wins/matches. */
const buildEffect = (
  wins: number,
  matches: number,
): TeamRelationEffect | null => {
  if (matches < 5) return null;
  return { winRate: wins / matches, matches };
};

export const computeRolePresenceEffects = (
  matchMap: Map<number, MatchInsightData>,
  roleSummaries: RoleSummary[],
): RolePresenceEffect[] => {
  const effects: RolePresenceEffect[] = [];

  for (const role of roleSummaries) {
    let matchesWithRole = 0;

    // Per-player accumulators: self / same-team / opposing
    // A match can contribute to multiple categories per player.
    // Each category counts at most once per match.
    const playerAccMap = new Map<
      string,
      {
        player: CorePlayer;
        winsSelf: number;
        matchesSelf: number;
        winsSameTeam: number;
        matchesSameTeam: number;
        winsOpposing: number;
        matchesOpposing: number;
      }
    >();

    for (const matchData of matchMap.values()) {
      if (matchData.isCoop) continue;

      // Find holders of this role in the match (deduplicated per match)
      const holders = matchData.players.filter((p) =>
        p.roles.some((r) => r.roleId === role.roleId),
      );
      if (holders.length === 0) continue;
      matchesWithRole++;

      for (const p of matchData.players) {
        let acc = playerAccMap.get(p.playerKey);
        if (!acc) {
          acc = {
            player: buildCorePlayer(p),
            winsSelf: 0,
            matchesSelf: 0,
            winsSameTeam: 0,
            matchesSameTeam: 0,
            winsOpposing: 0,
            matchesOpposing: 0,
          };
          playerAccMap.set(p.playerKey, acc);
        }

        const cats = getPlayerPresenceCategories(p, holders);
        if (cats.self) {
          acc.matchesSelf++;
          if (p.winner) acc.winsSelf++;
        }
        if (cats.sameTeam) {
          acc.matchesSameTeam++;
          if (p.winner) acc.winsSameTeam++;
        }
        if (cats.opposing) {
          acc.matchesOpposing++;
          if (p.winner) acc.winsOpposing++;
        }
      }
    }

    // Build player effects — require ≥5 in at least one condition
    const playerEffects: RolePresencePlayerEffect[] = [];
    for (const acc of playerAccMap.values()) {
      if (
        acc.matchesSelf < 5 &&
        acc.matchesSameTeam < 5 &&
        acc.matchesOpposing < 5
      ) {
        continue;
      }

      playerEffects.push({
        player: acc.player,
        self: buildEffect(acc.winsSelf, acc.matchesSelf),
        sameTeam: buildEffect(acc.winsSameTeam, acc.matchesSameTeam),
        opposingTeam: buildEffect(acc.winsOpposing, acc.matchesOpposing),
      });
    }

    // Sort by most extreme win rate (furthest from 50%) across conditions
    const deviation = (e: TeamRelationEffect | null): number =>
      e ? Math.abs(e.winRate - 0.5) : 0;

    playerEffects.sort((a, b) => {
      const aMax = Math.max(
        deviation(a.self),
        deviation(a.sameTeam),
        deviation(a.opposingTeam),
      );
      const bMax = Math.max(
        deviation(b.self),
        deviation(b.sameTeam),
        deviation(b.opposingTeam),
      );
      return bMax - aMax;
    });

    // ── Role-to-role effects ──────────────────────────────────────
    // Win rates are from X holders' perspective (the primary role).
    // Categories are evaluated per xHolder against yHolders to avoid
    // overcounting when a match has multiple xHolders.
    const roleEffects: RolePresenceRoleEffect[] = [];
    for (const otherRole of roleSummaries) {
      if (otherRole.roleId === role.roleId) continue;

      // Per-holder observation counters (holder-observation semantics).
      let winsSamePlayer = 0;
      let totalSamePlayer = 0;
      let winsSameTeam = 0;
      let totalSameTeam = 0;
      let winsOpposing = 0;
      let totalOpposing = 0;

      for (const matchData of matchMap.values()) {
        if (matchData.isCoop) continue;

        const xHolders = matchData.players.filter((p) =>
          p.roles.some((r) => r.roleId === role.roleId),
        );
        if (xHolders.length === 0) continue;

        const yHolders = matchData.players.filter((p) =>
          p.roles.some((r) => r.roleId === otherRole.roleId),
        );
        if (yHolders.length === 0) continue;

        // Evaluate categories per xHolder against yHolders
        for (const x of xHolders) {
          let isSamePlayer = false;
          let isSameTeam = false;
          let isOpposing = false;

          for (const y of yHolders) {
            if (x.playerKey === y.playerKey) {
              isSamePlayer = true;
              continue;
            }
            if (
              x.teamId !== null &&
              y.teamId !== null &&
              x.teamId === y.teamId
            ) {
              isSameTeam = true;
            } else {
              isOpposing = true;
            }
          }

          if (isSamePlayer) {
            totalSamePlayer++;
            if (x.winner) winsSamePlayer++;
          }
          if (isSameTeam) {
            totalSameTeam++;
            if (x.winner) winsSameTeam++;
          }
          if (isOpposing) {
            totalOpposing++;
            if (x.winner) winsOpposing++;
          }
        }
      }

      // Require ≥5 holder-observations in at least one condition
      if (totalSamePlayer < 5 && totalSameTeam < 5 && totalOpposing < 5) {
        continue;
      }

      const samePlayer =
        totalSamePlayer >= 5
          ? {
              winRate: winsSamePlayer / totalSamePlayer,
              matches: totalSamePlayer,
            }
          : null;
      const sameTeam =
        totalSameTeam >= 5
          ? { winRate: winsSameTeam / totalSameTeam, matches: totalSameTeam }
          : null;
      const opposingTeam =
        totalOpposing >= 5
          ? { winRate: winsOpposing / totalOpposing, matches: totalOpposing }
          : null;

      roleEffects.push({
        otherRoleId: otherRole.roleId,
        otherRoleName: otherRole.name,
        samePlayer,
        sameTeam,
        opposingTeam,
      });
    }

    // Sort by most extreme win rate (furthest from 50%)
    roleEffects.sort((a, b) => {
      const aMax = Math.max(
        deviation(a.samePlayer),
        deviation(a.sameTeam),
        deviation(a.opposingTeam),
      );
      const bMax = Math.max(
        deviation(b.samePlayer),
        deviation(b.sameTeam),
        deviation(b.opposingTeam),
      );
      return bMax - aMax;
    });

    if (matchesWithRole === 0) continue;

    effects.push({
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      classification: role.predominantClassification,
      matchCount: matchesWithRole,
      playerEffects: playerEffects.slice(0, 10),
      roleEffects: roleEffects.slice(0, 10),
    });
  }

  return effects;
};

// ─── Compute Player Role Performance ────────────────────────────

export const computePlayerRolePerformance = (
  matchMap: Map<number, MatchInsightData>,
  roleSummaries: RoleSummary[],
): PlayerRolePerformance[] => {
  // roleId -> predominant classification
  const roleClassMap = new Map<number, RoleClassification>();
  for (const rs of roleSummaries) {
    roleClassMap.set(rs.roleId, rs.predominantClassification);
  }

  // playerKey -> { player, roleId -> stats }
  const playerMap = new Map<
    string,
    {
      player: CorePlayer;
      roles: Map<
        number,
        {
          roleId: number;
          name: string;
          wins: number;
          total: number;
          placementSum: number;
          placementCount: number;
          scoreSum: number;
          scoreCount: number;
        }
      >;
    }
  >();

  for (const matchData of matchMap.values()) {
    for (const p of matchData.players) {
      if (p.roles.length === 0) continue;

      let playerEntry = playerMap.get(p.playerKey);
      if (!playerEntry) {
        playerEntry = {
          player: buildCorePlayer(p),
          roles: new Map(),
        };
        playerMap.set(p.playerKey, playerEntry);
      }

      for (const role of p.roles) {
        let roleAcc = playerEntry.roles.get(role.roleId);
        if (!roleAcc) {
          roleAcc = {
            roleId: role.roleId,
            name: role.roleName,
            wins: 0,
            total: 0,
            placementSum: 0,
            placementCount: 0,
            scoreSum: 0,
            scoreCount: 0,
          };
          playerEntry.roles.set(role.roleId, roleAcc);
        }

        roleAcc.total++;
        if (p.winner) roleAcc.wins++;
        if (p.placement > 0) {
          roleAcc.placementSum += p.placement;
          roleAcc.placementCount++;
        }
        if (p.score !== null) {
          roleAcc.scoreSum += p.score;
          roleAcc.scoreCount++;
        }
      }
    }
  }

  // Build output
  const results: PlayerRolePerformance[] = [];
  for (const entry of playerMap.values()) {
    const roles: PlayerRoleEntry[] = [];
    for (const roleAcc of entry.roles.values()) {
      roles.push({
        roleId: roleAcc.roleId,
        name: roleAcc.name,
        classification: roleClassMap.get(roleAcc.roleId) ?? "unique",
        winRate: roleAcc.total > 0 ? roleAcc.wins / roleAcc.total : 0,
        avgPlacement:
          roleAcc.placementCount > 0
            ? roleAcc.placementSum / roleAcc.placementCount
            : null,
        avgScore:
          roleAcc.scoreCount > 0 ? roleAcc.scoreSum / roleAcc.scoreCount : null,
        matchCount: roleAcc.total,
      });
    }

    // Sort roles by match count desc
    roles.sort((a, b) => b.matchCount - a.matchCount);

    results.push({
      player: entry.player,
      roles,
    });
  }

  // Sort: user first, then by total matches desc
  results.sort((a, b) => {
    if (a.player.isUser !== b.player.isUser) {
      return a.player.isUser ? -1 : 1;
    }
    const totalA = a.roles.reduce((s, r) => s + r.matchCount, 0);
    const totalB = b.roles.reduce((s, r) => s + r.matchCount, 0);
    return totalB - totalA;
  });

  return results;
};

// ─── Main entry: compute all role insights ──────────────────────

export const computeRoleInsights = (
  matchMap: Map<number, MatchInsightData>,
): RoleInsightsOutput | null => {
  // Check if any roles exist in the match data
  let hasRoles = false;
  for (const matchData of matchMap.values()) {
    for (const p of matchData.players) {
      if (p.roles.length > 0) {
        hasRoles = true;
        break;
      }
    }
    if (hasRoles) break;
  }

  if (!hasRoles) return null;

  const roles = computeRoleSummaries(matchMap);
  const presenceEffects = computeRolePresenceEffects(matchMap, roles);
  const playerPerformance = computePlayerRolePerformance(matchMap, roles);

  return {
    roles,
    presenceEffects,
    playerPerformance,
  };
};
