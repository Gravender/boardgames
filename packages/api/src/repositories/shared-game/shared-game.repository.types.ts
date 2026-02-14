import type z from "zod";

import type { TransactionType } from "@board-games/db/client";
import { insertSharedGameSchema } from "@board-games/db/zodSchema";

export const insertSharedGameInputSchema = insertSharedGameSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
type InsertSharedGameInputType = z.infer<typeof insertSharedGameInputSchema>;
export interface InsertSharedGameInputArgs {
  input: InsertSharedGameInputType;
  tx?: TransactionType;
}
export interface LinkedSharedGameArgs {
  input: {
    sharedGameId: number;
    linkedGameId: number;
  };
  tx?: TransactionType;
}
