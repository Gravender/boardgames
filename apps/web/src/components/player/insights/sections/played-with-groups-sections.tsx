import Link from "next/link";
import { ChevronDown, Swords, Trophy } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Separator } from "@board-games/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import { formatInsightOutcomeStatsLine } from "~/components/player/insights/insight-outcome";
import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";

import { insightMatchHref } from "../player-insights-match-links";

import type { GroupRow } from "./played-with-groups-types";
import { cohortIdentityKey, pct } from "./played-with-groups-utils";

export const PlacementSection = ({
  group,
  cohortTitle,
}: {
  group: GroupRow;
  cohortTitle: string;
}) => {
  if (group.groupOrdering.length === 0) {
    return null;
  }
  return (
    <Collapsible defaultOpen={false} className="group/rank">
      <div className="border-border/40 bg-muted/10 rounded-xl border">
        <CollapsibleTrigger
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={`Average placement ranking for ${cohortTitle}`}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Trophy
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden
            />
            Avg placement
          </span>
          <ChevronDown
            className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/rank:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator className="bg-border/60" />
          <ol
            className="space-y-1.5 p-3 sm:p-4"
            role="list"
            aria-label="Cohort placement ranking"
          >
            {group.groupOrdering.map((row) => (
              <li
                key={cohortIdentityKey(row.player)}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-muted/25"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="bg-primary/18 text-primary flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums"
                    aria-hidden
                  >
                    {row.rank}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {row.player.name}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                  {row.avgPlacement !== null
                    ? row.avgPlacement.toFixed(2)
                    : "—"}
                </span>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const PairwiseSection = ({
  group,
  cohortTitle,
}: {
  group: GroupRow;
  cohortTitle: string;
}) => {
  if (group.pairwiseWithinCohort.length === 0) {
    return null;
  }
  return (
    <Collapsible defaultOpen={false} className="group/pair">
      <div className="border-border/40 bg-muted/10 rounded-xl border">
        <CollapsibleTrigger
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={`Head-to-head stats for ${cohortTitle}`}
        >
          <span className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Swords
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              Head-to-head
            </span>
            <span className="text-muted-foreground text-xs font-normal">
              Rivals rules (placement &amp; manual winners)
            </span>
          </span>
          <ChevronDown
            className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/pair:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator className="bg-border/60" />
          <div className="overflow-x-auto p-2 sm:p-3">
            <Table className="table-fixed text-sm">
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-muted-foreground w-[min(42%,28rem)] py-2.5 font-medium">
                    Matchup
                  </TableHead>
                  <TableHead className="text-muted-foreground w-14 py-2.5 text-right font-medium">
                    Games
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden w-12 py-2.5 text-right font-medium sm:table-cell">
                    <span title="Wins for first player (name order)">A</span>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden w-12 py-2.5 text-right font-medium sm:table-cell">
                    <span title="Wins for second player">B</span>
                  </TableHead>
                  <TableHead className="text-muted-foreground hidden w-12 py-2.5 text-right font-medium md:table-cell">
                    Tie
                  </TableHead>
                  <TableHead className="text-muted-foreground w-16 py-2.5 text-right font-medium">
                    A win %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.pairwiseWithinCohort.map((p) => (
                  <TableRow
                    key={`${cohortIdentityKey(p.playerA)}-${cohortIdentityKey(p.playerB)}`}
                    className="border-border/30"
                  >
                    <TableCell className="py-2.5 align-middle">
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <PlayerImage
                            className="size-6 shrink-0"
                            image={p.playerA.image}
                            alt={p.playerA.name}
                          />
                          <span className="truncate font-medium">
                            {p.playerA.name}
                          </span>
                        </span>
                        <span
                          className="text-muted-foreground hidden w-6 text-center text-xs sm:inline"
                          aria-hidden
                        >
                          vs
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <PlayerImage
                            className="size-6 shrink-0"
                            image={p.playerB.image}
                            alt={p.playerB.name}
                          />
                          <span className="truncate font-medium">
                            {p.playerB.name}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums">
                      {p.matches}
                    </TableCell>
                    <TableCell className="hidden py-2.5 text-right tabular-nums sm:table-cell">
                      {p.winsA}
                    </TableCell>
                    <TableCell className="hidden py-2.5 text-right tabular-nums sm:table-cell">
                      {p.lossesA}
                    </TableCell>
                    <TableCell className="hidden py-2.5 text-right tabular-nums md:table-cell">
                      {p.ties}
                    </TableCell>
                    <TableCell className="py-2.5 text-right tabular-nums">
                      {pct(p.winRateA)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const RecentMatchesCollapsible = ({
  listId,
  groupKey,
  cohortTitle,
  recentMatches,
}: {
  listId: string;
  groupKey: string;
  cohortTitle: string;
  recentMatches: GroupRow["recentMatches"];
}) => {
  if (recentMatches.length === 0) {
    return null;
  }
  const recentHeadingId = `${listId}-${groupKey}-recent-heading`;
  return (
    <Collapsible defaultOpen={false} className="group/recent">
      <div className="border-border/40 bg-muted/10 rounded-lg border">
        <CollapsibleTrigger
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={`Recent matches with ${cohortTitle}`}
        >
          <span
            id={recentHeadingId}
            className="text-muted-foreground font-medium tracking-wide"
          >
            Recent matches
          </span>
          <ChevronDown
            className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/recent:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator className="bg-border/60" />
          <ul
            className="space-y-0.5 p-2"
            role="list"
            aria-labelledby={recentHeadingId}
          >
            {recentMatches.slice(0, 5).map((rm) => {
              const statsLine = formatInsightOutcomeStatsLine({
                outcome: rm.outcome,
                winCondition: rm.scoresheetWinCondition,
              });
              const href = insightMatchHref(rm);
              const rowClass =
                "hover:bg-muted/45 -mx-0.5 flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none sm:text-sm";
              return (
                <li key={`${rm.type}-${rm.matchId}-${rm.date.toISOString()}`}>
                  {href ? (
                    <Link href={href} className={rowClass}>
                      <GameImage
                        image={rm.game.image}
                        alt={rm.game.name}
                        containerClassName="size-7 shrink-0 rounded-md"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {rm.game.name}
                      </span>
                      {statsLine !== null && (
                        <span className="text-muted-foreground tabular-nums">
                          {statsLine}
                        </span>
                      )}
                      <FormattedDate
                        date={rm.date}
                        pattern="MMM d"
                        className="text-muted-foreground shrink-0 tabular-nums"
                      />
                    </Link>
                  ) : (
                    <div
                      className={rowClass}
                      title="Match summary link unavailable for this game and match pairing"
                    >
                      <GameImage
                        image={rm.game.image}
                        alt={rm.game.name}
                        containerClassName="size-7 shrink-0 rounded-md"
                      />
                      <span className="text-muted-foreground min-w-0 flex-1 truncate font-medium">
                        {rm.game.name}
                      </span>
                      {statsLine !== null && (
                        <span className="text-muted-foreground tabular-nums">
                          {statsLine}
                        </span>
                      )}
                      <FormattedDate
                        date={rm.date}
                        pattern="MMM d"
                        className="text-muted-foreground shrink-0 tabular-nums"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
