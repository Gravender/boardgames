import type {
  GameInsightsOutput,
  GetGameInsightsArgs,
  MatchInsightData,
} from "./game-insights.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { computeCoreStats, detectCores } from "./game-core-detection.service";
import {
  computeFrequentLineups,
  computePlayerCountDistribution,
} from "./game-distribution.service";
import { computeRoleInsights } from "./game-role-insights.service";
import { computeSummary } from "./game-summary.service";
import {
  computeTeamConfigurations,
  computeTeamCoreStats,
} from "./game-team-insights.service";

// ─── Service ─────────────────────────────────────────────────────

class GameInsightsService {
  public async getGameInsights(
    args: GetGameInsightsArgs,
  ): Promise<GameInsightsOutput> {
    const [rows, roleRows] = await Promise.all([
      gameRepository.getGameInsightsData({
        input: args.input,
        userId: args.ctx.userId,
      }),
      gameRepository.getGameInsightsRoleData({
        input: args.input,
        userId: args.ctx.userId,
      }),
    ]);

    const matchMap = this.groupMatchesByMatch(rows);
    this.mergeRoleData(matchMap, roleRows);

    // Game cores (all players in match, regardless of team)
    const pairs = detectCores(matchMap, 2, 3, false).map((raw) =>
      computeCoreStats(raw, matchMap),
    );
    const trios = detectCores(matchMap, 3, 3, false).map((raw) =>
      computeCoreStats(raw, matchMap),
    );
    const quartets = detectCores(matchMap, 4, 3, false).map((raw) =>
      computeCoreStats(raw, matchMap),
    );

    // Team cores (same team within match)
    const teamPairs = detectCores(matchMap, 2, 3, true).map((raw) =>
      computeTeamCoreStats(raw, matchMap),
    );
    const teamTrios = detectCores(matchMap, 3, 3, true).map((raw) =>
      computeTeamCoreStats(raw, matchMap),
    );
    const teamQuartets = detectCores(matchMap, 4, 3, true).map((raw) =>
      computeTeamCoreStats(raw, matchMap),
    );

    const teamConfigurations = computeTeamConfigurations(matchMap);

    const hasTeamData =
      teamPairs.length > 0 ||
      teamTrios.length > 0 ||
      teamQuartets.length > 0 ||
      teamConfigurations.length > 0;

    const teams = hasTeamData
      ? {
          cores: {
            pairs: teamPairs,
            trios: teamTrios,
            quartets: teamQuartets,
          },
          configurations: teamConfigurations,
        }
      : null;

    const distribution = computePlayerCountDistribution(matchMap);
    const lineups = computeFrequentLineups(matchMap);
    const summary = computeSummary(
      distribution,
      pairs,
      trios,
      teamPairs,
      lineups,
    );
    const roles = computeRoleInsights(matchMap);

    return {
      summary,
      distribution,
      cores: { pairs, trios, quartets },
      lineups,
      teams,
      roles,
    };
  }

  // ─── Group flat rows by match ──────────────────────────────────

  private groupMatchesByMatch(
    rows: Awaited<ReturnType<typeof gameRepository.getGameInsightsData>>,
  ): Map<number, MatchInsightData> {
    const matchMap = new Map<number, MatchInsightData>();

    for (const row of rows) {
      let matchData = matchMap.get(row.matchId);
      if (!matchData) {
        matchData = {
          matchId: row.matchId,
          matchDate: row.matchDate,
          isCoop: row.isCoop,
          winCondition: row.winCondition,
          playerCount: Number(row.playerCount),
          players: [],
        };
        matchMap.set(row.matchId, matchData);
      }

      const sourceType = row.playerSourceType;
      const playerType: "original" | "shared" =
        sourceType === "linked" || sourceType === "original"
          ? "original"
          : "shared";
      const playerKey = `${playerType}-${row.playerId}`;

      if (matchData.players.some((p) => p.playerKey === playerKey)) continue;

      matchData.players.push({
        playerKey,
        playerId: row.playerId,
        playerName: row.playerName,
        playerType,
        isUser: row.isUser,
        winner: row.winner ?? false,
        score: row.score,
        placement: row.placement ?? 0,
        teamId: row.teamId,
        teamName: row.teamName,
        image:
          row.playerImageName !== null
            ? {
                name: row.playerImageName,
                url: row.playerImageUrl,
                type: row.playerImageType ?? "file",
              }
            : null,
        roles: [],
      });
    }

    return matchMap;
  }

  // ─── Merge role data into the match map ────────────────────────

  private mergeRoleData(
    matchMap: Map<number, MatchInsightData>,
    roleRows: Awaited<
      ReturnType<typeof gameRepository.getGameInsightsRoleData>
    >,
  ): void {
    for (const row of roleRows) {
      const matchData = matchMap.get(row.matchId);
      if (!matchData) continue;

      const sourceType = row.playerSourceType;
      const playerType: "original" | "shared" =
        sourceType === "linked" || sourceType === "original"
          ? "original"
          : "shared";
      const playerKey = `${playerType}-${row.playerId}`;

      const playerEntry = matchData.players.find(
        (p) => p.playerKey === playerKey,
      );
      if (!playerEntry) continue;

      if (playerEntry.roles.some((r) => r.roleId === row.canonicalRoleId)) {
        continue;
      }

      playerEntry.roles.push({
        roleId: row.canonicalRoleId,
        roleName: row.roleName,
        roleDescription: row.roleDescription,
      });
    }
  }
}

export const gameInsightsService = new GameInsightsService();
