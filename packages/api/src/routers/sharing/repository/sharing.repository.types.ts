import type z from "zod";

import { insertShareRequestSchema } from "@board-games/db/zodSchema";

export const insertShareRequestSchemaInput = insertShareRequestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertShareRequestInputType = z.infer<
  typeof insertShareRequestSchemaInput
>;
