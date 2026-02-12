import type {
  CorePlayer,
  MatchInsightData,
  RawCore,
  TeamConfig,
  TeamCore,
} from "./game-insights.service.types";
import {
  buildCorePlayer,
  computeCoreStats,
} from "./game-core-detection.service";

// ─── Compute team core stats (extends core stats with win rate) ──

export const computeTeamCoreStats = (
  raw: RawCore,
  matchMap: Map<number, MatchInsightData>,
): TeamCore => {
  const base = computeCoreStats(raw, matchMap);

  let teamWins = 0;
  let teamMatches = 0;

  for (const matchId of raw.matchIds) {
    const matchData = matchMap.get(matchId);
    if (!matchData) continue;

    const firstCoreKey = raw.playerKeys[0];
    if (!firstCoreKey) continue;

    const corePlayer = matchData.players.find(
      (p) => p.playerKey === firstCoreKey,
    );
    if (!corePlayer) continue;
    if (corePlayer.teamId === null) continue;

    const sharedTeamId = corePlayer.teamId;
    const teamWon = matchData.players
      .filter((p) => p.teamId === sharedTeamId)
      .some((p) => p.winner);

    teamMatches++;
    if (teamWon) teamWins++;
  }

  return {
    ...base,
    teamWinRate: teamMatches > 0 ? teamWins / teamMatches : 0,
    teamWins,
    teamMatches,
  };
};

// ─── Team configurations (team-vs-team matchups) ─────────────────

export const computeTeamConfigurations = (
  matchMap: Map<number, MatchInsightData>,
): TeamConfig[] => {
  const playerInfoMap = new Map<string, CorePlayer>();
  for (const matchData of matchMap.values()) {
    for (const p of matchData.players) {
      if (!playerInfoMap.has(p.playerKey)) {
        playerInfoMap.set(p.playerKey, buildCorePlayer(p));
      }
    }
  }

  const configMap = new Map<
    string,
    {
      teams: {
        playerKeys: string[];
        teamName: string;
        wins: number;
      }[];
      matchIds: number[];
    }
  >();

  for (const matchData of matchMap.values()) {
    const teamGroups = new Map<
      number,
      { playerKeys: string[]; teamName: string; hasWinner: boolean }
    >();
    let hasTeams = false;

    for (const p of matchData.players) {
      if (p.teamId === null) continue;
      hasTeams = true;
      let group = teamGroups.get(p.teamId);
      if (!group) {
        group = {
          playerKeys: [],
          teamName: p.teamName ?? `Team ${p.teamId}`,
          hasWinner: false,
        };
        teamGroups.set(p.teamId, group);
      }
      group.playerKeys.push(p.playerKey);
      if (p.winner) group.hasWinner = true;
    }

    if (!hasTeams || teamGroups.size < 2) continue;

    const sortedTeams = Array.from(teamGroups.values())
      .map((g) => ({
        ...g,
        playerKeys: g.playerKeys.sort(),
      }))
      .sort((a, b) =>
        a.playerKeys.join("|").localeCompare(b.playerKeys.join("|")),
      );

    const configKey = sortedTeams
      .map((t) => t.playerKeys.join(","))
      .join(" vs ");

    let entry = configMap.get(configKey);
    if (!entry) {
      entry = {
        teams: sortedTeams.map((t) => ({
          playerKeys: t.playerKeys,
          teamName: t.teamName,
          wins: 0,
        })),
        matchIds: [],
      };
      configMap.set(configKey, entry);
    }
    entry.matchIds.push(matchData.matchId);

    for (let i = 0; i < sortedTeams.length; i++) {
      const sortedTeam = sortedTeams[i];
      const entryTeam = entry.teams[i];
      if (sortedTeam?.hasWinner && entryTeam) {
        entryTeam.wins++;
      }
    }
  }

  const configs: TeamConfig[] = Array.from(configMap.values())
    .filter((entry) => entry.matchIds.length >= 2)
    .map((entry) => ({
      teams: entry.teams.map((t) => ({
        players: t.playerKeys
          .map((key) => playerInfoMap.get(key))
          .filter((p): p is CorePlayer => p !== undefined),
        teamName: t.teamName,
      })),
      matchCount: entry.matchIds.length,
      matchIds: entry.matchIds,
      outcomes: entry.teams.map((t, idx) => ({
        teamIndex: idx,
        wins: t.wins,
      })),
    }))
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, 15);

  return configs;
};
