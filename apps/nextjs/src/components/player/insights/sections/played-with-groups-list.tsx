"use client";

import { Badge } from "@board-games/ui/badge";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";

import type { GroupRow } from "./played-with-groups-types";
import { cohortSize, pct } from "./played-with-groups-utils";
import { CohortPlayerChips, GroupStatBlock } from "./played-with-groups-ui";
import {
  PairwiseSection,
  PlacementSection,
  RecentMatchesCollapsible,
} from "./played-with-groups-sections";

type PlayedWithGroupsListProps = {
  list: GroupRow[];
  listId: string;
};

export const PlayedWithGroupsList = ({
  list,
  listId,
}: PlayedWithGroupsListProps) => {
  if (list.length === 0) {
    return (
      <div
        className="border-border/50 bg-muted/15 text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm"
        role="status"
      >
        No cohorts match your filters. Try clearing search or lowering the
        minimum size.
      </div>
    );
  }
  return (
    <ScrollArea
      className="h-[min(52vh,32rem)] rounded-xl border border-border/50 shadow-inner"
      role="region"
      aria-label={`Played-with groups, ${listId}`}
    >
      <ul className="space-y-3 p-2 sm:p-3" role="list">
        {list.map((g) => {
          const cohort = [g.profileInCohort, ...g.members];
          const cohortTitle = cohort.map((p) => p.name).join(", ");
          return (
            <li
              key={g.groupKey}
              className={cn(
                "border-border/45 bg-card group/card rounded-xl border shadow-sm",
                "motion-safe:transition-shadow motion-safe:duration-200",
                "hover:shadow-md",
              )}
            >
              <div className="p-3 sm:p-3.5">
                <div className="mb-2 flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground line-clamp-2 text-sm font-semibold tracking-tight sm:text-base">
                        <span className="sr-only">Group: </span>
                        {cohortTitle}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-medium tabular-nums">
                          {cohortSize(g)} players
                        </span>
                        <span aria-hidden>·</span>
                        <span>{pct(g.stability)} full-table</span>
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 self-start border border-border/40 px-1.5 py-0 text-[11px] sm:self-center"
                      title="You finished ahead of every cohort member that game (rivals rules)"
                    >
                      {pct(g.winRateWithGroup)} sweep
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <GroupStatBlock
                      label="Matches"
                      value={g.matches}
                      title="Matches where this cohort appeared together"
                    />
                    <GroupStatBlock
                      label="Games"
                      value={g.uniqueGamesPlayed}
                      title="Distinct titles"
                    />
                    <GroupStatBlock
                      label="Your avg place"
                      value={
                        g.avgPlacement !== null
                          ? g.avgPlacement.toFixed(1)
                          : "—"
                      }
                    />
                    <GroupStatBlock
                      label="Your avg score"
                      value={
                        g.avgScore !== null ? g.avgScore.toFixed(1) : "—"
                      }
                    />
                    <GroupStatBlock
                      label="Last played"
                      value={
                        g.lastPlayedAt !== null ? (
                          <FormattedDate
                            date={g.lastPlayedAt}
                            pattern="MMM d, yyyy"
                          />
                        ) : (
                          "—"
                        )
                      }
                    />
                  </div>
                </div>

                <Separator className="my-3 bg-border/50" />

                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide">
                    Roster
                  </p>
                  <CohortPlayerChips
                    cohort={cohort}
                    profileInCohort={g.profileInCohort}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  <PlacementSection group={g} cohortTitle={cohortTitle} />
                  <PairwiseSection group={g} cohortTitle={cohortTitle} />
                  <RecentMatchesCollapsible
                    listId={listId}
                    groupKey={g.groupKey}
                    cohortTitle={cohortTitle}
                    recentMatches={g.recentMatches}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
};
