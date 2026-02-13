import type z from "zod";

import {
  insertScoreSheetSchema,
  insertSharedScoresheetSchema,
} from "@board-games/db/zodSchema";

export const insertScoreSheetInput = insertScoreSheetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertScoreSheetInputType = z.infer<typeof insertScoreSheetInput>;

export const insertSharedScoreSheetInput = insertSharedScoresheetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertSharedScoreSheetInputType = z.infer<
  typeof insertSharedScoreSheetInput
>;
