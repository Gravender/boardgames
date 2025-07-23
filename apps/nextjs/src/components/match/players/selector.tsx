"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { insertPlayerSchema } from "@board-games/db/zodSchema";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
  useForm,
} from "@board-games/ui/form";
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

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { AddPlayerForm } from "./add-player";
import { PlayerGroupSelector } from "./group-selector";
import { ManagePlayerRoles } from "./player-role";
import { ManageTeamContent } from "./team-selector";

const roleSchema = z.array(z.number());
const playersSchema = z
  .array(
    insertPlayerSchema
      .pick({ name: true, id: true })
      .required({ name: true, id: true })
      .extend({
        imageUrl: z.string().nullable(),
        matches: z.number(),
        teamId: z.number().nullable(),
        roles: roleSchema,
      }),
  )
  .refine((players) => players.length > 0, {
    message: "You must add at least one player",
  });
const AddPlayersFormSchema = z.object({
  players: playersSchema,
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      roles: z.array(z.number()),
    }),
  ),
});
type addPlayersFormType = z.infer<typeof AddPlayersFormSchema>;
export interface Player {
  id: number;
  name: string;
  teamId: number | null;
  roles: number[];
  imageUrl: string | null;
  matches: number;
}
export interface Team {
  id: number;
  name: string;
  roles: number[];
}
export const AddPlayersDialogForm = ({
  gameId,
  players,
  teams,
  setPlayersAndTeams,
  cancel,
}: {
  gameId: number;
  players: Player[];
  teams: Team[];
  setPlayersAndTeams: (players: Player[], teams: Team[]) => void;
  cancel: () => void;
}) => {
  const trpc = useTRPC();
  const { data: roles } = useQuery(
    trpc.game.getGameRoles.queryOptions({ gameId: gameId }),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroups, setShowGroups] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<number | null>(null);

  const { data: groups } = useQuery(trpc.group.getGroups.queryOptions());
  const { data: gamePlayers } = useQuery(
    trpc.player.getPlayersByGame.queryOptions({ game: { id: gameId } }),
  );

  const currentUser = gamePlayers?.find((player) => player.isUser);
  const form = useForm({
    schema: AddPlayersFormSchema,
    defaultValues: {
      players:
        players.length > 0
          ? players
          : currentUser
            ? [
                {
                  id: currentUser.id,
                  imageUrl: currentUser.image?.url ?? "",
                  name: currentUser.name,
                  teamId: null,
                  matches: currentUser.matches,
                  roles: [],
                },
              ]
            : [],
      teams: teams,
    },
  });
  const { append, remove, update } = useFieldArray({
    control: form.control,
    name: "players",
  });
  const onSubmit = (data: addPlayersFormType) => {
    setPlayersAndTeams(data.players, data.teams);
  };
  const onShowTeamModal = () => {
    setShowTeamModal(true);
  };

  const handleAddGroup = (
    group: NonNullable<RouterOutputs["group"]["getGroups"]>[number],
  ) => {
    group.players.forEach((player) => {
      const playerExists = players.find((p) => p.id === player.id);
      if (playerExists) {
        const playerSelected = form
          .getValues("players")
          .find((p) => p.id === player.id);
        if (!playerSelected) {
          append({
            id: player.id,
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
  const formTeams = form.watch("teams");
  const formPlayers = form.watch("players");

  if (showAddPlayer) {
    const addMatchPlayer = (player: {
      id: number;
      imageUrl: string;
      name: string;
    }) => {
      append({
        id: player.id,
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
  if (showTeamModal) {
    const mappedTeams = formTeams.map((team) => {
      const teamPlayers = formPlayers.filter((p) => p.teamId === team.id);
      return {
        id: team.id,
        name: team.name,
        roles: team.roles,
        players: teamPlayers.length,
      };
    });
    const manageTeamSave = (teams: Team[]) => {
      const mappedPlayers = formPlayers.map((player) => {
        const foundTeam = teams.find((t) => t.id === player.teamId);
        const originalTeam = formTeams.find((t) => t.id === player.teamId);
        const rolesToRemove = originalTeam?.roles.filter(
          (role) => !foundTeam?.roles.includes(role),
        );
        if (foundTeam) {
          const playerRoles = player.roles.filter(
            (role) => !rolesToRemove?.includes(role),
          );
          const rolesToAdd = foundTeam.roles.filter(
            (role) => !playerRoles.includes(role),
          );
          return {
            ...player,
            teamId: foundTeam.id,
            roles: [...playerRoles, ...rolesToAdd],
          };
        } else if (originalTeam) {
          const filteredRoles = player.roles.filter(
            (role) => !originalTeam.roles.includes(role),
          );
          return {
            ...player,
            teamId: null,
            roles: filteredRoles,
          };
        }
        return player;
      });
      form.setValue("teams", teams);
      form.setValue("players", mappedPlayers);
      setShowTeamModal(false);
    };

    return (
      <ManageTeamContent
        roles={roles ?? []}
        teams={mappedTeams}
        cancel={() => setShowTeamModal(false)}
        setTeams={manageTeamSave}
      />
    );
  }
  if (showRoleModal) {
    const foundPlayer = formPlayers.find((p) => p.id === showRoleModal);
    const playerIndex = formPlayers.findIndex((p) => p.id === showRoleModal);
    if (foundPlayer && playerIndex > -1) {
      const foundTeam = formTeams.find((t) => t.id === foundPlayer.teamId);
      return (
        <ManagePlayerRoles
          player={foundPlayer}
          teamRoles={foundTeam?.roles ?? []}
          roles={roles ?? []}
          onClose={() => setShowRoleModal(null)}
          onSave={(roles) => {
            update(playerIndex, {
              ...foundPlayer,
              roles,
            });
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
        <DialogDescription className="sr-only xs:not-sr-only">
          Add players to your match
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-2 xs:flex-row">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <div className="flex w-full items-center justify-between gap-2 xs:w-auto xs:justify-start">
          <Button variant="outline" onClick={() => setShowGroups(!showGroups)}>
            <Users className="h-4 w-4" />
            Groups
          </Button>
          <Button variant="outline" onClick={() => setShowAddPlayer(true)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="players"
            render={() => (
              <FormItem>
                {showGroups && groups ? (
                  <PlayerGroupSelector
                    searchTerm={searchTerm}
                    groups={groups}
                    handleAddGroup={handleAddGroup}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 px-2">
                      <FormLabel>
                        {`${form.getValues("players").length} player${form.getValues("players").length !== 1 ? "s" : ""} Selected`}
                      </FormLabel>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onShowTeamModal();
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
                                const foundA = form
                                  .getValues("players")
                                  .find((i) => i.id === a.id);
                                const foundB = form
                                  .getValues("players")
                                  .find((i) => i.id === b.id);
                                if (foundA && foundB) {
                                  return 0;
                                }
                                if (foundA) {
                                  return -1;
                                }
                                if (foundB) {
                                  return 1;
                                }
                                if (a.matches === b.matches) {
                                  return a.name.localeCompare(b.name);
                                }
                                return b.matches - a.matches;
                              })
                              .map((player) => {
                                return (
                                  <FormField
                                    key={player.id}
                                    control={form.control}
                                    name="players"
                                    render={({ field }) => {
                                      const foundPlayer = field.value.find(
                                        (i) => i.id === player.id,
                                      );
                                      const playerIndex = field.value.findIndex(
                                        (i) => i.id === player.id,
                                      );

                                      return (
                                        <FormItem
                                          key={player.id}
                                          className={cn(
                                            "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-1 sm:p-2",
                                            foundPlayer
                                              ? "bg-violet-400/50"
                                              : "bg-border",
                                          )}
                                        >
                                          <FormControl>
                                            <Checkbox
                                              className="hidden"
                                              checked={playerIndex > -1}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? append({
                                                      id: player.id,
                                                      imageUrl:
                                                        player.image?.url ??
                                                        null,
                                                      name: player.name,
                                                      matches: player.matches,
                                                      teamId: null,
                                                      roles: [],
                                                    })
                                                  : remove(
                                                      field.value.findIndex(
                                                        (i) =>
                                                          i.id === player.id,
                                                      ),
                                                    );
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="flex w-full items-center justify-between gap-1 text-sm font-normal sm:gap-2">
                                            <div className="flex items-center gap-1 sm:gap-2">
                                              <PlayerImage
                                                className="size-8"
                                                image={player.image}
                                                alt={player.name}
                                              />
                                              <div>
                                                <div className="text-sm font-medium">
                                                  {player.name}
                                                  {player.isUser && (
                                                    <Badge
                                                      variant="outline"
                                                      className="ml-2 text-xs"
                                                    >
                                                      You
                                                    </Badge>
                                                  )}
                                                </div>

                                                <div className="text-xs text-muted-foreground">
                                                  {player.matches} matches
                                                </div>
                                              </div>
                                            </div>
                                          </FormLabel>
                                          <div className="flex flex-col items-center gap-2 xs:flex-row">
                                            {foundPlayer && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                onClick={() => {
                                                  setShowRoleModal(
                                                    foundPlayer.id,
                                                  );
                                                }}
                                                className="w-full xs:w-auto"
                                              >
                                                Roles (
                                                {foundPlayer.roles.length})
                                              </Button>
                                            )}
                                            {formTeams.length > 0 &&
                                              foundPlayer && (
                                                <Select
                                                  value={
                                                    foundPlayer.teamId !== null
                                                      ? foundPlayer.teamId.toString()
                                                      : "no-team"
                                                  }
                                                  onValueChange={(value) => {
                                                    if (value === "no-team") {
                                                      update(
                                                        field.value.findIndex(
                                                          (i) =>
                                                            i.id === player.id,
                                                        ),
                                                        {
                                                          ...foundPlayer,
                                                          teamId: null,
                                                        },
                                                      );
                                                      return;
                                                    }
                                                    const parsedValue =
                                                      Number(value);
                                                    const foundTeam =
                                                      formTeams.find(
                                                        (t) =>
                                                          t.id === parsedValue,
                                                      );
                                                    if (
                                                      !isNaN(parsedValue) &&
                                                      foundTeam
                                                    ) {
                                                      const playerRoles =
                                                        Array.from(
                                                          new Set([
                                                            ...foundPlayer.roles,
                                                            ...foundTeam.roles,
                                                          ]),
                                                        );
                                                      update(
                                                        field.value.findIndex(
                                                          (i) =>
                                                            i.id === player.id,
                                                        ),
                                                        {
                                                          ...foundPlayer,
                                                          teamId: parsedValue,
                                                          roles: playerRoles,
                                                        },
                                                      );
                                                      return;
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
                                                    {formTeams.map((team) => (
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
                                            {formPlayers.findIndex(
                                              (i) => i.id === player.id,
                                            ) > -1 && (
                                              <Badge className="hidden sm:block">
                                                Selected
                                              </Badge>
                                            )}
                                          </div>
                                        </FormItem>
                                      );
                                    }}
                                  />
                                );
                              })
                          : Array.from({ length: 6 }).map((_, i) => (
                              <div
                                key={i}
                                className="flex h-12 flex-row items-center space-x-3 space-y-0 rounded-sm bg-border p-1 sm:p-2"
                              >
                                <div className="flex w-full items-center justify-between gap-1 text-sm font-normal sm:gap-2">
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    <Skeleton className="size-10 rounded-full bg-card" />
                                    <div className="flex flex-col gap-2">
                                      <Skeleton className="h-5 w-36 bg-card" />
                                      <Skeleton className="h-3 w-24 bg-card" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2 pt-2">
            <Button type="reset" variant="secondary" onClick={() => cancel()}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
