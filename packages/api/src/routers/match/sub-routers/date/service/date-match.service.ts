import { TRPCError } from "@trpc/server";

import type {
  GetMatchesByCalendarOutputType,
  GetMatchesByDateOutputType,
} from "../date-match.output";
import type {
  GetMatchesByCalendarArgs,
  GetMatchesByDateArgs,
} from "./date-match.service.types";
import { aggregatePlayerStats } from "../../../../../utils/player";
import { dateMatchRepository } from "../repository/date-match.repository";

class DateMatchService {
  public async getMatchesByDate(
    args: GetMatchesByDateArgs,
  ): Promise<GetMatchesByDateOutputType> {
    const response = await dateMatchRepository.getMatchesByDate({
      input: args.input,
      userId: args.ctx.userId,
    });
    const mappedMatches = response.matches.map((match) => {
      const userMatchPlayer = match.matchPlayers.find(
        (mp) => mp.playerId === response.userPlayer.id,
      );
      if (match.type === "original") {
        if (match.game.type !== "original") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of the same type.",
          });
        }

        return {
          ...match,
          game: {
            id: match.game.id,
            type: "original" as const,
            name: match.game.name,
            image: match.game.image,
          },
          gameId: match.game.id,
          gameImage: match.game.image,
          gameName: match.game.name,
          linkedGameId: match.game.linkedGameId ?? undefined,
          locationName: match.location?.name,
          outcome: {
            score: userMatchPlayer?.score ?? 0,
            isWinner: userMatchPlayer?.winner ?? false,
            placement: userMatchPlayer?.placement ?? 0,
          },
          type: "original" as const,
          hasUser: userMatchPlayer !== undefined,
          won: userMatchPlayer?.winner ?? false,
          matchPlayers: match.matchPlayers.map((mp) => {
            if (mp.playerType !== "original" || mp.type !== "original") {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Match player and Match are not of the correct type.",
              });
            }
            return {
              id: mp.id,
              playerId: mp.playerId,
              isUser: mp.playerId === userMatchPlayer?.playerId,
              type: "original" as const,
              name: mp.name,
              score: mp.score,
              teamId: mp.teamId,
              placement: mp.placement,
              winner: mp.winner,
              playerType: "original" as const,
              image: mp.image,
            };
          }),
          players: match.matchPlayers.map((mp) => ({
            id: mp.playerId,
            type: "original" as const,
            name: mp.name,
            score: mp.score,
            isWinner: mp.winner ?? false,
            placement: mp.placement,
            teamId: mp.teamId,
            isUser: mp.playerId === userMatchPlayer?.playerId,
            image: mp.image
              ? {
                  name: mp.image.name,
                  url: mp.image.url,
                  type: mp.image.type,
                  usageType: "player" as const,
                }
              : null,
          })),
        };
      } else {
        if (match.game.type === "original") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of correct type.",
          });
        }
        if (match.game.sharedGameId === null) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of the correct type.",
          });
        }
        if (match.sharedMatchId === null) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Game and Match are not of the correct type.",
          });
        }
        return {
          ...match,
          sharedMatchId: match.sharedMatchId,
          game: {
            id: match.game.id,
            name: match.game.name,
            image: match.game.image,
            linkedGameId: match.game.linkedGameId,
            sharedGameId: match.game.sharedGameId,
            type:
              match.game.type === "linked"
                ? ("linked" as const)
                : ("shared" as const),
          },
          gameId: match.game.id,
          gameImage: match.game.image,
          gameName: match.game.name,
          linkedGameId: match.game.linkedGameId ?? undefined,
          locationName: match.location?.name,
          outcome: {
            score: userMatchPlayer?.score ?? 0,
            isWinner: userMatchPlayer?.winner ?? false,
            placement: userMatchPlayer?.placement ?? 0,
          },
          type: "shared" as const,
          hasUser: userMatchPlayer !== undefined,
          won: userMatchPlayer?.winner ?? false,
          matchPlayers: match.matchPlayers.map((mp) => {
            if (mp.playerType === "original" || mp.type !== "shared") {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Match player and Match are not of the correct type.",
              });
            }
            return {
              id: mp.id,
              playerId: mp.playerId,
              type: "shared" as const,
              name: mp.name,
              score: mp.score,
              teamId: mp.teamId,
              placement: mp.placement,
              winner: mp.winner,
              isUser: mp.playerId === userMatchPlayer?.playerId,
              playerType:
                mp.playerType === "linked"
                  ? ("linked" as const)
                  : mp.playerType === "not-shared"
                    ? ("not-shared" as const)
                    : ("shared" as const),
              sharedPlayerId: mp.sharedPlayerId,
              linkedPlayerId: mp.linkedPlayerId,
              image: mp.image,
            };
          }),
          players: match.matchPlayers.map((mp) => ({
            id: mp.playerId,
            type: mp.playerType === "linked" ? ("original" as const) : mp.type,
            name: mp.name,
            score: mp.score,
            isWinner: mp.winner ?? false,
            placement: mp.placement,
            teamId: mp.teamId,
            isUser: mp.playerId === userMatchPlayer?.playerId,
            image: mp.image
              ? {
                  name: mp.image.name,
                  url: mp.image.url,
                  type: mp.image.type,
                  usageType: "player" as const,
                }
              : null,
          })),
        };
      }
    });
    return {
      date: response.date,
      matches: mappedMatches,
      playerStats: aggregatePlayerStats(mappedMatches),
    };
  }
  public async getMatchesByCalendar(
    args: GetMatchesByCalendarArgs,
  ): Promise<GetMatchesByCalendarOutputType> {
    return dateMatchRepository.getMatchesByCalendar({
      userId: args.ctx.userId,
    });
  }
}
export const dateMatchService = new DateMatchService();
