import type { ReactNode } from "react";

/**
 * Build Base UI Select `items` (value → label) so the trigger shows labels when
 * the list is closed.
 * @see https://base-ui.com/react/components/select
 */
export const selectItemsFromPairs = (
  pairs: ReadonlyArray<{ value: string; label: ReactNode }>,
): Record<string, ReactNode> =>
  Object.fromEntries(pairs.map((p) => [p.value, p.label]));

export const viewEditPermissionSelectItems: Record<string, string> = {
  view: "View",
  edit: "Edit",
};
