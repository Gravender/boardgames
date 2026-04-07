"use client";

import { ToggleGroup, ToggleGroupItem } from "@board-games/ui/toggle-group";

import type { Permission } from "./types";

type SharePermissionTierToggleProps = {
  /** When `"mixed"`, neither segment is selected until the user picks View or Edit. */
  value: Permission | "mixed";
  onValueChange: (next: Permission) => void;
  id?: string;
  "aria-label": string;
};

/**
 * Two-segment View / Edit control (replaces a plain select for clearer bulk intent).
 */
export const SharePermissionTierToggle = ({
  value,
  onValueChange,
  id,
  "aria-label": ariaLabel,
}: SharePermissionTierToggleProps) => {
  return (
    <ToggleGroup
      id={id}
      value={value === "mixed" ? [] : [value]}
      onValueChange={(v) => {
        const next = v[0] as Permission | undefined;
        if (next === "view" || next === "edit") {
          onValueChange(next);
        }
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className="w-fit shrink-0"
      aria-label={ariaLabel}
    >
      <ToggleGroupItem value="view">View</ToggleGroupItem>
      <ToggleGroupItem value="edit">Edit</ToggleGroupItem>
    </ToggleGroup>
  );
};
