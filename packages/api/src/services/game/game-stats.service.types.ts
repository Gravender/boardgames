import z from "zod/v4";

import { scoreSheetSchema } from "@board-games/shared";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getGameScoresheetStatsScoreSheet = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      scoresheetId: z.number(),
      scoresheetType: z.literal("original"),
      isDefault: z.boolean(),
    }),
    scoreSheetSchema.safeExtend({
      scoresheetId: z.number(),
      scoresheetType: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
    }),
  ]),
);
export type GetGameScoresheetStatsScoreSheetType = z.infer<
  typeof getGameScoresheetStatsScoreSheet
>;
