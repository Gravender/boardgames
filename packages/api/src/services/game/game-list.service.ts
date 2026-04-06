import { compareDesc } from "date-fns";

import type {
  GetGamesOutputType,
  GetGameToShareOutputType,
} from "../../routers/game/game.output";
import type { GetGamesArgs, GetGameToShareArgs } from "./game.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { assertFound } from "../../utils/databaseHelpers";
import { mapImageRowToGameImage } from "../../utils/image";

class GameListService {
  public async getGames(args: GetGamesArgs): Promise<GetGamesOutputType> {
    const { ctx } = args;
    const gamesQuery = await gameRepository.getGamesForUser(ctx.userId);
    const sharedGamesQuery = await gameRepository.getUnlinkedSharedGames(
      ctx.userId,
    );

    const mappedGames: GetGamesOutputType = gamesQuery.map((returnedGame) => {
      const firstOriginalMatch = returnedGame.matches[0];
      const linkedMatches = returnedGame.sharedGameMatches
        .map((mMatch) => {
          if (mMatch.match === null) return null;
          const mSharedLocation = mMatch.sharedLocation;
          const linkedLocation = mSharedLocation?.linkedLocation;
          return {
            id: mMatch.match.id,
            date: mMatch.match.date,
            location: mSharedLocation
              ? {
                  type: linkedLocation
                    ? ("linked" as const)
                    : ("shared" as const),
                  name: linkedLocation?.name ?? mSharedLocation.location.name,
                }
              : null,
          };
        })
        .filter((m) => m !== null);
      linkedMatches.sort((a, b) => compareDesc(a.date, b.date));
      const firstLinkedMatch = linkedMatches[0];
      const getFirstMatch = () => {
        if (
          firstOriginalMatch !== undefined &&
          firstLinkedMatch !== undefined
        ) {
          return compareDesc(firstOriginalMatch.date, firstLinkedMatch.date) ===
            -1
            ? {
                ...firstOriginalMatch,
                location: firstOriginalMatch.location
                  ? {
                      type: "original" as const,
                      name: firstOriginalMatch.location.name,
                    }
                  : null,
              }
            : firstLinkedMatch;
        }
        if (firstOriginalMatch !== undefined) {
          return {
            ...firstOriginalMatch,
            location: firstOriginalMatch.location
              ? {
                  type: "original" as const,
                  name: firstOriginalMatch.location.name,
                }
              : null,
          };
        }
        if (firstLinkedMatch !== undefined) {
          return firstLinkedMatch;
        }
        return null;
      };
      const firstMatch = getFirstMatch();
      return {
        type: "original" as const,
        id: returnedGame.id,
        name: returnedGame.name,
        createdAt: returnedGame.createdAt,
        players: {
          min: returnedGame.playersMin,
          max: returnedGame.playersMax,
        },
        playtime: {
          min: returnedGame.playtimeMin,
          max: returnedGame.playtimeMax,
        },
        yearPublished: returnedGame.yearPublished,
        image: mapImageRowToGameImage(returnedGame.image),
        ownedBy: returnedGame.ownedBy ?? false,
        games: linkedMatches.length + returnedGame.matches.length,
        lastPlayed: {
          date: firstMatch?.date ?? null,
          location: firstMatch?.location ?? null,
        },
      };
    });

    for (const returnedSharedGame of sharedGamesQuery) {
      const returnedSharedMatches: {
        id: number;
        date: Date;
        location: {
          type: "shared" | "linked" | "original";
          name: string;
        } | null;
      }[] = returnedSharedGame.sharedMatches
        .map(
          (mMatch) =>
            mMatch.match !== null && {
              id: mMatch.match.id,
              date: mMatch.match.date,
              location: mMatch.sharedLocation
                ? {
                    type: mMatch.sharedLocation.linkedLocation
                      ? ("linked" as const)
                      : ("shared" as const),
                    name:
                      mMatch.sharedLocation.linkedLocation?.name ??
                      mMatch.sharedLocation.location.name,
                  }
                : null,
            },
        )
        .filter((m) => m !== false);
      returnedSharedMatches.sort((a, b) => compareDesc(a.date, b.date));
      const firstMatch = returnedSharedMatches[0];

      mappedGames.push({
        type: "shared" as const,
        id: returnedSharedGame.id,
        name: returnedSharedGame.game.name,
        createdAt: returnedSharedGame.game.createdAt,
        players: {
          min: returnedSharedGame.game.playersMin,
          max: returnedSharedGame.game.playersMax,
        },
        playtime: {
          min: returnedSharedGame.game.playtimeMin,
          max: returnedSharedGame.game.playtimeMax,
        },
        yearPublished: returnedSharedGame.game.yearPublished,
        ownedBy: returnedSharedGame.game.ownedBy ?? false,
        image: mapImageRowToGameImage(returnedSharedGame.game.image),
        games: returnedSharedMatches.length,
        lastPlayed: {
          date: firstMatch?.date ?? null,
          location: firstMatch?.location ?? null,
        },
      });
    }

    mappedGames.sort((a, b) => {
      if (a.lastPlayed.date && b.lastPlayed.date) {
        return compareDesc(a.lastPlayed.date, b.lastPlayed.date);
      } else if (a.lastPlayed.date && !b.lastPlayed.date) {
        return compareDesc(a.lastPlayed.date, b.createdAt);
      } else if (!a.lastPlayed.date && b.lastPlayed.date) {
        return compareDesc(a.createdAt, b.lastPlayed.date);
      } else {
        return compareDesc(a.createdAt, b.createdAt);
      }
    });

    return mappedGames;
  }

