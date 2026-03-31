"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Calendar, Clock, Gamepad2, Info, Users } from "lucide-react";
import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { buttonVariants } from "@board-games/ui/components/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Label } from "@board-games/ui/label";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Separator } from "@board-games/ui/separator";
import { Switch } from "@board-games/ui/switch";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import {
  deriveInsightOutcomeKind,
  formatInsightOutcomeStatsLine,
  isScoreOnlyWinCondition,
} from "../insight-outcome";
import { insightMatchHref } from "../player-insights-match-links";
type Data = RouterOutputs["newPlayer"]["stats"]["getPlayerRecentMatches"];
type MatchRow = Data["matches"][number];
type Outcome = MatchRow["outcome"];

type SortKey = "date" | "game" | "result";
type SortDir = "asc" | "desc";

const profileOutcomePresentation = (
  o: Outcome,
  isCoop: boolean,
): { label: string; srLabel: string; kind: "win" | "loss" | "tie" } => {
  const kind = deriveInsightOutcomeKind(o);
  if (kind === "win") {
    return {
      kind,
      label: isCoop ? "Team victory" : "Won",
      srLabel: isCoop ? "team victory" : "won",
    };
  }
  if (kind === "tie") {
    return { kind, label: "Tie", srLabel: "tie" };
  }
  return {
    kind,
    label: isCoop ? "Team defeat" : "Lost",
    srLabel: isCoop ? "team defeat" : "lost",
  };
};

const viewerOutcomePresentation = (
  o: Outcome,
  isCoop: boolean,
): { label: string; kind: "win" | "loss" | "tie" } => {
  const kind = deriveInsightOutcomeKind(o);
  if (kind === "win") {
    return {
      kind,
      label: isCoop ? "Your team won" : "You won",
    };
  }
  if (kind === "tie") {
    return { kind, label: "You tied" };
  }
  return {
    kind,
    label: isCoop ? "Your team lost" : "You lost",
  };
};

const renderViewerStatsLine = ({
  outcome,
  winCondition,
}: {
  outcome: Outcome;
  winCondition: MatchRow["scoresheetWinCondition"];
}): ReactNode => {
  const line = formatInsightOutcomeStatsLine({
    outcome,
    winCondition,
  });
  if (line === null && isScoreOnlyWinCondition(winCondition)) {
    return null;
  }
  return (
    <span className="border-border border-l pl-3 tabular-nums">
      {line === null ? "You: —" : `You: ${line}`}
    </span>
  );
};

