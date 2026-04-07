import { z } from "zod/v4";

/** One match row when sharing a game bundle */
export const shareGameMatchInput = z.object({
  matchId: z.number(),
  permission: z.enum(["view", "edit"]),
  includePlayers: z.boolean(),
  /** When false, do not attach location share requests for this match */
  includeLocation: z.boolean().optional().default(true),
  /** When set, only these player ids (must be on the match); must include at least one id */
  playerIds: z.array(z.number()).min(1).optional(),
});

export type ShareGameMatchInputType = z.infer<typeof shareGameMatchInput>;

export const gameRoleToShareInput = z.object({
  gameRoleId: z.number(),
  permission: z.enum(["view", "edit"]),
});

export type GameRoleToShareInputType = z.infer<typeof gameRoleToShareInput>;

const scoresheetsToShareSchema = z
  .array(
    z.object({
      scoresheetId: z.number(),
      permission: z.enum(["view", "edit"]),
    }),
  )
  .min(1);

/**
 * Payload applied to one friend when sharing a game (matches, scoresheets, roles, root permission).
 */
export const shareGameFriendRecipientInput = z.object({
  id: z.string(),
  permission: z.enum(["view", "edit"]),
  sharedMatches: z.array(shareGameMatchInput),
  scoresheetsToShare: scoresheetsToShareSchema,
  gameRolesToShare: z.array(gameRoleToShareInput).optional().default([]),
});

export type ShareGameFriendRecipientInputType = z.infer<
  typeof shareGameFriendRecipientInput
>;

/** One friend’s share bundle plus `gameId` / `expiresAt` for workflow execution. */
export type ShareGameToFriendInputType = Omit<
  ShareGameFriendRecipientInputType,
  "id"
> & {
  gameId: number;
  expiresAt?: Date;
};

export const requestShareGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    gameId: z.number(),
    permission: z.enum(["view", "edit"]),
    expiresAt: z.date().optional(),
    sharedMatches: z.array(shareGameMatchInput),
    scoresheetsToShare: scoresheetsToShareSchema,
    gameRolesToShare: z.array(gameRoleToShareInput).optional().default([]),
  }),
  z.object({
    type: z.literal("friends"),
    gameId: z.number(),
    expiresAt: z.date().optional(),
    friends: z.array(shareGameFriendRecipientInput).min(1),
  }),
]);

export type RequestShareGameInputType = z.infer<typeof requestShareGameInput>;
