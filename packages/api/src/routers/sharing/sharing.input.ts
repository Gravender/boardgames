import { z } from "zod/v4";

/** One match row when sharing a game bundle */
export const shareGameMatchInput = z.object({
  matchId: z.number(),
  permission: z.enum(["view", "edit"]),
  includePlayers: z.boolean(),
  /** When false, do not attach location share requests for this match */
  includeLocation: z.boolean().optional().default(true),
  /** When set and non-empty, only these player ids (must be on the match) */
  playerIds: z.array(z.number()).optional(),
});

export type ShareGameMatchInputType = z.infer<typeof shareGameMatchInput>;

export const gameRoleToShareInput = z.object({
  gameRoleId: z.number(),
  permission: z.enum(["view", "edit"]),
});

export type GameRoleToShareInputType = z.infer<typeof gameRoleToShareInput>;

export const requestShareGameInput = z
  .object({
    gameId: z.number(),
    permission: z.enum(["view", "edit"]),
    expiresAt: z.date().optional(),
    sharedMatches: z.array(shareGameMatchInput),
    scoresheetsToShare: z
      .array(
        z.object({
          scoresheetId: z.number(),
          permission: z.enum(["view", "edit"]),
        }),
      )
      .min(1),
    gameRolesToShare: z.array(gameRoleToShareInput).optional().default([]),
  })
  .and(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("link"),
      }),
      z.object({
        type: z.literal("friends"),
        friends: z
          .array(
            z.object({
              id: z.string(),
            }),
          )
          .min(1),
      }),
    ]),
  );

export type RequestShareGameInputType = z.infer<typeof requestShareGameInput>;
