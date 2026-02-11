"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Input } from "@board-games/ui/input";
import { Progress } from "@board-games/ui/progress";
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

import { PlayerImage } from "~/components/player-image";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type RolesData = NonNullable<Insights["roles"]>;
type RoleSummary = RolesData["roles"][number];
type RolePresenceEffect = RolesData["presenceEffects"][number];
type PlayerRolePerformance = RolesData["playerPerformance"][number];
type CorePlayer = RolePresenceEffect["playerEffects"][number]["player"];

interface RoleInsightsProps {
  roles: RolesData;
}

// ─── Helpers ──────────────────────────────────────────────────────

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const PlayerAvatar = ({
  player,
  className,
}: {
  player: CorePlayer;
  className?: string;
}) => (
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
    className={className}
  />
);

const ClassificationBadge = ({
  classification,
}: {
  classification: "unique" | "team" | "shared";
}) => {
  const config = {
    unique: { label: "Unique", variant: "default" as const },
    team: { label: "Team", variant: "secondary" as const },
    shared: { label: "Shared", variant: "outline" as const },
  };
  const { label, variant } = config[classification];
  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  );
};

// ─── A. Role Summary / Overview ─────────────────────────────────

const RoleSummarySection = ({ roles }: { roles: RoleSummary[] }) => {
  const [search, setSearch] = useState("");

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const query = search.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query),
    );
  }, [roles, search]);

  if (roles.length === 0) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Role Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {roles.length > 4 && (
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
              aria-label="Search roles"
            />
          </div>
        )}
        <ScrollArea>
          <div className="grid max-h-[50vh] gap-3 sm:grid-cols-2">
            {filteredRoles.map((role) => {
              const total =
                role.classificationBreakdown.unique +
                role.classificationBreakdown.team +
                role.classificationBreakdown.shared;
              const uniquePct =
                total > 0
                  ? Math.round(
                      (role.classificationBreakdown.unique / total) * 100,
                    )
                  : 0;
              const teamPct =
                total > 0
                  ? Math.round(
                      (role.classificationBreakdown.team / total) * 100,
                    )
                  : 0;
              const sharedPct = total > 0 ? 100 - uniquePct - teamPct : 0;

              return (
                <div
                  key={role.roleId}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{role.name}</span>
                      <ClassificationBadge
                        classification={role.predominantClassification}
                      />
                    </div>
                    <Badge variant="secondary">{role.matchCount} matches</Badge>
                  </div>

                  {role.description && (
                    <p className="text-muted-foreground text-xs">
                      {role.description}
                    </p>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-medium">
                        {formatPercent(role.winRate)}
                      </span>
                    </div>
                    <Progress
                      value={Math.round(role.winRate * 100)}
                      className="h-2"
                    />
                  </div>

                  {/* Classification breakdown - muted/de-prioritized */}
                  {total > 0 && (
                    <div className="space-y-1 opacity-60">
                      <div className="bg-muted flex h-1.5 overflow-hidden rounded-full">
                        {uniquePct > 0 && (
                          <div
                            className="bg-muted-foreground/40 h-full"
                            style={{ width: `${uniquePct}%` }}
                            title={`Unique: ${uniquePct}%`}
                          />
                        )}
                        {teamPct > 0 && (
                          <div
                            className="bg-muted-foreground/25 h-full"
                            style={{ width: `${teamPct}%` }}
                            title={`Team: ${teamPct}%`}
                          />
                        )}
                        {sharedPct > 0 && (
                          <div
                            className="bg-muted-foreground/15 h-full"
                            style={{ width: `${sharedPct}%` }}
                            title={`Shared: ${sharedPct}%`}
                          />
                        )}
                      </div>
                      <div className="text-muted-foreground flex gap-3 text-[10px]">
                        {uniquePct > 0 && (
                          <span>
                            <span className="bg-muted-foreground/40 mr-1 inline-block h-1.5 w-1.5 rounded-full" />
                            Unique {uniquePct}%
                          </span>
                        )}
                        {teamPct > 0 && (
                          <span>
                            <span className="bg-muted-foreground/25 mr-1 inline-block h-1.5 w-1.5 rounded-full" />
                            Team {teamPct}%
                          </span>
                        )}
                        {sharedPct > 0 && (
                          <span>
                            <span className="bg-muted-foreground/15 mr-1 inline-block h-1.5 w-1.5 rounded-full" />
                            Shared {sharedPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredRoles.length === 0 && (
              <p className="text-muted-foreground col-span-2 py-4 text-center text-sm">
                No roles match &quot;{search}&quot;
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// ─── B. Role Presence Effect ────────────────────────────────────

/** Compact win-rate cell for team-relation columns (null → dash). */
const WinRateCell = ({
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

const PresenceEffectCard = ({ effect }: { effect: RolePresenceEffect }) => {
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
                        <PlayerAvatar player={pe.player} className="h-6 w-6" />
                        <span className="text-sm">{pe.player.playerName}</span>
                      </div>
                    </TableCell>
                    <WinRateCell effect={pe.self} />
                    <WinRateCell effect={pe.sameTeam} />
                    <WinRateCell effect={pe.opposingTeam} />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

const RolePresenceSection = ({
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
          <div className="flex max-h-[50vh] flex-col gap-4">
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

// ─── C. Player Performance by Role Table ────────────────────────

const PlayerPerformanceSection = ({
  playerPerformance,
}: {
  playerPerformance: PlayerRolePerformance[];
}) => {
  if (playerPerformance.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Player Performance by Role
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea>
          <div className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Avg Place</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerPerformance.map((pp) =>
                  pp.roles.map((role, idx) => (
                    <TableRow
                      key={`${pp.player.playerKey}-${role.roleId}`}
                      className={cn(pp.player.isUser && "bg-muted/50")}
                    >
                      {idx === 0 ? (
                        <TableCell rowSpan={pp.roles.length}>
                          <div className="flex items-center gap-2">
                            <PlayerAvatar
                              player={pp.player}
                              className="h-6 w-6"
                            />
                            <span className="text-sm font-medium">
                              {pp.player.playerName}
                            </span>
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell className="text-sm">{role.name}</TableCell>
                      <TableCell className="text-center">
                        <ClassificationBadge
                          classification={role.classification}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatPercent(role.winRate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {role.avgPlacement !== null
                          ? role.avgPlacement.toFixed(1)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {role.avgScore !== null
                          ? role.avgScore.toFixed(1)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {role.matchCount}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ─────────────────────────────────────────────

export function RoleInsights({ roles }: RoleInsightsProps) {
  return (
    <div className="space-y-6">
      <RoleSummarySection roles={roles.roles} />
      <RolePresenceSection presenceEffects={roles.presenceEffects} />
      <PlayerPerformanceSection playerPerformance={roles.playerPerformance} />
    </div>
  );
}
