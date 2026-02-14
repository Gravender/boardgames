import { TRPCError } from "@trpc/server";

import type {
  GetMatchOutputType,
  GetMatchPlayersAndTeamsOutputType,
  GetMatchScoresheetOutputType,
  GetMatchSummaryOutputType,
} from "../../routers/match/match.output";
import type {
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
  MatchPlayersAndTeamsResponse,
} from "./match.service.types";
import { Logger } from "../../common/logger";
import { matchRepository } from "../../repositories/match/match.repository";

class MatchQueryService {
  private readonly logger = new Logger(MatchQueryService.name);

  public async getMatch(args: GetMatchArgs): Promise<GetMatchOutputType> {
    return matchRepository.getMatch({
      input: args.input,
      userId: args.ctx.userId,
    });
  }

  public async getMatchScoresheet(
    args: GetMatchScoresheetArgs,
  ): Promise<GetMatchScoresheetOutputType> {
    return matchRepository.getMatchScoresheet({
      input: args.input,
      userId: args.ctx.userId,
    });
  }

  public async getMatchPlayersAndTeams(
    args: GetMatchPlayersAndTeamsArgs,
  ): Promise<GetMatchPlayersAndTeamsOutputType> {
    const response = await matchRepository.getMatchPlayersAndTeams({
      input: args.input,
      userId: args.ctx.userId,
    });
    if (response.type === "original") {
      return {
        teams: response.teams,
        players: this.mapOriginalPlayers(response),
      };
    }
    return {
      teams: response.teams,
      players: this.mapSharedPlayers(response),
    };
  }

