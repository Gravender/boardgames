import type z from "zod";
import { useMemo } from "react";

import type { originalRoleSchema, sharedRoleSchema } from "@board-games/shared";

type Role =
  | z.infer<typeof originalRoleSchema>
  | z.infer<typeof sharedRoleSchema>;

export function useFilteredRoles(
  roles: z.infer<typeof sharedRoleSchema>[],
  roleSearchTerm: string,
): z.infer<typeof sharedRoleSchema>[];

export function useFilteredRoles(
  roles: z.infer<typeof originalRoleSchema>[],
  roleSearchTerm: string,
): z.infer<typeof originalRoleSchema>[];
export function useFilteredRoles(
  roles: (
    | z.infer<typeof originalRoleSchema>
    | z.infer<typeof sharedRoleSchema>
  )[],
  roleSearchTerm: string,
): (z.infer<typeof originalRoleSchema> | z.infer<typeof sharedRoleSchema>)[];
export function useFilteredRoles(roles: Role[], roleSearchTerm: string) {
  return useMemo(() => {
    const searchTerm = roleSearchTerm.toLowerCase();

    const filtered = roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchTerm) ||
        role.description?.toLowerCase().includes(searchTerm),
    );

    filtered.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aDesc = a.description?.toLowerCase() ?? "";
      const bDesc = b.description?.toLowerCase() ?? "";

      const aNameIndex = aName.indexOf(searchTerm);
      const bNameIndex = bName.indexOf(searchTerm);
      const aDescIndex = aDesc.indexOf(searchTerm);
      const bDescIndex = bDesc.indexOf(searchTerm);

      if (aNameIndex !== -1 && bNameIndex === -1) return -1;
      if (aNameIndex === -1 && bNameIndex !== -1) return 1;

      const aIndex = aNameIndex !== -1 ? aNameIndex : aDescIndex;
      const bIndex = bNameIndex !== -1 ? bNameIndex : bDescIndex;

      if (aIndex !== bIndex) return aIndex - bIndex;
      if (aName !== bName) return aName.localeCompare(bName);
      return aDesc.localeCompare(bDesc);
    });

    return filtered;
  }, [roles, roleSearchTerm]);
}
