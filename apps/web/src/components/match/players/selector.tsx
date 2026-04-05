"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import {
  addMatchPlayersSchema,
  isSameRole,
  originalRoleSchema,
  sharedRoleSchema,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Skeleton } from "@board-games/ui/skeleton";
import { cn } from "@board-games/ui/utils";

import type { GameInput } from "../types/input";
import { PlayerImage } from "~/components/player-image";
import { useAppForm } from "~/hooks/form";
import { useGameRoles } from "~/hooks/queries/game/roles";
import { useGroupsQuery } from "~/hooks/queries/group/groups";
import { useTRPC } from "~/trpc/react";
import { AddPlayerForm } from "./AddPlayerForm";
import { PlayerGroupSelector } from "./group-selector";
import { ManagePlayerRoles } from "./player-role";
import { ManageTeamContent } from "./team-selector";
import { updatePlayersForTeams } from "./update-players-for-teams";

const teamAssignmentSelectItems = (
  teams: ReadonlyArray<{ id: number; name: string }>,
): Record<string, string> => {
  const m: Record<string, string> = { "no-team": "No team" };
  for (const t of teams) {
    m[String(t.id)] = t.name;
  }
  return m;
};

const AddPlayersFormSchema = z.object({
  players: addMatchPlayersSchema,
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      roles: z.array(
        z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
      ),
    }),
  ),
});
type addPlayersFormType = z.infer<typeof AddPlayersFormSchema>;
export interface Player {
  id: number;
  type: "original" | "shared" | "linked";
  name: string;
  teamId: number | null;
  roles: (
    | z.infer<typeof originalRoleSchema>
    | z.infer<typeof sharedRoleSchema>
  )[];
  imageUrl: string | null;
  matches: number;
}
export interface Team {
  id: number;
  name: string;
  roles: (
    | z.infer<typeof originalRoleSchema>
    | z.infer<typeof sharedRoleSchema>
  )[];
}

const getQueriedPlayerId = (
  player:
    | { type: "original"; id: number }
    | { type: "shared"; sharedPlayerId: number },
) => (player.type === "shared" ? player.sharedPlayerId : player.id);

