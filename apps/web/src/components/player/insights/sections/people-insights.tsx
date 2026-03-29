"use client";

import { useMemo, useState } from "react";
import { Swords, UserPlus, UsersRound } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Label } from "@board-games/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { PlayedWithGroupsSection } from "./played-with-groups";
import { RivalsTable, TeammatesTable } from "./people-social-tables";

type Rivals = RouterOutputs["newPlayer"]["stats"]["getPlayerTopRivals"];
type Teammates = RouterOutputs["newPlayer"]["stats"]["getPlayerTopTeammates"];
type Groups = RouterOutputs["newPlayer"]["stats"]["getPlayerPlayedWithGroups"];

type PeopleSub = "rivals" | "teammates" | "groups";

const PEOPLE_SUB_TABS: {
  value: PeopleSub;
  label: string;
  icon: typeof Swords;
}[] = [
  { value: "rivals", label: "Rivals", icon: Swords },
  { value: "teammates", label: "Teammates", icon: UserPlus },
  { value: "groups", label: "Groups", icon: UsersRound },
];

export function PeopleInsightsSection({
  rivals,
  teammates,
  groups,
}: {
  rivals: Rivals;
  teammates: Teammates;
  groups: Groups;
}) {
  const [sub, setSub] = useState<PeopleSub>("rivals");

  const summary = useMemo(
    () => ({
      rivals: rivals.rivals.length,
      teammates: teammates.teammates.length,
      groups: groups.playedWithGroups.length,
    }),
    [
      rivals.rivals.length,
      teammates.teammates.length,
      groups.playedWithGroups.length,
    ],
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="border-border/60 bg-muted/30 rounded-xl border px-3 py-3 text-center sm:px-4 sm:py-4">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-xs">
            Rivals
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
            {summary.rivals}
          </p>
        </div>
        <div className="border-border/60 bg-muted/30 rounded-xl border px-3 py-3 text-center sm:px-4 sm:py-4">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-xs">
            Teammates
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
            {summary.teammates}
          </p>
        </div>
        <div className="border-border/60 bg-muted/30 rounded-xl border px-3 py-3 text-center sm:px-4 sm:py-4">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-xs">
            Groups
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
            {summary.groups}
          </p>
        </div>
      </div>

      <Tabs
        value={sub}
        onValueChange={(v) => setSub(v as PeopleSub)}
        className="w-full gap-6"
      >
        <div className="flex flex-col gap-3">
          <div className="md:hidden">
            <Label
              htmlFor="people-sub-mobile"
              className="mb-1.5 block text-sm font-medium"
            >
              View
            </Label>
            <Select value={sub} onValueChange={(v) => setSub(v as PeopleSub)}>
              <SelectTrigger id="people-sub-mobile" className="w-full">
                <SelectValue placeholder="Choose view" />
              </SelectTrigger>
              <SelectContent>
                {PEOPLE_SUB_TABS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsList className="bg-muted text-muted-foreground hidden h-auto w-full grid-cols-3 gap-1 p-1 md:grid md:rounded-lg">
            {PEOPLE_SUB_TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="gap-2 px-3 py-2.5 text-sm"
              >
                <t.icon className="size-4 shrink-0" aria-hidden />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="rivals" className="mt-0 outline-none">
          <RivalsTable data={rivals} />
        </TabsContent>

        <TabsContent value="teammates" className="mt-0 outline-none">
          <TeammatesTable data={teammates} />
        </TabsContent>

        <TabsContent value="groups" className="mt-0 outline-none">
          <PlayedWithGroupsSection data={groups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
