import type z from "zod";

import { insertSharedPlayerSchema } from "@board-games/db/zodSchema";

export interface GetPlayersForMatchArgs {
  createdBy: string;
}
export interface GetRecentMatchWithPlayersArgs {
  createdBy: string;
}

export const insertSharedPlayerSchemaInput = insertSharedPlayerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharedPlayerInputType = z.infer<
  typeof insertSharedPlayerSchemaInput
>;
