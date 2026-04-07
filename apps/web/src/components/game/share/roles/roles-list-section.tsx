"use client";

import { useState } from "react";

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "../share-game-data-context";
import type { ShareGameForm } from "../use-share-game-form";

import { RolesListBody } from "./roles-list-body";
import { RolesToolbar } from "./roles-toolbar";
import {
  filterRolesForShareUi,
  type NameSort,
  type RoleFilter,
} from "./share-roles-filter";

const RolesListInner = ({
  form,
  roleInclusion,
}: {
  form: ShareGameForm;
  roleInclusion: Record<string, boolean>;
}) => {
  const gameData = useShareGameData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<NameSort>("name_asc");

  const rows = filterRolesForShareUi(
    gameData.gameRoles,
    query,
    filter,
    sort,
    roleInclusion,
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Roles to include</h3>
      <RolesToolbar
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
      />
      <RolesListBody form={form} rows={rows} />
    </div>
  );
};

export const RolesListSection = () => {
  const form = useFormContext() as unknown as ShareGameForm;

  return (
    <form.Subscribe selector={(s) => s.values.roleInclusion}>
      {(roleInclusion) => (
        <RolesListInner form={form} roleInclusion={roleInclusion} />
      )}
    </form.Subscribe>
  );
};
