"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
  Users2,
  X,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { isSamePlayer } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { Input } from "@board-games/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import type {
  LocationType,
  PlayerType,
  ScoresheetType,
  TeamType,
} from "./schema";
import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { withFieldGroup, withForm } from "~/hooks/form";
import { usePlayers } from "../hooks/players";
import { GroupQuickMatchSelection } from "./group-select";
import { PlayerSelectorField } from "./player-selection-form";
import { RecentMatchSelection } from "./recent-match-select";
import { PlayerRoleSelectorField, TeamRoleSelectorField } from "./role-form";

type Players = RouterOutputs["newPlayer"]["getPlayersForMatch"]["players"];

export const QuickPlayerSelect = withForm({
  defaultValues: {
    name: "",
    date: new Date(),
    location: null as LocationType,
    scoresheet: {
      id: 0,
      type: "original" as const,
    } as ScoresheetType,
    players: [] as PlayerType[],
    teams: [] as TeamType[],
  },
  props: {
    selectedPlayers: [] as PlayerType[],
    onCancel: () => {
      /* empty */
    },
    onBack: () => {
      /* empty */
    },
    onAddPlayer: () => {
      /* empty */
    },
  },
  render: function Render({
    form,
    selectedPlayers,
    onCancel,
    onBack,
    onAddPlayer,
  }) {
    const { playersForMatch, isLoading: isLoadingPlayers } = usePlayers();
    return (
      <>
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>{form.getFieldValue("name")}</DialogTitle>
            <DialogDescription>
              {format(form.getFieldValue("date"), "PPP")}
            </DialogDescription>
          </div>
          <Badge variant="secondary" className="rounded px-4 py-2 text-base">
            <Users className="mr-2 h-4 w-4" />
            {selectedPlayers.length} selected
          </Badge>
        </DialogHeader>
        {isLoadingPlayers ? (
          <div className="flex items-center justify-center">
            <Spinner />
          </div>
        ) : playersForMatch === undefined ? (
          <div className="text-muted-foreground text-sm">No players found</div>
        ) : (
          <>
            <GroupQuickMatchSelection
              players={playersForMatch.players}
              setPlayers={(groupPlayers: Players) => {
                const mappedPlayers = groupPlayers.map((p) => ({
                  ...p,
                  roles: [],
                  teamId: null,
                }));
                form.setFieldValue("players", mappedPlayers);
              }}
            />
            <RecentMatchSelection
              players={playersForMatch.players}
              setPlayers={(matchPlayers: Players) => {
                const mappedPlayers = matchPlayers.map((p) => ({
                  ...p,
                  roles: [],
                  teamId: null,
                }));
                form.setFieldValue("players", mappedPlayers);
              }}
            />
            <PlayerSelectorField
              form={form}
              fields={{
                players: "players",
              }}
              originalPlayers={playersForMatch.players}
              addPlayerOnClick={() => {
                onAddPlayer();
              }}
            />
          </>
        )}
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onBack();
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <form.AppForm>
              <form.SubscribeButton label="Start Match" />
            </form.AppForm>
          </div>
        </DialogFooter>
      </>
    );
  },
});

