import type z from "zod";

import type { TransactionType } from "@board-games/db/client";
import { insertSharedPlayerSchema } from "@board-games/db/zodSchema";

export interface GetPlayersForMatchArgs {
  createdBy: string;
  tx?: TransactionType;
}
export interface GetRecentMatchWithPlayersArgs {
  createdBy: string;
  tx?: TransactionType;
}

export const insertSharedPlayerSchemaInput = insertSharedPlayerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharedPlayerInputType = z.infer<
  typeof insertSharedPlayerSchemaInput
>;
