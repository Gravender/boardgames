import z from "zod/v4";

import { selectGameRoleSchema } from "@board-games/db/zodSchema";
import {
  baseGameForMatchSchema,
  baseLocationSchema,
  baseMatchPlayerSchema,
  baseMatchSchema,
  sharedOrLinkedSchema,
  sharedOrOriginalOrLinkedSchema,
} from "@board-games/shared";

const sharedMatchWithGameAndPlayersSchema = baseMatchSchema.extend({
  type: z.literal("shared"),
  sharedMatchId: z.number(),
  game: baseGameForMatchSchema.extend({
    type: sharedOrLinkedSchema,
    sharedGameId: z.number(),
    linkedGameId: z.number().nullable(),
  }),
  location: baseLocationSchema.nullable(),
  matchPlayers: z.array(
    baseMatchPlayerSchema.extend({
      type: z.literal("shared"),
      playerType: z.literal(["linked", "shared", "not-shared"]),
      sharedPlayerId: z.number().nullable(),
      linkedPlayerId: z.number().nullable(),
    }),
  ),
});
export type sharedMatchWithGameAndPlayersSchema = z.infer<
  typeof sharedMatchWithGameAndPlayersSchema
>;
const originalMatchWithGameAndPlayersSchema = baseMatchSchema.extend({
  type: z.literal("original"),
  game: baseGameForMatchSchema.extend({
    type: z.literal("original"),
  }),
  location: baseLocationSchema.nullable(),
  matchPlayers: z.array(
    baseMatchPlayerSchema.extend({
      type: z.literal("original"),
      playerType: z.literal("original"),
    }),
  ),
});
export type originalMatchWithGameAndPlayersSchema = z.infer<
  typeof originalMatchWithGameAndPlayersSchema
>;
const combinedMatchWithGameAndPlayersSchema = z.discriminatedUnion("type", [
  originalMatchWithGameAndPlayersSchema,
  sharedMatchWithGameAndPlayersSchema,
]);
export const getGameMatchesOutput = z.array(
  combinedMatchWithGameAndPlayersSchema,
);
export type GetGameMatchesOutputType = z.infer<typeof getGameMatchesOutput>;

export const getGameRolesOutput = z.array(
  selectGameRoleSchema
    .pick({
      id: true,
      name: true,
      description: true,
    })
    .extend({
      type: sharedOrOriginalOrLinkedSchema,
      permission: z.literal("view").or(z.literal("edit")),
    }),
);
export type GetGameRolesOutputType = z.infer<typeof getGameRolesOutput>;
