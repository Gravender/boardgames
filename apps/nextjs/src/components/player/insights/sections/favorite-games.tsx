"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { RouterOutputs } from "@board-games/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

import {
  SortableTableHead,
  useSortableTableState,
} from "~/components/sortable-header-table";
import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";

type Data = RouterOutputs["newPlayer"]["getPlayerFavoriteGames"];

type SortKey =
  | "name"
  | "plays"
  | "wins"
  | "winRate"
  | "avgScore"
  | "lastPlayed";

const gameStatsHref = (
  game: Data["games"][number],
): { href: string; label: string } => {
  if (game.type === "original") {
    return { href: `/dashboard/games/${game.id}/stats`, label: game.name };
  }
  return {
    href: `/dashboard/games/shared/${game.sharedGameId}/stats`,
    label: game.name,
  };
};

export function FavoriteGamesSection({ data }: { data: Data }) {
  const { sortKey, sortDir, onSort } = useSortableTableState<SortKey>("plays", {
    defaultDir: "desc",
    textAscendingKeys: ["name"],
  });

  const sortedGames = useMemo(() => {
    const list = [...data.games];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "plays":
          return (a.plays - b.plays) * dir;
        case "wins":
          return (a.wins - b.wins) * dir;
        case "winRate":
          return (a.winRate - b.winRate) * dir;
        case "avgScore": {
          const av = a.avgScore ?? -Infinity;
          const bv = b.avgScore ?? -Infinity;
          return (av - bv) * dir;
        }
        case "lastPlayed": {
          const at = a.lastPlayed?.getTime() ?? 0;
          const bt = b.lastPlayed?.getTime() ?? 0;
          return (at - bt) * dir;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [data.games, sortKey, sortDir]);

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-[family-name:var(--font-insights-display)]",
          )}
        >
          Favorite games
        </CardTitle>
        <CardDescription>
          Plays, wins, and win rate by title. Use column headers to sort.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.games.length === 0 ? (
          <p className="text-muted-foreground text-sm">No games yet.</p>
        ) : (
          <ScrollArea
            className="h-[min(50vh,32rem)] rounded-md border"
            role="region"
            aria-label="Favorite games, sortable table"
          >
            <Table>
              <TableHeader className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-[48px]" />
                  <SortableTableHead
                    label="Game"
                    columnKey="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                  <SortableTableHead
                    label="Plays"
                    columnKey="plays"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="right"
                    className="text-right"
                  />
                  <SortableTableHead
                    label="Wins"
                    columnKey="wins"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="right"
                    className="text-right"
                  />
                  <SortableTableHead
                    label="Win rate"
                    columnKey="winRate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="right"
                    className="text-right"
                  />
                  <SortableTableHead
                    label="Avg score"
                    columnKey="avgScore"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="right"
                    className="text-right"
                  />
                  <SortableTableHead
                    label="Last played"
                    columnKey="lastPlayed"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    align="right"
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGames.map((g) => {
                  const { href } = gameStatsHref(g);
                  return (
                    <TableRow key={`${g.type}-${g.id}`}>
                      <TableCell className="w-12">
                        <GameImage
                          image={g.image}
                          alt=""
                          containerClassName="size-10 rounded-md"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={href}
                          className="hover:text-primary underline-offset-4 hover:underline"
                        >
                          {g.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.plays}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.wins}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Math.round(g.winRate * 100)}%
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right">
                        {g.avgScore !== null ? g.avgScore.toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {g.lastPlayed !== null ? (
                          <FormattedDate
                            date={g.lastPlayed}
                            pattern="MMM d, yyyy"
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
