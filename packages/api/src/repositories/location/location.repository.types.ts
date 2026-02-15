import type z from "zod";

import type { TransactionType } from "@board-games/db/client";
import {
  insertLocationSchema,
  insertSharedLocationSchema,
} from "@board-games/db/zodSchema";

export const locationSchemaInput = insertLocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertLocationInputType = z.infer<typeof locationSchemaInput>;

export const sharedLocationSchemaInput = insertSharedLocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertSharedLocationInputType = z.infer<
  typeof sharedLocationSchemaInput
>;

export interface GetLocationsArgs {
  userId: string;
}

export interface LinkedSharedLocationArgs {
  input: {
    sharedLocationId: number;
    linkedLocationId: number;
  };
  tx?: TransactionType;
}
