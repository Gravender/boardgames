import { z } from "zod/v4";

import {
  insertGameSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";
import { editScoresheetSchemaApiInput } from "@board-games/shared";

export const getGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedGameId: z.number(),
  }),
]);

export type GetGameInputType = z.infer<typeof getGameInput>;

export const createGameInput = z.object({
  game: insertGameSchema
    .pick({
      description: true,
      name: true,
      playersMin: true,
      playersMax: true,
      playtimeMin: true,
      playtimeMax: true,
      yearPublished: true,
      ownedBy: true,
      rules: true,
    })
    .check((ctx) => {
      if (
        ctx.value.playersMin &&
        ctx.value.playersMax &&
        ctx.value.playersMin > ctx.value.playersMax
      ) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: "Players min must be less than players max",
          path: ["playersMin"],
        });
      }
      if (
        ctx.value.playtimeMin &&
        ctx.value.playtimeMax &&
        ctx.value.playtimeMin > ctx.value.playtimeMax
      ) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: "Playtime min must be less than playtime max",
          path: ["playtimeMin"],
        });
      }
    }),
  image: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("file"),
        imageId: z.number(),
      }),
      z.object({
        type: z.literal("svg"),
        name: z.string(),
      }),
    ])
    .nullable(),
  scoresheets: z.array(
    z.object({
      scoresheet: insertScoreSheetSchema
        .omit({
          id: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          deletedAt: true,
          parentId: true,
          type: true,
          gameId: true,
        })
        .required({ name: true }),
      rounds: z.array(
        insertRoundSchema
          .omit({
            id: true,
            createdAt: true,
            updatedAt: true,
            scoresheetId: true,
          })
          .required({ name: true }),
      ),
    }),
  ),
  roles: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
    }),
  ),
});

export type CreateGameInputType = z.infer<typeof createGameInput>;

export const editGameInput = z.object({
  game: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("updateGame"),
      id: z.number(),
      name: z.string().optional(),
      ownedBy: z.boolean().nullish(),
      image: z
        .discriminatedUnion("type", [
          z.object({
            type: z.literal("file"),
            imageId: z.number(),
          }),
          z.object({
            type: z.literal("svg"),
            name: z.string(),
          }),
        ])
        .nullish(),
      playersMin: z.number().nullish(),
      playersMax: z.number().nullish(),
      playtimeMin: z.number().nullish(),
      playtimeMax: z.number().nullish(),
      yearPublished: z.number().nullish(),
    }),
    z.object({ type: z.literal("default"), id: z.number() }),
  ]),
  scoresheets: z.array(editScoresheetSchemaApiInput),
  scoresheetsToDelete: z.array(
    z.discriminatedUnion("scoresheetType", [
      z.object({
        scoresheetType: z.literal("original"),
        id: z.number(),
      }),
      z.object({
        scoresheetType: z.literal("shared"),
        sharedId: z.number(),
      }),
    ]),
  ),
  updatedRoles: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("original"),
        id: z.number(),
        name: z.string(),
        description: z.string().nullable(),
      }),
      z.object({
        type: z.literal("shared"),
        sharedId: z.number(),
        name: z.string(),
        description: z.string().nullable(),
      }),
    ]),
  ),
  newRoles: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
    }),
  ),
  deletedRoles: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("original"),
        id: z.number(),
      }),
      z.object({
        type: z.literal("shared"),
        sharedId: z.number(),
      }),
    ]),
  ),
});

export type EditGameInputType = z.infer<typeof editGameInput>;

export const importBGGGamesInput = z.object({
  games: z.array(
    z.object({
      bggId: z.number(),
      bggName: z.string(),
      bggYear: z.number(),
      cooperative: z.boolean(),
      designers: z.string(),
      highestWins: z.boolean(),
      id: z.number(),
      isBaseGame: z.number(),
      isExpansion: z.number(),
      maxPlayerCount: z.number(),
      maxPlayTime: z.number(),
      minAge: z.number(),
      minPlayerCount: z.number(),
      minPlayTime: z.number(),
      modificationDate: z.string(),
      name: z.string(),
      noPoints: z.boolean(),
      preferredImage: z.number(),
      previouslyPlayedAmount: z.number(),
      rating: z.number(),
      urlImage: z.string(),
      urlThumb: z.string(),
      usesTeams: z.boolean(),
    }),
  ),
  plays: z.array(
    z.object({
      bggId: z.number(),
      bggLastSync: z.string().optional(),
      durationMin: z.number(),
      entryDate: z.string(),
      expansionPlays: z.array(z.unknown()),
      gameRefId: z.number(),
      ignored: z.boolean(),
      importPlayId: z.number(),
      locationRefId: z.number(),
      manualWinner: z.boolean(),
      metaData: z.string().optional(),
      modificationDate: z.string(),
      nemestatsId: z.number(),
      playDate: z.string(),
      playDateYmd: z.number(),
      playerScores: z.array(
        z.object({
          newPlayer: z.boolean(),
          playerRefId: z.number(),
          rank: z.number(),
          score: z.string(),
          seatOrder: z.number(),
          startPlayer: z.boolean(),
          winner: z.boolean(),
          team: z.string().optional(),
        }),
      ),
      playImages: z.string(),
      rating: z.number(),
      rounds: z.number(),
      scoringSetting: z.number(),
      usesTeams: z.boolean(),
      uuid: z.string(),
      comments: z.string().optional(),
    }),
  ),
  players: z.array(
    z.object({
      bggUsername: z.string().optional(),
      id: z.number(),
      isAnonymous: z.boolean(),
      modificationDate: z.string(),
      name: z.string(),
      uuid: z.string(),
    }),
  ),
  locations: z.array(
    z.object({
      id: z.number(),
      modificationDate: z.string(),
      name: z.string(),
      uuid: z.string(),
    }),
  ),
});

export type ImportBGGGamesInputType = z.infer<typeof importBGGGamesInput>;
