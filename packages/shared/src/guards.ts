import type { OriginalRole, SharedRole } from "./types";

export const isOriginalRoleGuard = (
  role: OriginalRole | SharedRole,
): role is OriginalRole => role.type === "original";

export const isSharedRoleGuard = (
  role: OriginalRole | SharedRole,
): role is SharedRole => role.type !== "original";
