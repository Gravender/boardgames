"use client";

import {  Check, ChevronsUpDown, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";
import { useRoleStats } from "~/hooks/game-stats/use-role-stats";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type RoleStats = GameStats["roleStats"][number];

export function RoleAnalysisTab({ roleStats }: { roleStats: RoleStats[] }) {
  const {
    selectedRole,
    setSelectedRole,
    roleComboboxOpen,
    setRoleComboboxOpen,
    selectedRoleAvgPlacement,
    formatPlacementDistribution,
  } = useRoleStats({
    roleStats,
    userStats: undefined,
    players: [],
  });

  return (
    <>
      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Role</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={roleComboboxOpen} onOpenChange={setRoleComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={roleComboboxOpen}
                className="w-full justify-between bg-transparent"
              >
                {selectedRole ? (
                  <div className="flex items-center gap-2">
                    <span>{selectedRole.name}</span>
                    {selectedRole.description && (
                      <span className="text-muted-foreground text-sm">
                        - {selectedRole.description}
                      </span>
                    )}
                  </div>
                ) : (
                  "Choose a role to analyze..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="max-h-[300px] w-[--radix-popover-trigger-width]"
              align="start"
            >
              <Command>
                <CommandInput
                  className="hover:border-none focus:outline-none"
                  placeholder="Search roles..."
                />
                <CommandList>
                  <CommandEmpty>No role found.</CommandEmpty>
                  <CommandGroup>
                    {roleStats
                      .filter((role) => role.matchCount > 0)
                      .map((role) => (
                        <CommandItem
                          key={role.roleId}
                          value={`${role.name} ${role.description ?? ""}`}
                          onSelect={() => {
                            setSelectedRole(role);
                            setRoleComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedRole?.roleId === role.roleId
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            {role.description && (
                              <span className="text-muted-foreground text-sm">
                                - {role.description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Role Analysis */}
      {selectedRole && (
        <div className="space-y-6">
          {/* Role Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedRole.name} - Role Analysis
              </CardTitle>
              {selectedRole.description && (
                <p className="text-muted-foreground text-sm">
                  {selectedRole.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "grid gap-4",
                  selectedRoleAvgPlacement === null
                    ? "grid-cols-3"
                    : "grid-cols-2 md:grid-cols-4",
                )}
              >
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">
                    {selectedRole.matchCount}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Total Games
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(selectedRole.winRate * 100)}%
                  </div>
                  <div className="text-muted-foreground text-sm">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedRole.playerCount}
                  </div>
                  <div className="text-muted-foreground text-sm">Players</div>
                </div>
                {selectedRoleAvgPlacement !== null && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedRoleAvgPlacement}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Avg Placement
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Players Performance in This Role */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Player Performance as {selectedRole.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <div className="flex max-h-[40vh] flex-col gap-2">
                  {Object.values(selectedRole.players)
                    .sort((a, b) => {
                      if (a.matchCount > 10 && b.matchCount > 10) {
                        return b.winRate - a.winRate;
                      }
                      if (a.matchCount > 10 && b.matchCount <= 10) {
                        return -1;
                      }
                      if (a.matchCount <= 10 && b.matchCount > 10) {
                        return 1;
                      }
                      return b.matchCount - a.matchCount;
                    })
                    .map((player, index) => {
                      const avgPlacement = formatPlacementDistribution(
                        player.placements,
                      );
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground text-lg font-bold">
                              #{index + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              <PlayerImage
                                className="h-7 w-7 sm:h-10 sm:w-10"
                                image={player.image}
                                alt={player.name}
                              />
                              <div>
                                <div className="flex items-center gap-2 font-semibold">
                                  {player.name}
                                  {player.isUser && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {player.matchCount} games played
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 text-right">
                            <div className="text-xl font-bold">
                              {Math.round(player.winRate * 100)}%
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-green-600">
                                {player.totalWins} wins
                              </span>
                              {avgPlacement !== null && (
                                <span className="text-blue-600">
                                  {avgPlacement} avg place
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
