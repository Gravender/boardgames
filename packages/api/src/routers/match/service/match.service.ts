import { TRPCError } from "@trpc/server";

import type {
  CreateMatchOutputType,
  EditMatchOutputType,
  GetMatchOutputType,
  GetMatchPlayersAndTeamsOutputType,
  GetMatchScoresheetOutputType,
  GetMatchSummaryOutputType,
} from "../match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
} from "./match.service.types";
import { Logger } from "../../../common/logger";
import { matchRepository } from "../repository/match.repository";

class MatchService {
  private readonly logger = new Logger(MatchService.name);
  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    return matchRepository.createMatch({
      input: args.input,
      createdBy: args.ctx.userId,
    });
  }
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
          roles: matchPlayer.roles,
          winner: matchPlayer.winner,
          placement: matchPlayer.placement,
        };
      });
      refinedPlayers.sort((a, b) => {
        if (a.order === b.order) {
          return a.name.localeCompare(b.name);
        }
        if (a.order === null || b.order === null)
          return a.name.localeCompare(b.name);
        return a.order - b.order;
      });
      return {
        teams: response.teams,
        players: refinedPlayers,
      };
    } else {
      const refinedPlayers = response.players.map((sharedMatchPlayer) => {
        const playerRounds = response.scoresheet.rounds.map(
          (scoresheetRound) => {
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
          },
        );
        const matchPlayer = {
          type: "shared" as const,
          permissions: sharedMatchPlayer.permission,
          score: sharedMatchPlayer.matchPlayer.score,
          id: sharedMatchPlayer.id,
          matchPlayerId: sharedMatchPlayer.matchPlayer.id,
          details: sharedMatchPlayer.matchPlayer.details,
          teamId: sharedMatchPlayer.matchPlayer.teamId,
          order: sharedMatchPlayer.matchPlayer.order,
          rounds: playerRounds,
          roles: sharedMatchPlayer.matchPlayer.roles,
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
          playerType: "original" as const,
          name: linkedPlayer.name,
          playerId: linkedPlayer.id,
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
      refinedPlayers.sort((a, b) => {
        if (a.order === b.order) {
          return a.name.localeCompare(b.name);
        }
        if (a.order === null || b.order === null)
          return a.name.localeCompare(b.name);
        return a.order - b.order;
      });
      return {
        teams: response.teams,
        players: refinedPlayers,
      };
    }
  }
  public async getMatchSummary(
    args: GetMatchArgs,
  ): Promise<GetMatchSummaryOutputType> {
    const response = await matchRepository.getMatchSummary({
      input: args.input,
      userId: args.ctx.userId,
    });
    const playerStats: GetMatchSummaryOutputType["playerStats"] = [];
    for (const player of response.players) {
      const matchPlayersForPlayer = response.matchPlayers.filter(
        (mp) => mp.id === player.id,
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
        id: player.id,
        playerId: player.playerId,
        playerType: player.playerType,
        type: player.type,
        name: player.name,
        scores: matchPlayersForPlayer
          .map((mp) => mp.score)
          .filter((score) => score !== null),
        plays: matchPlayersForPlayer.length,
        placements: playerPlacements,
        wins: matchPlayersForPlayer.filter((mp) => mp.winner).length,
        firstMatch: matchPlayersForPlayer[0]?.isFirstMatchForCurrent ?? false,
      });
    }
    console.log(playerStats);
    return {
      playerStats,
    };
  }
  public async deleteMatch(args: DeleteMatchArgs) {
    return matchRepository.deleteMatch({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async editMatch(args: EditMatchArgs): Promise<EditMatchOutputType> {
    return matchRepository.editMatch({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
}
export const matchService = new MatchService();
