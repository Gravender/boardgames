"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { cn } from "@board-games/ui/utils";

import type { Permission } from "./types";

const PERMISSION_LABEL: Record<Permission, string> = {
  view: "View",
  edit: "Edit",
};

type SharePermissionSelectProps = {
  id: string;
  value: Permission;
  onValueChange: (next: Permission) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * View/Edit select with a visible label (Base UI SelectValue otherwise may show the raw value key).
 */
export const SharePermissionSelect = ({
  id,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: SharePermissionSelectProps) => {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as Permission)}>
      <SelectTrigger
        id={id}
        size="sm"
        className={cn("w-[min(100%,140px)]", className)}
        aria-label={ariaLabel}
      >
        <SelectValue>{PERMISSION_LABEL[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="view">View</SelectItem>
        <SelectItem value="edit">Edit</SelectItem>
      </SelectContent>
    </Select>
  );
};

export type PlayerSharePermissionValue = "none" | Permission;

const PLAYER_SHARE_LABEL: Record<PlayerSharePermissionValue, string> = {
  none: "Not shared",
  view: "View",
  edit: "Edit",
};

type PlayerSharePermissionSelectProps = {
  id: string;
  value: PlayerSharePermissionValue;
  onValueChange: (next: PlayerSharePermissionValue) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * View / edit / not shared for per-player rows (explicit SelectValue label).
 */
export const PlayerSharePermissionSelect = ({
  id,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: PlayerSharePermissionSelectProps) => {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as PlayerSharePermissionValue)}
    >
      <SelectTrigger
        id={id}
        size="sm"
        className={cn("w-[min(100%,160px)]", className)}
        aria-label={ariaLabel}
      >
        <SelectValue>{PLAYER_SHARE_LABEL[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not shared</SelectItem>
        <SelectItem value="view">View</SelectItem>
        <SelectItem value="edit">Edit</SelectItem>
      </SelectContent>
    </Select>
  );
};