export const CustomPlayerSelect = withFieldGroup({
  defaultValues: {
    players: [] as PlayerType[],
    teams: [] as TeamType[],
  },
  props: {
    title: "Players",
    description: "Add players to your match",
    selectedPlayers: [] as PlayerType[],
    teams: [] as TeamType[],
    gameRoles: [] as RouterOutputs["newGame"]["gameRoles"],
    playersForMatch: {
      players: [],
    } as RouterOutputs["newPlayer"]["getPlayersForMatch"],
    onCancel: () => {
      /* empty */
    },
    onBack: () => {
      /* empty */
    },
    onAddPlayer: () => {
      /* empty */
    },
  },
  render: function Render({
    title,
    description,
    group,
    selectedPlayers,
    teams,
    gameRoles,
    playersForMatch,
    onCancel,
    onBack,
    onAddPlayer,
  }) {
    const [currentTab, setCurrentTab] = useState<"players" | "teams">(
      "players",
    );
    const [showRoleDialog, setShowRoleDialog] = useState(false);
    const [roleTarget, setRoleTarget] = useState<
      | {
          type: "player";
          id: number;
          shareType: "shared" | "original";
          name: string;
          index: number;
          teamId: number | null;
        }
      | {
          type: "team";
          id: number;
          name: string;
          index: number;
        }
      | null
    >(null);
    const individualPlayers = selectedPlayers.filter((p) => !p.teamId);

    const assignPlayerToTeam = (teamId: number | null, player: PlayerType) => {
      const currentPlayers = group.state.values.players;
      const tempPlayers = currentPlayers.map((p) => {
        if (isSamePlayer(p, player)) {
          return { ...p, teamId };
        }
        return p;
      });
      group.setFieldValue("players", tempPlayers);
    };
    return (
      <>
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <Badge variant="secondary" className="rounded-lg px-4 py-2 text-base">
            <Users className="mr-2 h-4 w-4" />
            {selectedPlayers.length} selected
          </Badge>
        </DialogHeader>
        <Tabs
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value as "players" | "teams")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="players">Select Players</TabsTrigger>
            <TabsTrigger value="teams">
              Teams{gameRoles.length > 0 && " & Roles"}
            </TabsTrigger>
          </TabsList>
          {/* Player Selection Tab */}
          <TabsContent value="players" className="mt-6 space-y-4">
            <GroupQuickMatchSelection
              players={playersForMatch.players}
              setPlayers={(groupPlayers: Players) => {
                group.setFieldValue(
                  "players",
                  groupPlayers.map((p) => ({
                    ...p,
                    roles: [],
                    teamId: null,
                  })),
                );
              }}
            />
            <RecentMatchSelection
              players={playersForMatch.players}
              setPlayers={(
                matchPlayers: Extract<Players[number], { type: "original" }>[],
              ) => {
                group.setFieldValue(
                  "players",
                  matchPlayers.map((p) => ({
                    ...p,
                    roles: [],
                    teamId: null,
                  })),
                );
              }}
            />
            <PlayerSelectorField
              form={group}
              fields={{
                players: "players",
              }}
              originalPlayers={playersForMatch.players.map((p) => ({
                ...p,
                roles: [],
              }))}
              addPlayerOnClick={() => {
                onAddPlayer();
              }}
            />

            {/* Continue Button */}
            {selectedPlayers.length > 0 && (
              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => setCurrentTab("teams")}>
                  Continue to Teams{gameRoles.length > 0 && " & Roles"}
                  <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="teams" className="mt-6">
            <group.Field name="teams" mode="array">
              {(field) => {
                const minTeamId =
                  teams.length > 0
                    ? Math.min(...teams.map((team) => team.id))
                    : 0;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Organize players into teams and assign roles (optional)
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          field.pushValue({
                            id: minTeamId - 1,
                            name: `Team ${teams.length + 1}`,
                            roles: [],
                          })
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add Team
                      </Button>
                    </div>
                    <ScrollArea>
                      <ItemGroup className="max-h-[60vh] gap-4">
                        {teams.map((team, i) => {
                          const teamPlayers = selectedPlayers.filter(
                            (p) => p.teamId === team.id,
                          );
                          return (
                            <Item key={i} variant="outline">
                              <ItemMedia variant="icon">
                                <Users2 />
                              </ItemMedia>
                              <ItemContent>
                                <group.Field key={i} name={`teams[${i}].name`}>
                                  {(subField) => {
                                    return (
                                      <Input
                                        value={team.name}
                                        onChange={(e) =>
                                          subField.handleChange(e.target.value)
                                        }
                                      />
                                    );
                                  }}
                                </group.Field>
                                <ItemDescription>
                                  {teamPlayers.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {teamPlayers.length} player
                                      {teamPlayers.length !== 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                  {team.roles.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {team.roles.length} team role
                                      {team.roles.length !== 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                </ItemDescription>
                              </ItemContent>
                              <ItemActions>
                                {gameRoles.length > 0 && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setRoleTarget({
                                        id: team.id,
                                        type: "team" as const,
                                        index: i,
                                        name: team.name,
                                      });
                                      setShowRoleDialog(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    group.setFieldValue(
                                      "players",
                                      selectedPlayers.map((p) =>
                                        p.teamId === team.id
                                          ? {
                                              ...p,
                                              teamId: null,
                                            }
                                          : p,
                                      ),
                                    );
                                    field.removeValue(i);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </ItemActions>
                              <ItemFooter className="flex w-full flex-col gap-2">
                                <ItemGroup className="w-full gap-2">
                                  {teamPlayers.map((player) => {
                                    const playerIndex =
                                      selectedPlayers.findIndex((p) =>
                                        isSamePlayer(p, player),
                                      );
                                    if (playerIndex === -1) {
                                      return null;
                                    }
                                    return (
                                      <Item
                                        key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                        size="sm"
                                        className="w-full py-1"
                                        variant="muted"
                                      >
                                        <ItemMedia>
                                          <PlayerImage
                                            className="size-8"
                                            image={player.image}
                                            alt={player.name}
                                          />
                                        </ItemMedia>
                                        <ItemContent>
                                          <ItemTitle>{player.name}</ItemTitle>
                                          <ItemDescription>
                                            {player.roles.length > 0 && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {player.roles.length} role
                                                {player.roles.length !== 1
                                                  ? "s"
                                                  : ""}
                                              </Badge>
                                            )}
                                          </ItemDescription>
                                        </ItemContent>
                                        <ItemActions>
                                          {gameRoles.length > 0 && (
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => {
                                                const foundPlayer =
                                                  selectedPlayers[playerIndex];
                                                if (foundPlayer === undefined) {
                                                  return;
                                                }
                                                const roleObject =
                                                  foundPlayer.type ===
                                                  "original"
                                                    ? {
                                                        id: foundPlayer.id,
                                                        type: "player" as const,
                                                        index: playerIndex,
                                                        name: foundPlayer.name,
                                                        shareType:
                                                          "original" as const,
                                                        teamId:
                                                          foundPlayer.teamId ??
                                                          null,
                                                      }
                                                    : {
                                                        id: foundPlayer.sharedId,
                                                        type: "player" as const,
                                                        index: playerIndex,
                                                        name: foundPlayer.name,
                                                        shareType:
                                                          "shared" as const,
                                                        teamId:
                                                          foundPlayer.teamId ??
                                                          null,
                                                      };
                                                setRoleTarget(roleObject);
                                                setShowRoleDialog(true);
                                              }}
                                            >
                                              <Shield className="h-3 w-3" />
                                            </Button>
                                          )}
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() =>
                                              assignPlayerToTeam(null, player)
                                            }
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </ItemActions>
                                      </Item>
                                    );
                                  })}
                                </ItemGroup>
                                {individualPlayers.length > 0 && (
                                  <Collapsible className="w-full">
                                    <CollapsibleTrigger className="text-muted-foreground hover:text-foreground w-full cursor-pointer text-left text-xs">
                                      + Assign players to this team
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <ItemGroup className="gap-2">
                                        {individualPlayers.map((player) => {
                                          return (
                                            <Item
                                              key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                              size="sm"
                                              role="listitem"
                                              className="hover:bg-accent py-1"
                                              asChild
                                            >
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();

                                                  assignPlayerToTeam(
                                                    team.id,
                                                    player,
                                                  );
                                                }}
                                              >
                                                <ItemMedia>
                                                  <PlayerImage
                                                    className="size-5"
                                                    image={player.image}
                                                    alt={player.name}
                                                  />
                                                </ItemMedia>
                                                <ItemContent>
                                                  <ItemTitle>
                                                    {player.name}
                                                  </ItemTitle>
                                                </ItemContent>
                                              </button>
                                            </Item>
                                          );
                                        })}
                                      </ItemGroup>
                                    </CollapsibleContent>
                                  </Collapsible>
                                )}
                              </ItemFooter>
                            </Item>
                          );
                        })}
                        {individualPlayers.length > 0 && (
                          <Item variant="outline">
                            <ItemMedia variant="icon">
                              <User />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>Individual Players</ItemTitle>
                            </ItemContent>
                            <ItemFooter className="w-full">
                              <ItemGroup className="w-full gap-3">
                                {individualPlayers.map((player) => {
                                  const playerIndex = selectedPlayers.findIndex(
                                    (p) => isSamePlayer(p, player),
                                  );
                                  if (playerIndex === -1) {
                                    return null;
                                  }
                                  return (
                                    <Item
                                      key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                      variant="muted"
                                      className="hover:bg-accent w-full py-2"
                                    >
                                      <ItemMedia>
                                        <PlayerImage
                                          className="size-6"
                                          image={player.image}
                                          alt={player.name}
                                        />
                                      </ItemMedia>
                                      <ItemContent>
                                        <ItemTitle>{player.name}</ItemTitle>
                                        <ItemDescription>
                                          {player.roles.length > 0 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {player.roles.length} role
                                              {player.roles.length !== 1
                                                ? "s"
                                                : ""}
                                            </Badge>
                                          )}
                                        </ItemDescription>
                                      </ItemContent>
                                      {gameRoles.length > 0 && (
                                        <ItemActions>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              const foundPlayer =
                                                selectedPlayers[playerIndex];
                                              if (foundPlayer === undefined) {
                                                return;
                                              }
                                              const roleObject =
                                                foundPlayer.type === "original"
                                                  ? {
                                                      id: foundPlayer.id,
                                                      type: "player" as const,
                                                      index: playerIndex,
                                                      name: foundPlayer.name,
                                                      shareType:
                                                        "original" as const,
                                                      teamId:
                                                        foundPlayer.teamId ??
                                                        null,
                                                    }
                                                  : {
                                                      id: foundPlayer.sharedId,
                                                      type: "player" as const,
                                                      index: playerIndex,
                                                      name: foundPlayer.name,
                                                      shareType:
                                                        "shared" as const,
                                                      teamId:
                                                        foundPlayer.teamId ??
                                                        null,
                                                    };
                                              setRoleTarget(roleObject);
                                              setShowRoleDialog(true);
                                            }}
                                          >
                                            <Shield className="h-3 w-3" />
                                          </Button>
                                        </ItemActions>
                                      )}
                                    </Item>
                                  );
                                })}
                              </ItemGroup>
                            </ItemFooter>
                          </Item>
                        )}
                      </ItemGroup>
                    </ScrollArea>
                  </div>
                );
              }}
            </group.Field>
          </TabsContent>
        </Tabs>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onBack();
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="default" onClick={onBack}>
              Save
            </Button>
          </div>
        </DialogFooter>
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          {roleTarget !== null && (
            <DialogContent>
              {roleTarget.type === "player" ? (
                <PlayerRoleSelectorField
                  form={group}
                  fields={{
                    roles: `players[${roleTarget.index}].roles`,
                  }}
                  title={roleTarget.name}
                  gameRoles={gameRoles}
                  team={teams.find((t) => t.id === roleTarget.teamId)}
                />
              ) : (
                <TeamRoleSelectorField
                  title={roleTarget.name}
                  gameRoles={gameRoles}
                  form={group}
                  fields={{ roles: `teams[${roleTarget.index}].roles` }}
                />
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    setShowRoleDialog(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </>
    );
  },
});
