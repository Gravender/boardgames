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
  game: insertGameSchema.pick({
    description: true,
    name: true,
    playersMin: true,
    playersMax: true,
    playtimeMin: true,
    playtimeMax: true,
    yearPublished: true,
    ownedBy: true,
    rules: true,
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
