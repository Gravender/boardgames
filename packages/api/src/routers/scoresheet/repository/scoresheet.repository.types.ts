import z from "zod";

import type { TransactionType } from "@board-games/db/client";
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

export const updateRoundSchema = insertRoundSchema
  .pick({
    score: true,
    type: true,
    color: true,
    lookup: true,
    modifier: true,
  })
  .extend({
    name: z.string().optional(),
  });
type UpdateRoundInputType = z.infer<typeof updateRoundSchema>;
export interface UpdateRoundType {
  id: number;
  input: UpdateRoundInputType;
  tx?: TransactionType;
}