export const AddPlayersDialogForm = ({
  game,
  players,
  teams,
  setPlayersAndTeams,
  cancel,
}: {
  game: GameInput;
  players: Player[];
  teams: Team[];
  setPlayersAndTeams: (players: Player[], teams: Team[]) => void;
  cancel: () => void;
}) => {
  const trpc = useTRPC();
  const { gameRoles } = useGameRoles(game);
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroups, setShowGroups] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<{
    id: number;
    type: "original" | "shared" | "linked";
  } | null>(null);

  const { data: groups } = useGroupsQuery();
  const { data: gamePlayers } = useQuery(
    trpc.newPlayer.getPlayersByGame.queryOptions(
      game.type === "shared"
        ? {
            type: "shared",
            sharedGameId: game.sharedGameId,
          }
        : {
            type: "original",
            id: game.id,
          },
    ),
  );

  const currentUser = gamePlayers?.find((player) => player.isUser);
  const form = useAppForm({
    defaultValues: {
      players:
        players.length > 0
          ? players
          : currentUser
            ? [
                {
                  id: getQueriedPlayerId(currentUser),
                  type: currentUser.type,
                  imageUrl: currentUser.image?.url ?? null,
                  name: currentUser.name,
                  teamId: null as number | null,
                  matches: currentUser.matches,
                  roles: [] as (
                    | z.infer<typeof originalRoleSchema>
                    | z.infer<typeof sharedRoleSchema>
                  )[],
                },
              ]
            : [],
      teams: teams,
    } satisfies addPlayersFormType,
    validators: {
      onSubmit: AddPlayersFormSchema,
    },
    onSubmit: ({ value }) => {
      setPlayersAndTeams(value.players, value.teams);
    },
  });

  const handleAddGroup = (
    group: NonNullable<RouterOutputs["group"]["getGroups"]>[number],
  ) => {
    const currentPlayers = form.getFieldValue("players");
    group.players.forEach((player) => {
      const playerExists = players.find(
        (p) => p.id === player.id && p.type === "original",
      );
      if (playerExists) {
        const playerSelected = currentPlayers.find(
          (p) => p.id === player.id && p.type === "original",
        );
        if (!playerSelected) {
          form.pushFieldValue("players", {
            id: player.id,
            type: "original" as const,
            imageUrl: playerExists.imageUrl,
            name: playerExists.name,
            matches: playerExists.matches,
            teamId: null,
            roles: [],
          });
        }
      }
    });
    setShowGroups(false);
  };
  if (showAddPlayer) {
    const addMatchPlayer = (player: {
      id: number;
      imageUrl: string | null;
      name: string;
    }) => {
      form.pushFieldValue("players", {
        id: player.id,
        type: "original" as const,
        imageUrl: player.imageUrl,
        name: player.name,
        matches: 0,
        teamId: null,
        roles: [],
      });
      setShowAddPlayer(false);
    };
    return (
      <AddPlayerForm
        addMatchPlayer={addMatchPlayer}
        cancel={() => setShowAddPlayer(false)}
      />
    );
  }

  return (
    <form.Subscribe
      selector={(state) => ({
        players: state.values.players,
        teams: state.values.teams,
      })}
    >
      {({ players, teams }) => {
        if (showTeamModal) {
          const mappedTeams = teams.map((team) => {
            const teamPlayers = players.filter((p) => p.teamId === team.id);
            return {
              id: team.id,
              name: team.name,
              roles: team.roles,
              players: teamPlayers.length,
            };
          });
          const manageTeamSave = (newTeams: Team[]) => {
            const currentPlayers = form.getFieldValue("players");
            const currentTeams = form.getFieldValue("teams");
            const mappedPlayers = updatePlayersForTeams({
              players: currentPlayers,
              currentTeams,
              newTeams,
              isSameRole,
            });
            form.setFieldValue("teams", newTeams);
            form.setFieldValue("players", mappedPlayers);
            setShowTeamModal(false);
          };

          return (
            <ManageTeamContent
              roles={gameRoles}
              teams={mappedTeams}
              cancel={() => setShowTeamModal(false)}
              setTeams={manageTeamSave}
            />
          );
        }
        if (showRoleModal) {
          const foundPlayer = players.find(
            (p) => p.id === showRoleModal.id && p.type === showRoleModal.type,
          );
          const playerIndex = players.findIndex(
            (p) => p.id === showRoleModal.id && p.type === showRoleModal.type,
          );
          if (foundPlayer && playerIndex > -1) {
            const foundTeam = teams.find((t) => t.id === foundPlayer.teamId);
            return (
              <ManagePlayerRoles
                player={foundPlayer}
                teamRoles={foundTeam?.roles ?? []}
                roles={gameRoles}
                onClose={() => setShowRoleModal(null)}
                onSave={(roles) => {
                  form.setFieldValue(`players[${playerIndex}].roles`, roles);
                  setShowRoleModal(null);
                }}
              />
            );
          }
        }

        return (
          <>
            <DialogHeader>
              <DialogTitle>Select Players</DialogTitle>
              <DialogDescription className="xs:not-sr-only sr-only">
                Add players to your match
              </DialogDescription>
            </DialogHeader>
            <div className="xs:flex-row flex flex-col items-center gap-2">
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="grow"
              />
              <div className="xs:w-auto xs:justify-start flex w-full items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGroups(!showGroups)}
                >
                  <Users className="h-4 w-4" />
                  Groups
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddPlayer(true)}
                >
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await form.handleSubmit();
              }}
            >
              <form.Field name="players">
                {(playersField) => (
                  <div>
                    {showGroups && groups ? (
                      <PlayerGroupSelector
                        searchTerm={searchTerm}
                        groups={groups}
                        handleAddGroup={handleAddGroup}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2 px-2">
                          <span className="text-sm font-medium">
                            {`${players.length} player${players.length !== 1 ? "s" : ""} Selected`}
                          </span>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => {
                              setShowTeamModal(true);
                            }}
                          >
                            Edit Teams
                          </Button>
                        </div>
                        <ScrollArea className="sm:p-1">
                          <div className="grid max-h-[50vh] gap-2 rounded-lg">
                            {gamePlayers !== undefined
                              ? gamePlayers
                                  .filter((player) =>
                                    player.name
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase()),
                                  )
                                  .toSorted((a, b) => {
                                    const queriedPlayerIdA =
                                      getQueriedPlayerId(a);
                                    const queriedPlayerIdB =
                                      getQueriedPlayerId(b);
                                    const foundA = players.find(
                                      (p) =>
                                        p.id === queriedPlayerIdA &&
                                        p.type === a.type,
                                    );
                                    const foundB = players.find(
                                      (p) =>
                                        p.id === queriedPlayerIdB &&
                                        p.type === b.type,
                                    );
                                    if (foundA && foundB) return 0;
                                    if (foundA) return -1;
                                    if (foundB) return 1;
                                    if (a.matches === b.matches) {
                                      return a.name.localeCompare(b.name);
                                    }
                                    return b.matches - a.matches;
                                  })
                                  .map((player) => {
                                    const queriedPlayerId =
                                      getQueriedPlayerId(player);
                                    const playerCheckboxId = `player-${queriedPlayerId}-${player.type}`;
                                    const foundPlayer = players.find(
                                      (p) =>
                                        p.id === queriedPlayerId &&
                                        p.type === player.type,
                                    );
                                    const playerIdx = players.findIndex(
                                      (p) =>
                                        p.id === queriedPlayerId &&
                                        p.type === player.type,
                                    );

                                    return (
                                      <div
                                        key={`${queriedPlayerId}-${player.type}`}
                                        className={cn(
                                          "flex flex-row items-center space-y-0 space-x-3 rounded-sm p-1 sm:p-2",
                                          foundPlayer
                                            ? "bg-violet-400/50"
                                            : "bg-border",
                                        )}
                                      >
                                        <Checkbox
                                          id={playerCheckboxId}
                                          className="sr-only"
                                          checked={playerIdx > -1}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              playersField.pushValue({
                                                id: queriedPlayerId,
                                                type: player.type,
                                                imageUrl:
                                                  player.image?.url ?? null,
                                                name: player.name,
                                                matches: player.matches,
                                                teamId: null,
                                                roles: [],
                                              });
                                            } else {
                                              const removeIdx =
                                                playersField.state.value.findIndex(
                                                  (i) =>
                                                    i.id === queriedPlayerId &&
                                                    i.type === player.type,
                                                );
                                              if (removeIdx > -1) {
                                                playersField.removeValue(
                                                  removeIdx,
                                                );
                                              }
                                            }
                                          }}
                                        />
                                        <label
                                          htmlFor={playerCheckboxId}
                                          className="flex w-full items-center justify-between gap-1 text-sm font-normal sm:gap-2"
                                        >
                                          <div className="flex items-center gap-1 sm:gap-2">
                                            <PlayerImage
                                              className="size-8"
                                              image={player.image}
                                              alt={player.name}
                                            />
                                            <div>
                                              <div className="flex gap-1 text-sm font-medium">
                                                {player.name}
                                                {player.isUser && (
                                                  <Badge
                                                    variant="outline"
                                                    className="ml-2 text-xs"
                                                  >
                                                    You
                                                  </Badge>
                                                )}
                                                {player.type === "shared" && (
                                                  <Badge
                                                    variant="outline"
                                                    className="bg-blue-600 text-xs text-white"
                                                  >
                                                    Shared
                                                  </Badge>
                                                )}
                                              </div>

                                              <div className="text-muted-foreground text-xs">
                                                {player.matches} matches
                                              </div>
                                            </div>
                                          </div>
                                        </label>
                                        <div className="xs:flex-row flex flex-col items-center gap-2">
                                          {foundPlayer && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              type="button"
                                              onClick={() => {
                                                setShowRoleModal({
                                                  id: foundPlayer.id,
                                                  type: foundPlayer.type,
                                                });
                                              }}
                                              className="xs:w-auto w-full"
                                            >
                                              Roles ({foundPlayer.roles.length})
                                            </Button>
                                          )}
                                          {teams.length > 0 && foundPlayer && (
                                            <Select
                                              value={
                                                foundPlayer.teamId !== null
                                                  ? foundPlayer.teamId.toString()
                                                  : "no-team"
                                              }
                                              items={teamAssignmentSelectItems(
                                                teams,
                                              )}
                                              onValueChange={(value) => {
                                                if (value === "no-team") {
                                                  form.setFieldValue(
                                                    `players[${playerIdx}].teamId`,
                                                    null,
                                                  );
                                                  return;
                                                }
                                                const parsedValue =
                                                  Number(value);
                                                const teamMatch = teams.find(
                                                  (t) => t.id === parsedValue,
                                                );
                                                if (
                                                  !isNaN(parsedValue) &&
                                                  teamMatch
                                                ) {
                                                  const playerRoles = [
                                                    ...foundPlayer.roles,
                                                    ...teamMatch.roles,
                                                  ].reduce<
                                                    (
                                                      | z.infer<
                                                          typeof originalRoleSchema
                                                        >
                                                      | z.infer<
                                                          typeof sharedRoleSchema
                                                        >
                                                    )[]
                                                  >((uniqueRoles, role) => {
                                                    const existingRole =
                                                      uniqueRoles.find(
                                                        (existing) =>
                                                          isSameRole(
                                                            existing,
                                                            role,
                                                          ),
                                                      );
                                                    if (existingRole) {
                                                      return uniqueRoles;
                                                    }
                                                    uniqueRoles.push(role);
                                                    return uniqueRoles;
                                                  }, []);
                                                  form.setFieldValue(
                                                    `players[${playerIdx}].teamId`,
                                                    parsedValue,
                                                  );
                                                  form.setFieldValue(
                                                    `players[${playerIdx}].roles`,
                                                    playerRoles,
                                                  );
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="h-8 w-32">
                                                <SelectValue placeholder="No team" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="no-team">
                                                  No team
                                                </SelectItem>
                                                {teams.map((team) => (
                                                  <SelectItem
                                                    key={team.id}
                                                    value={team.id.toString()}
                                                  >
                                                    {`${team.name}`}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                              : [
                                  "player-skeleton-1",
                                  "player-skeleton-2",
                                  "player-skeleton-3",
                                  "player-skeleton-4",
                                  "player-skeleton-5",
                                  "player-skeleton-6",
                                ].map((itemKey) => (
                                  <div
                                    key={itemKey}
                                    className="bg-border flex h-12 flex-row items-center space-y-0 space-x-3 rounded-sm p-1 sm:p-2"
                                  >
                                    <div className="flex w-full items-center justify-between gap-1 text-sm font-normal sm:gap-2">
                                      <div className="flex items-center gap-1 sm:gap-2">
                                        <Skeleton className="bg-card size-10 rounded-full" />
                                        <div className="flex flex-col gap-2">
                                          <Skeleton className="bg-card h-5 w-36" />
                                          <Skeleton className="bg-card h-3 w-24" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </div>
                )}
              </form.Field>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => cancel()}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </>
        );
      }}
    </form.Subscribe>
  );
};
