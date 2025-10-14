import { useMemo } from "react";

interface Role {
  id: number;
  type: "original" | "shared";
  name: string;
  description?: string | null;
  permission: "view" | "edit";
}

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
