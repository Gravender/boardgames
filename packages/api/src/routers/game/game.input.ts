import { z } from "zod/v4";

import {
  insertGameSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/zodSchema";

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
