import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "@board-games/api/trpc";
import { selectSharedLocationSchema } from "@board-games/db/zodSchema";

export const shareLocationRouter = {
  getSharedLocation: protectedUserProcedure
    .input(selectSharedLocationSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedLocation = await ctx.db.query.sharedLocation.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          location: true,
          sharedMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: true,
              sharedGame: {
                with: {
                  linkedGame: {
                    with: {
                      image: true,
                    },
                  },
                  game: {
                    with: {
                      image: true,
                    },
                  },
                },
              },
              sharedMatchPlayers: {
                with: {
                  matchPlayer: true,
                  sharedPlayer: {
                    with: {
                      linkedPlayer: true,

                      player: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!returnedLocation) {
        return null;
      }
      const locationMatches: {
        type: "shared";
        id: number;
        gameId: number;
        date: Date;
        name: string;
        finished: boolean;
        won: boolean;
        players: {
          id: number;
          name: string;
        }[];
        gameImage: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game" | "player" | "match";
        } | null;
        gameName: string | undefined;
      }[] = returnedLocation.sharedMatches.map((m) => {
        const linkedGame = m.sharedGame.linkedGame;
        const mPlayers = m.sharedMatchPlayers
          .map((sharedMatchPlayer) => {
            if (sharedMatchPlayer.sharedPlayer === null) {
              return null;
            }
            if (sharedMatchPlayer.sharedPlayer.linkedPlayer === null) {
              return {
                type: "shared" as const,
                isUser: false,
                id: sharedMatchPlayer.sharedPlayer.id,
                name: sharedMatchPlayer.sharedPlayer.player.name,
                placement: sharedMatchPlayer.matchPlayer.placement,
                winner: sharedMatchPlayer.matchPlayer.winner,
              };
            }
            return {
              type: "original" as const,
              isUser: sharedMatchPlayer.sharedPlayer.linkedPlayer.isUser,

              id: sharedMatchPlayer.sharedPlayer.linkedPlayer.id,
              name: sharedMatchPlayer.sharedPlayer.linkedPlayer.name,
              placement: sharedMatchPlayer.matchPlayer.placement,
              winner: sharedMatchPlayer.matchPlayer.winner,
            };
          })
          .filter((p) => p !== null);
        if (linkedGame) {
          return {
            type: "shared" as const,
            id: m.id,
            gameId: m.sharedGame.id,
            date: m.match.date,
            name: m.match.name,
            finished: m.match.finished,
            won:
              mPlayers.findIndex((player) => player.winner && player.isUser) !==
              -1,
            players: mPlayers,
            gameImage: linkedGame.image,
            gameName: linkedGame.name,
          };
        }
        return {
          type: "shared" as const,
          id: m.id,
          gameId: m.sharedGame.id,
          date: m.match.date,
          name: m.match.name,
          finished: m.match.finished,
          won:
            mPlayers.findIndex((player) => player.winner && player.isUser) !==
            -1,
          players: mPlayers,
          gameImage: m.sharedGame.game.image,
          gameName: m.sharedGame.game.name,
        };
      });
      return {
        id: returnedLocation.id,
        name: returnedLocation.location.name,
        isDefault: returnedLocation.isDefault,
        matches: locationMatches,
      };
    }),
} satisfies TRPCRouterRecord;
