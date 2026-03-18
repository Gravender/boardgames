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

export interface GetPlayersArgs {
  createdBy: string;
  tx?: TransactionType;
}

export interface GetPlayersByGameArgs {
  createdBy: string;
  input:
    | {
        type: "original";
        id: number;
      }
    | {
        type: "shared";
        sharedId: number;
      };
  tx?: TransactionType;
}

export interface GetOriginalPlayerByIdArgs {
  createdBy: string;
  id: number;
  tx?: TransactionType;
}

export interface GetSharedPlayerByIdArgs {
  sharedWithId: string;
  id: number;
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
