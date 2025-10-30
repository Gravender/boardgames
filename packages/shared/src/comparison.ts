import type z from "zod";

import type { originalRoleSchema, sharedRoleSchema } from "./schema";

type Role =
  | z.infer<typeof originalRoleSchema>
  | z.infer<typeof sharedRoleSchema>;
export const isSameRole = (a: Role, b: Role) => {
  if (a.type === "original") {
    return b.type === "original" && a.id === b.id;
  }
  return b.type === a.type && a.sharedId === b.sharedId;
};