  public async getGameToShare(
    args: GetGameToShareArgs,
  ): Promise<GetGameToShareOutputType> {
    const { input, ctx } = args;
    const result = await gameRepository.getGameForSharing({
      gameId: input.id,
      userId: ctx.userId,
    });

    assertFound(result, { userId: ctx.userId, value: input }, "Game not found");

    const mapMatchRow = (rMatch: (typeof result.matches)[number]) => ({
      id: rMatch.id,
      name: rMatch.name,
      date: rMatch.date,
      duration: rMatch.duration,
      finished: rMatch.finished,
      locationName: rMatch.location?.name,
      players: rMatch.matchPlayers
        .map((mp) => ({
          id: mp.player.id,
          name: mp.player.name,
          score: mp.score,
          isWinner: mp.winner,
          playerId: mp.player.id,
          team: mp.team,
        }))
        .toSorted((a, b) => {
          if (a.team === null || b.team === null) {
            if (a.score === b.score) {
              return a.name.localeCompare(b.name);
            }
            if (a.score === null) return 1;
            if (b.score === null) return -1;
            return b.score - a.score;
          }
          if (a.team.id === b.team.id) return 0;
          if (a.score === b.score) {
            return a.name.localeCompare(b.name);
          }
          if (a.score === null) return 1;
          if (b.score === null) return -1;
          return b.score - a.score;
        }),
      teams: rMatch.teams,
    });

    const finishedMatches = result.matches
      .filter((rMatch) => rMatch.finished)
      .map(mapMatchRow);
    const unfinishedMatches = result.matches
      .filter((rMatch) => !rMatch.finished)
      .map(mapMatchRow);

    const locationMap = new Map<number, { id: number; name: string }>();
    for (const rMatch of result.matches) {
      if (rMatch.location?.id) {
        locationMap.set(rMatch.location.id, {
          id: rMatch.location.id,
          name: rMatch.location.name,
        });
      }
    }

    const gameRoles = (result.roles ?? []).map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
    }));

    return {
      id: result.id,
      name: result.name,
      image: mapImageRowToGameImage(result.image),
      players: {
        min: result.playersMin,
        max: result.playersMax,
      },
      playtime: {
        min: result.playtimeMin,
        max: result.playtimeMax,
      },
      yearPublished: result.yearPublished,
      finishedMatches,
      unfinishedMatches,
      matches: finishedMatches,
      gameRoles,
      locationsReferenced: [...locationMap.values()],
      scoresheets: result.scoresheets,
    };
  }
}

export const gameListService = new GameListService();
