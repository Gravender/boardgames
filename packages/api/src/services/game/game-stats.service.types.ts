import z from "zod/v4";

import { scoreSheetSchema } from "@board-games/shared";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getGameScoresheetStatsScoreSheet = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      scoresheetId: z.number(),
      isDefault: z.boolean(),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      scoresheetId: z.number(),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
    }),
  ]),
);
export type GetGameScoresheetStatsScoreSheetType = z.infer<
  typeof getGameScoresheetStatsScoreSheet
>;