  public async getMatchSummary(
    args: GetMatchArgs,
  ): Promise<GetMatchSummaryOutputType> {
    const response = await matchRepository.getMatchSummary({
      input: args.input,
      userId: args.ctx.userId,
    });
    const playerStats: GetMatchSummaryOutputType["playerStats"] = [];
    for (const matchPlayer of response.players) {
      const matchPlayersForPlayer = response.matchPlayers.filter(
        (mp) => mp.canonicalPlayerId === matchPlayer.playerId,
      );
      const playerPlacements = matchPlayersForPlayer.reduce(
        (acc, mp) => {
          if (mp.placement !== null) {
            acc[mp.placement] = (acc[mp.placement] ?? 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>,
      );
      playerStats.push({
        id: matchPlayer.id,
        playerId: matchPlayer.playerId,
        playerType: matchPlayer.playerType,
        type: matchPlayer.type,
        name: matchPlayer.name,
        scores: matchPlayersForPlayer
          .map((mp) => mp.score)
          .filter((score) => score !== null),
        plays: matchPlayersForPlayer.length,
        placements: playerPlacements,
        wins: matchPlayersForPlayer.filter((mp) => mp.winner).length,
        firstMatch: matchPlayersForPlayer[0]?.isFirstMatchForCurrent ?? false,
      });
    }
    return {
      playerStats,
    };
  }

  private mapOriginalPlayers(
    response: Extract<MatchPlayersAndTeamsResponse, { type: "original" }>,
  ) {
    const refinedPlayers = response.players.map((matchPlayer) => {
      return {
        name: matchPlayer.player.name,
        rounds: response.scoresheet.rounds.map((scoresheetRound) => {
          const matchPlayerRound = matchPlayer.playerRounds.find(
            (roundPlayer) => roundPlayer.roundId === scoresheetRound.id,
          );
          if (!matchPlayerRound) {
            const message = `Match Player Round not found with roundId: ${scoresheetRound.id} and matchPlayerId: ${matchPlayer.id}`;
            this.logger.error(message);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: message,
            });
          }
          return matchPlayerRound;
        }),
        score: matchPlayer.score,
        baseMatchPlayerId: matchPlayer.id,
        id: matchPlayer.id,
        type: "original" as const,
        playerType: "original" as const,
        permissions: "edit" as const,
        playerId: matchPlayer.player.id,
        image:
          matchPlayer.player.image?.usageType === "player"
            ? {
                name: matchPlayer.player.image.name,
                url: matchPlayer.player.image.url,
                type: matchPlayer.player.image.type,
                usageType: "player" as const,
              }
            : null,
        details: matchPlayer.details,
        teamId: matchPlayer.teamId,
        isUser: matchPlayer.player.isUser,
        order: matchPlayer.order,
        roles: matchPlayer.roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          type: "original" as const,
        })),
        winner: matchPlayer.winner,
        placement: matchPlayer.placement,
      };
    });
    return this.sortPlayersByOrderThenName(refinedPlayers);
  }

  private mapSharedPlayers(
    response: Extract<MatchPlayersAndTeamsResponse, { type: "shared" }>,
  ) {
    const refinedPlayers = response.players.map((sharedMatchPlayer) => {
      const playerRounds = response.scoresheet.rounds.map((scoresheetRound) => {
        const sharedMatchPlayerRound =
          sharedMatchPlayer.matchPlayer.playerRounds.find(
            (round) => round.roundId === scoresheetRound.id,
          );
        if (!sharedMatchPlayerRound) {
          const message = `Shared Match Player Round not found with roundId: ${scoresheetRound.id} and matchPlayerId: ${sharedMatchPlayer.matchPlayerId}`;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: message,
          });
        }
        return sharedMatchPlayerRound;
      });

      const roles = sharedMatchPlayer.roles.map((role) => {
        const sharedGameRole = role.sharedGameRole;
        const linkedGameRole = sharedGameRole.linkedGameRole;
        if (linkedGameRole === null) {
          return {
            sharedId: sharedGameRole.id,
            name: sharedGameRole.gameRole.name,
            description: sharedGameRole.gameRole.description,
            type: "shared" as const,
            sharedType: "shared" as const,
          };
        }
        return {
          sharedId: sharedGameRole.id,
          name: linkedGameRole.name,
          description: linkedGameRole.description,
          type: "shared" as const,
          sharedType: "linked" as const,
        };
      });

      const matchPlayer = {
        baseMatchPlayerId: sharedMatchPlayer.matchPlayer.id,
        sharedMatchPlayerId: sharedMatchPlayer.id,
        type: "shared" as const,
        permissions: sharedMatchPlayer.permission,
        score: sharedMatchPlayer.matchPlayer.score,
        details: sharedMatchPlayer.matchPlayer.details,
        teamId: sharedMatchPlayer.matchPlayer.teamId,
        order: sharedMatchPlayer.matchPlayer.order,
        rounds: playerRounds,
        roles,
        isUser: false,
        placement: sharedMatchPlayer.matchPlayer.placement,
        winner: sharedMatchPlayer.matchPlayer.winner,
      };
      const sharedPlayer = sharedMatchPlayer.sharedPlayer;
      if (sharedPlayer === null) {
        return {
          ...matchPlayer,
          playerType: "not-shared" as const,
          name: sharedMatchPlayer.matchPlayer.player.name,
          playerId: sharedMatchPlayer.matchPlayer.player.id,
          sharedPlayerId: null,
          linkedPlayerId: null,
          image:
            sharedMatchPlayer.matchPlayer.player.image?.usageType === "player"
              ? {
                  name: sharedMatchPlayer.matchPlayer.player.image.name,
                  url: sharedMatchPlayer.matchPlayer.player.image.url,
                  type: sharedMatchPlayer.matchPlayer.player.image.type,
                  usageType: "player" as const,
                }
              : null,
        };
      }
      const linkedPlayer = sharedPlayer.linkedPlayer;
      if (linkedPlayer === null) {
        return {
          ...matchPlayer,
          playerType: "shared" as const,
          name: sharedPlayer.player.name,
          playerId: sharedPlayer.player.id,
          sharedPlayerId: sharedPlayer.id,
          linkedPlayerId: null,
          image:
            sharedPlayer.player.image?.usageType === "player"
              ? {
                  name: sharedPlayer.player.image.name,
                  url: sharedPlayer.player.image.url,
                  type: sharedPlayer.player.image.type,
                  usageType: "player" as const,
                }
              : null,
        };
      }
      return {
        ...matchPlayer,
        playerType: "linked" as const,
        name: linkedPlayer.name,
        playerId: linkedPlayer.id,
        sharedPlayerId: sharedPlayer.id,
        linkedPlayerId: linkedPlayer.id,
        image:
          linkedPlayer.image?.usageType === "player"
            ? {
                name: linkedPlayer.image.name,
                url: linkedPlayer.image.url,
                type: linkedPlayer.image.type,
                usageType: "player" as const,
              }
            : null,
        isUser: linkedPlayer.isUser,
      };
    });
    return this.sortPlayersByOrderThenName(refinedPlayers);
  }

  private sortPlayersByOrderThenName<
    T extends { order: number | null; name: string },
  >(players: T[]) {
    return players.sort((a, b) => {
      if (a.order === null && b.order === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.order === null) return 1; // nulls last
      if (b.order === null) return -1; // nulls last
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }
}

export const matchQueryService = new MatchQueryService();