export function RecentMatches({
  data,
  profileName,
}: {
  data: Data;
  profileName: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showViewerColumn, setShowViewerColumn] = useState(true);

  const sortedMatches = useMemo(() => {
    const list = [...data.matches];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "date") {
        return (a.date.getTime() - b.date.getTime()) * dir;
      }
      if (sortKey === "game") {
        return a.game.name.localeCompare(b.game.name) * dir;
      }
      const rank = (m: MatchRow) => {
        const k = deriveInsightOutcomeKind(m.outcome);
        if (k === "win") return 2;
        if (k === "tie") return 1;
        return 0;
      };
      return (rank(a) - rank(b)) * dir;
    });
    return list;
  }, [data.matches, sortKey, sortDir]);

  const hasViewerExtras = data.matches.some(
    (m) =>
      m.viewerParticipation.inMatch &&
      !m.viewerParticipation.isSameAsProfilePlayer,
  );

  const recentMatchSortKeyItems = useMemo(
    () =>
      ({
        date: "Date",
        game: "Game name",
        result: "Result",
      }) satisfies Record<SortKey, string>,
    [],
  );

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            "flex flex-wrap items-center gap-2 text-xl font-semibold md:text-2xl",
            "font-(family-name:--font-insights-display)",
          )}
        >
          <Calendar className="h-5 w-5 shrink-0" aria-hidden />
          Recent matches
        </CardTitle>
        <CardDescription>
          Results for{" "}
          <span className="text-foreground font-medium">{profileName}</span>.
          Win, loss, and tie follow the same rules as game stats (including
          placement-based wins and manual winner picks). They reflect this
          player&apos;s outcome, not another account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">No matches yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recent-matches-sort">Sort by</Label>
                  <Select
                    value={sortKey}
                    items={recentMatchSortKeyItems}
                    onValueChange={(v) => setSortKey(v as SortKey)}
                  >
                    <SelectTrigger id="recent-matches-sort" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="game">Game name</SelectItem>
                      <SelectItem value="result">Result</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recent-matches-order">Order</Label>
                  <Select
                    value={sortDir}
                    itemToStringLabel={(v) => {
                      if (v === "desc") {
                        return sortKey === "date"
                          ? "Newest first"
                          : sortKey === "game"
                            ? "Z to A"
                            : "Best first";
                      }
                      if (v === "asc") {
                        return sortKey === "date"
                          ? "Oldest first"
                          : sortKey === "game"
                            ? "A to Z"
                            : "Worst first";
                      }
                      return String(v);
                    }}
                    onValueChange={(v) => setSortDir(v as SortDir)}
                  >
                    <SelectTrigger id="recent-matches-order" className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">
                        {sortKey === "date"
                          ? "Newest first"
                          : sortKey === "game"
                            ? "Z to A"
                            : "Best first"}
                      </SelectItem>
                      <SelectItem value="asc">
                        {sortKey === "date"
                          ? "Oldest first"
                          : sortKey === "game"
                            ? "A to Z"
                            : "Worst first"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasViewerExtras && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="recent-matches-viewer"
                    checked={showViewerColumn}
                    onCheckedChange={setShowViewerColumn}
                  />
                  <Label
                    htmlFor="recent-matches-viewer"
                    className="text-muted-foreground cursor-pointer text-sm leading-snug"
                  >
                    Show my results when I played
                  </Label>
                </div>
              )}
            </div>

            <ScrollArea
              className="h-[min(40vh,28rem)] rounded-xl border"
              role="region"
              aria-label={`${profileName} recent matches, sorted by ${sortKey}`}
            >
              <ul
                className="flex flex-col gap-2 p-2 sm:p-3"
                role="list"
                aria-live="polite"
              >
                {sortedMatches.map((m) => {
                  const href = insightMatchHref(m);
                  const profile = profileOutcomePresentation(
                    m.outcome,
                    m.isCoop,
                  );
                  const vp = m.viewerParticipation;
                  const showViewer =
                    showViewerColumn && vp.inMatch && !vp.isSameAsProfilePlayer;

                  const viewer = vp.inMatch
                    ? viewerOutcomePresentation(vp.outcome, m.isCoop)
                    : null;

                  const ariaLabel = `View match ${m.game.name}, ${
                    vp.isSameAsProfilePlayer
                      ? `your result ${profile.srLabel}`
                      : `${profileName} ${profile.srLabel}`
                  }${
                    showViewer && viewer ? `, your account ${viewer.label}` : ""
                  }`;

                  return (
                    <li key={`${m.type}-${m.matchId}-${m.date.toISOString()}`}>
                      <div className="flex flex-col gap-2 rounded-lg border p-2 sm:p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <GameImage
                              image={m.game.image}
                              alt=""
                              containerClassName="size-12 shrink-0 rounded-lg"
                            />
                            <div className="min-w-0 flex-1">
                              {href ? (
                                <Link
                                  href={href}
                                  className="block truncate font-medium hover:underline"
                                >
                                  {m.game.name}
                                </Link>
                              ) : (
                                <span
                                  className="text-muted-foreground block truncate font-medium"
                                  title="Match summary link unavailable for this game and match pairing"
                                >
                                  {m.game.name}
                                </span>
                              )}
                              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                <FormattedDate
                                  date={m.date}
                                  Icon={Calendar}
                                  pattern="PPP"
                                />
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" aria-hidden />
                                  {m.playerCount} players
                                </span>
                                {m.isCoop && (
                                  <span className="flex items-center gap-1">
                                    <Gamepad2
                                      className="h-3.5 w-3.5"
                                      aria-hidden
                                    />
                                    Co-op
                                  </span>
                                )}
                                {m.scoresheetWinCondition === "Manual" && (
                                  <span className="flex items-center gap-1">
                                    <Info className="h-3.5 w-3.5" aria-hidden />
                                    Manual winners
                                  </span>
                                )}
                                {m.scoresheetWinCondition === "No Winner" && (
                                  <span className="flex items-center gap-1">
                                    <Info className="h-3.5 w-3.5" aria-hidden />
                                    No winner
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                            <Badge
                              variant={
                                profile.kind === "win"
                                  ? "default"
                                  : profile.kind === "tie"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className={cn(
                                profile.kind === "win" &&
                                  "bg-emerald-600 hover:bg-emerald-600/90",
                                profile.kind === "tie" &&
                                  "bg-amber-600/90 hover:bg-amber-600/90",
                              )}
                            >
                              {vp.isSameAsProfilePlayer
                                ? `You: ${profile.label}`
                                : `${profileName}: ${profile.label}`}
                            </Badge>
                            {showViewer && viewer !== null && (
                              <Badge variant="outline" className="font-normal">
                                {viewer.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="tabular-nums">
                              {formatInsightOutcomeStatsLine({
                                outcome: m.outcome,
                                winCondition: m.scoresheetWinCondition,
                              }) ?? "—"}
                            </span>
                            {showViewer &&
                              viewer !== null &&
                              vp.outcome !== undefined &&
                              renderViewerStatsLine({
                                outcome: vp.outcome,
                                winCondition: m.scoresheetWinCondition,
                              })}
                          </div>
                          {href ? (
                            <Link
                              href={href}
                              aria-label={ariaLabel}
                              className={buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              })}
                            >
                              Open match
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            <p className="text-muted-foreground mt-1 text-xs">
              <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Co-op matches show team victory or defeat for {profileName}.{" "}
              <span className="whitespace-nowrap">
                <Clock className="mr-0.5 inline h-3 w-3" aria-hidden />
                Duration and location appear on the match page.
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
