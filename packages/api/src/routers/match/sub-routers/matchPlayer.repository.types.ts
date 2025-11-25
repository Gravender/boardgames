import type z from "zod";

import { insertSharedMatchPlayerSchema } from "@board-games/db/zodSchema";

export const insertSharedMatchPlayerSchemaInput =
  insertSharedMatchPlayerSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });
export type InsertSharedMatchPlayerInputType = z.infer<
  typeof insertSharedMatchPlayerSchemaInput
>;
