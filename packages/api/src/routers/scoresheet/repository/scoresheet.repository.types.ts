import type z from "zod";

import {
  insertRoundSchema,
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

export const insertRoundSchemaInput = insertRoundSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertRoundInputType = z.infer<typeof insertRoundSchemaInput>;
