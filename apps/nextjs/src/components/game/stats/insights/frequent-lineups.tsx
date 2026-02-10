"use client";

import { useState } from "react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@board-games/ui/sheet";

import { PlayerImage } from "~/components/player-image";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type Lineup = Insights["lineups"][number];
type CorePlayer = Lineup["players"][number];

interface FrequentLineupsProps {
  lineups: Insights["lineups"];
}

const LineupCard = ({
  lineup,
  onSelect,
}: {
  lineup: Lineup;
  onSelect: (lineup: Lineup) => void;
}) => {
  const handleClick = () => {
    onSelect(lineup);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(lineup);
    }
  };

  return (
    <div
      className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Lineup: ${lineup.players.map((p) => p.playerName).join(", ")} - ${lineup.matchCount} matches`}
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-1.5">
          {lineup.players.map((p) => (
            <PlayerAvatar key={p.playerKey} player={p} />
          ))}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {lineup.players.map((p) => p.playerName).join(" + ")}
          </div>
          <div className="text-muted-foreground text-xs">
            {lineup.players.length} players
          </div>
        </div>
      </div>
      <Badge variant="secondary">{lineup.matchCount} matches</Badge>
    </div>
  );
};

const PlayerAvatar = ({ player }: { player: CorePlayer }) => (
  <PlayerImage
    image={
      player.image
        ? {
            ...player.image,
            type:
              player.image.type === "file" || player.image.type === "svg"
                ? player.image.type
                : "file",
            usageType: "player" as const,
          }
        : null
    }
    alt={player.playerName}
    className="ring-background h-7 w-7 ring-2"
  />
);

export function FrequentLineups({ lineups }: FrequentLineupsProps) {
  const [selectedLineup, setSelectedLineup] = useState<Lineup | null>(null);

  const handleSelectLineup = (lineup: Lineup) => {
    setSelectedLineup(lineup);
  };

  const handleSheetClose = () => {
    setSelectedLineup(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Frequent Lineups</CardTitle>
        </CardHeader>
        <CardContent>
          {lineups.length > 0 ? (
            <ScrollArea>
              <div className="flex max-h-[60vh] flex-col gap-2">
                {lineups.map((lineup) => {
                  const lineupKey = lineup.players
                    .map((p) => p.playerKey)
                    .join("|");
                  return (
                    <LineupCard
                      key={lineupKey}
                      lineup={lineup}
                      onSelect={handleSelectLineup}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-sm">
              No recurring exact lineups found (need at least 2 matches with the
              same player group).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet
        open={selectedLineup !== null}
        onOpenChange={(open) => !open && handleSheetClose()}
      >
        {selectedLineup && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {selectedLineup.players.map((p) => p.playerName).join(" + ")}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedLineup.matchCount} matches
                </Badge>
                <Badge variant="outline">
                  {selectedLineup.players.length} players
                </Badge>
              </div>

              {/* Players list */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Players</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLineup.players.map((p) => (
                    <div
                      key={p.playerKey}
                      className="flex items-center gap-1.5 rounded-full border px-2 py-1"
                    >
                      <PlayerAvatar player={p} />
                      <span className="text-sm">{p.playerName}</span>
                      {p.isUser && (
                        <Badge variant="secondary" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Match IDs (basic info) */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Match History</h4>
                <p className="text-muted-foreground text-xs">
                  {selectedLineup.matchCount} matches played with this exact
                  lineup.
                </p>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
