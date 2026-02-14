import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type { EditMatchInputType } from "../../routers/match/match.input";
import type { SharedEditMatchOutputType } from "../../routers/match/match.output";
import type { EditMatchArgs } from "./match.service.types";
import { locationRepository } from "../../repositories/location/location.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

class MatchEditSharedService {
  public async editSharedMatch(args: {
    input: Extract<EditMatchInputType, { type: "shared" }>;
    ctx: EditMatchArgs["ctx"];
  }): Promise<SharedEditMatchOutputType> {
    const { input, ctx } = args;
    const response = await db.transaction(async (tx) => {
      const returnedSharedMatch = await matchRepository.getShared(
        {
          id: input.match.sharedMatchId,
          sharedWithId: ctx.userId,
          with: {
            sharedGame: {
              with: {
                game: {
                  with: {
                    image: true,
                  },
                },
                linkedGame: {
                  with: {
                    image: true,
                  },
                },
              },
            },
          },
        },
        tx,
      );
      assertFound(
        returnedSharedMatch,
        {
          userId: ctx.userId,
          value: input,
        },
        "Shared match not found.",
      );
      if (returnedSharedMatch.permission !== "edit") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
      }

      if (input.match.location !== undefined) {
        if (input.match.location !== null) {
          const returnedSharedLocation = await locationRepository.getShared({
            id: input.match.location.sharedId,
            sharedWithId: ctx.userId,
            where: {
              ownerId: returnedSharedMatch.ownerId,
            },
          });
          assertFound(
            returnedSharedLocation,
            {
              userId: ctx.userId,
              value: input,
            },
            "Shared location not found.",
          );
          const updatedShareMatch = await matchRepository.updateMatch({
            input: {
              id: returnedSharedMatch.matchId,
              name: input.match.name,
              date: input.match.date,
              locationId: returnedSharedLocation.locationId,
            },
            tx: tx,
          });
          assertInserted(
            updatedShareMatch,
            {
              userId: ctx.userId,
              value: input,
            },
            "Shared match not updated.",
          );
          return {
            type: "shared" as const,
            matchId: updatedShareMatch.id,
            game: this.mapSharedGame(returnedSharedMatch),
            date: updatedShareMatch.date,
          };
        } else {
          const updatedShareMatch = await matchRepository.updateMatch({
            input: {
              id: returnedSharedMatch.matchId,
              name: input.match.name,
              date: input.match.date,
              locationId: null,
            },
            tx: tx,
          });
          assertInserted(
            updatedShareMatch,
            {
              userId: ctx.userId,
              value: input,
            },
            "Shared match not updated.",
          );
          return {
            type: "shared" as const,
            matchId: updatedShareMatch.id,
            game: this.mapSharedGame(returnedSharedMatch),
            date: updatedShareMatch.date,
          };
        }
      }

      const updatedShareMatch = await matchRepository.updateMatch({
        input: {
          id: returnedSharedMatch.matchId,
          name: input.match.name,
          date: input.match.date,
        },
        tx: tx,
      });
      assertInserted(
        updatedShareMatch,
        {
          userId: ctx.userId,
          value: input,
        },
        "Shared match not updated.",
      );
      return {
        type: "shared" as const,
        matchId: updatedShareMatch.id,
        game: this.mapSharedGame(returnedSharedMatch),
        date: updatedShareMatch.date,
      };
    });
    return response;
  }

  private mapSharedGame(returnedSharedMatch: {
    sharedGame: {
      gameId: number;
      game: {
        name: string;
        image: { url: string | null; type: string } | null;
      };
      linkedGame: {
        id: number;
        name: string;
        image: { url: string | null; type: string } | null;
      } | null;
    };
  }) {
    if (returnedSharedMatch.sharedGame.linkedGame) {
      return {
        id: returnedSharedMatch.sharedGame.linkedGame.id,
        type: "original" as const,
        name: returnedSharedMatch.sharedGame.linkedGame.name,
        image: returnedSharedMatch.sharedGame.linkedGame.image,
      };
    }
    return {
      id: returnedSharedMatch.sharedGame.gameId,
      type: "shared" as const,
      name: returnedSharedMatch.sharedGame.game.name,
      image: returnedSharedMatch.sharedGame.game.image,
    };
  }
}

export const matchEditSharedService = new MatchEditSharedService();
