"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, Sparkles } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Input } from "@board-games/ui/input";
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

import type { RolePresenceEffect } from "./role-insights-helpers";
import {
  ClassificationBadge,
  formatPercent,
  PlayerAvatar,
} from "./role-insights-helpers";

/** Compact win-rate cell for team-relation columns (null -> dash). */
export const WinRateCell = ({
  effect,
}: {
  effect: { winRate: number; matches: number } | null;
}) => {
  if (!effect) {
    return (
      <TableCell className="text-muted-foreground text-right text-xs">
        -
      </TableCell>
    );
  }
  return (
    <TableCell className="text-right text-sm">
      {formatPercent(effect.winRate)}
      <span className="text-muted-foreground ml-1 text-[10px]">
        ({effect.matches})
      </span>
    </TableCell>
  );
};

export const PresenceEffectCard = ({
  effect,
}: {
  effect: RolePresenceEffect;
}) => {
  const hasPlayers = effect.playerEffects.length > 0;
  const hasRoles = effect.roleEffects.length > 0;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{effect.name}</span>
          <ClassificationBadge classification={effect.classification} />
        </div>
        <Badge variant="secondary">{effect.matchCount} matches</Badge>
      </div>

      {/* Collapsible: Players */}
      {hasPlayers && (
        <Collapsible>
          <CollapsibleTrigger
            className="flex w-full items-center gap-1.5 text-sm font-medium"
            aria-label={`Toggle player effects for ${effect.name}`}
            tabIndex={0}
          >
            <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            Players ({effect.playerEffects.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea>
              <div className="max-h-[25vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Self</TableHead>
                      <TableHead className="text-right">Ally</TableHead>
                      <TableHead className="text-right">Opposing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effect.playerEffects.map((pe) => (
                      <TableRow
                        key={pe.player.playerKey}
                        className={cn(pe.player.isUser && "bg-muted/50")}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              player={pe.player}
                              className="h-6 w-6"
                            />
                            <span className="text-sm">
                              {pe.player.playerName}
                            </span>
                          </div>
                        </TableCell>
                        <WinRateCell effect={pe.self} />
                        <WinRateCell effect={pe.sameTeam} />
                        <WinRateCell effect={pe.opposingTeam} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Collapsible: Other Roles */}
      {hasRoles && (
        <Collapsible>
          <CollapsibleTrigger
            className="flex w-full items-center gap-1.5 text-sm font-medium"
            aria-label={`Toggle role effects for ${effect.name}`}
            tabIndex={0}
          >
            <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            Roles ({effect.roleEffects.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea>
              <div className="max-h-[25vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Other Role</TableHead>
                      <TableHead className="text-right">Same Player</TableHead>
                      <TableHead className="text-right">Ally</TableHead>
                      <TableHead className="text-right">Opposing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effect.roleEffects.map((re) => (
                      <TableRow key={re.otherRoleId}>
                        <TableCell className="text-sm font-medium">
                          {re.otherRoleName}
                        </TableCell>
                        <WinRateCell effect={re.samePlayer} />
                        <WinRateCell effect={re.sameTeam} />
                        <WinRateCell effect={re.opposingTeam} />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export const RolePresenceSection = ({
  presenceEffects,
}: {
  presenceEffects: RolePresenceEffect[];
}) => {
  const [search, setSearch] = useState("");

  const filteredEffects = useMemo(() => {
    if (!search.trim()) return presenceEffects.filter((e) => e.matchCount >= 5);
    const query = search.toLowerCase();
    return presenceEffects.filter(
      (e) =>
        e.matchCount >= 5 &&
        (e.name.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query)),
    );
  }, [presenceEffects, search]);

  if (presenceEffects.length === 0) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Role Presence Effects
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          How does win rate change when a role is present in the match?
        </p>

        {presenceEffects.length > 4 && (
          <div className="relative mb-4">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8"
              aria-label="Search role presence effects"
            />
          </div>
        )}

        <ScrollArea>
          <div className="flex max-h-[45vh] flex-col gap-4">
            {filteredEffects.map((effect) => (
              <PresenceEffectCard key={effect.roleId} effect={effect} />
            ))}
            {filteredEffects.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No roles match &quot;{search}&quot;
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
