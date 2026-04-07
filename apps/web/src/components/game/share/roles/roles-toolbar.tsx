"use client";

import { Search } from "lucide-react";

import { Input } from "@board-games/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import {
  ROLE_FILTER_LABEL,
  ROLE_SORT_LABEL,
  type NameSort,
  type RoleFilter,
} from "./share-roles-filter";

type RolesToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  filter: RoleFilter;
  onFilterChange: (value: RoleFilter) => void;
  sort: NameSort;
  onSortChange: (value: NameSort) => void;
};

export const RolesToolbar = ({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: RolesToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-[min(100%,14rem)]">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search roles…"
          className="h-9 pl-8"
          aria-label="Search roles"
        />
      </div>
      <Select
        value={filter}
        onValueChange={(v) => onFilterChange(v as RoleFilter)}
      >
        <SelectTrigger className="h-9 w-[min(100%,150px)] sm:w-[140px]">
          <SelectValue>{ROLE_FILTER_LABEL[filter]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="on">Included only</SelectItem>
          <SelectItem value="off">Not included</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => onSortChange(v as NameSort)}>
        <SelectTrigger className="h-9 w-[min(100%,150px)] sm:w-[140px]">
          <SelectValue>{ROLE_SORT_LABEL[sort]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name_asc">Name A–Z</SelectItem>
          <SelectItem value="name_desc">Name Z–A</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
