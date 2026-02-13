"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import type { OriginalRole, SharedRole } from "@board-games/shared";
import {
  isOriginalRoleGuard,
  isSameRole,
  isSharedRoleGuard,
  originalRoleSchema,
  sharedRoleSchema,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";

import type { MatchInput } from "../types/input";
import {
  useMatch,
  usePlayersAndTeams,
} from "~/components/match/hooks/suspenseQueries";
import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useGameRoles } from "~/hooks/queries/game/roles";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";
import { useUpdateMatchTeamMutation } from "../hooks/scoresheet";

type Player = NonNullable<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]
>["players"][number];
type Team = NonNullable<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]
>["teams"][number];

type TeamRole = OriginalRole | SharedRole;

export default function TeamEditorDialog({
  team,
  matchInput,
  onClose,
}: {
  team: Team | null;
  matchInput: MatchInput;
  onClose: () => void;
}) {
  const { match } = useMatch(matchInput);
  const { players } = usePlayersAndTeams(matchInput);
  const { gameRoles } = useGameRoles(
    match.game.type === "original"
      ? {
          type: "original",
          id: match.game.id,
        }
      : {
          type: "shared",
          sharedGameId: match.game.sharedGameId,
        },
  );

  return (
    <Dialog open={team !== null} onOpenChange={onClose}>
      <DialogContent className="gap-2 p-4 sm:max-w-[800px] sm:gap-4 sm:p-6">
        {team && (
          <Content
            matchInput={matchInput}
            team={team}
            players={players}
            roles={gameRoles}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function Content({
  matchInput,
  team,
  players,
  roles,
  onClose,
}: {
  matchInput: MatchInput;
  team: Team;
  players: Player[];
  roles: RouterOutputs["game"]["gameRoles"];
  onClose: () => void;
}) {
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  const { updateMatchTeamMutation } = useUpdateMatchTeamMutation();

  const originalTeamPlayers = players.filter(
    (player) => player.teamId === team.id,
  );
  const teamRoles = originalTeamPlayers.reduce<
    (z.infer<typeof originalRoleSchema> | z.infer<typeof sharedRoleSchema>)[]
  >((acc, player) => {
    player.roles.forEach((role) => {
      const roleInEveryPlayer = originalTeamPlayers.every((p) =>
        p.roles.some((r) => isSameRole(r, role)),
      );
      if (!acc.find((r) => isSameRole(r, role)) && roleInEveryPlayer) {
        acc.push(role);
      }
      return acc;
    });
    return acc;
  }, []);

  const originalMatchFormSchema = z.object({
    name: z.string(),
    roles: z.array(
      z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
    ),
    players: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        roles: z.array(
          z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
        ),
      }),
    ),
  });

  const sharedMatchFormSchema = z.object({
    name: z.string(),
    roles: z.array(sharedRoleSchema),
    players: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        roles: z.array(sharedRoleSchema),
      }),
    ),
  });

  const formSchema =
    matchInput.type === "original"
      ? originalMatchFormSchema
      : sharedMatchFormSchema;

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      name: team.name,
      players: players
        .filter((player) => player.teamId === team.id)
        .map((player) => {
          return {
            id: player.baseMatchPlayerId,
            name: player.name,
            roles: player.roles,
          };
        }),
      roles: teamRoles,
    },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const isSameTeamName = data.name === team.name;
    const playersToAdd = data.players
      .filter(
        (player) =>
          !originalTeamPlayers.find((p) => p.baseMatchPlayerId === player.id),
      )
      .map((p) => {
        const foundPlayer = players.find(
          (player) => player.baseMatchPlayerId === p.id,
        );
        if (!foundPlayer) return null;
        const rolesToAdd = data.roles.filter(
          (role) => !foundPlayer.roles.find((r) => isSameRole(r, role)),
        );
        return {
          id: p.id,
          roles: rolesToAdd,
        };
      })
      .filter(
        (
          p,
        ): p is {
          id: number;
          roles: TeamRole[];
        } => p !== null,
      );
    const playersToRemove = originalTeamPlayers
      .filter(
        (player) =>
          !data.players.find((p) => p.id === player.baseMatchPlayerId),
      )
      .map((p) => {
        const foundPlayer = players.find(
          (player) => player.baseMatchPlayerId === p.baseMatchPlayerId,
        );
        if (!foundPlayer) return null;
        const rolesToRemove = foundPlayer.roles.filter((role) =>
          data.roles.find((r) => isSameRole(r, role)),
        );
        return {
          id: p.baseMatchPlayerId,
          roles: rolesToRemove,
        };
      })
      .filter(
        (
          p,
        ): p is {
          id: number;
          roles: TeamRole[];
        } => p !== null,
      );
    const playersToUpdate = data.players
      .map((player) => {
        const foundPlayer = players.find(
          (p) => p.baseMatchPlayerId === player.id,
        );
        if (!foundPlayer) return null;
        const rolesToAdd = data.roles.filter(
          (role) => !foundPlayer.roles.find((r) => isSameRole(r, role)),
        );
        const rolesToRemove = foundPlayer.roles.filter(
          (role) =>
            teamRoles.findIndex((r) => isSameRole(r, role)) > -1 &&
            !data.roles.find((r) => isSameRole(r, role)),
        );
        if (rolesToAdd.length === 0 && rolesToRemove.length === 0) return null;
        return {
          id: foundPlayer.baseMatchPlayerId,
          rolesToAdd: rolesToAdd,
          rolesToRemove: rolesToRemove,
        };
      })
      .filter(
        (
          p,
        ): p is {
          id: number;
          rolesToAdd: TeamRole[];
          rolesToRemove: TeamRole[];
        } => p !== null,
      );
    updateMatchTeamMutation.mutate(
      matchInput.type === "original"
        ? {
            type: "original",
            id: matchInput.id,
            team: {
              id: team.id,
              name: isSameTeamName ? undefined : data.name,
            },
            playersToAdd: playersToAdd,
            playersToRemove: playersToRemove.map((p) => {
              return {
                ...p,
                roles: p.roles.filter(isOriginalRoleGuard),
              };
            }),
            playersToUpdate: playersToUpdate.map((p) => ({
              ...p,
              rolesToRemove: p.rolesToRemove.filter(isOriginalRoleGuard),
            })),
          }
        : {
            type: "shared" as const,
            sharedMatchId: matchInput.sharedMatchId,
            team: {
              id: team.id,
              name: isSameTeamName ? undefined : data.name,
            },
            playersToAdd: playersToAdd.map((p) => ({
              sharedMatchPlayerId: p.id,
              roles: p.roles.filter(isSharedRoleGuard),
            })),
            playersToRemove: playersToRemove.map((p) => ({
              sharedMatchPlayerId: p.id,
              roles: p.roles.filter(isSharedRoleGuard),
            })),
            playersToUpdate: playersToUpdate.map((p) => ({
              sharedMatchPlayerId: p.id,
              rolesToAdd: p.rolesToAdd.filter(isSharedRoleGuard),
              rolesToRemove: p.rolesToRemove.filter(isSharedRoleGuard),
            })),
          },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const formRoles = form.watch("roles");
  const formPlayers = form.watch("players");
  const availablePlayers = useMemo(() => {
    return players.filter(
      (player) => !formPlayers.find((p) => p.id === player.baseMatchPlayerId),
    );
  }, [players, formPlayers]);

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {team.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Edit the name and roles of your team.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-2"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Name</FormLabel>
                <FormControl>
                  <Input placeholder="Team name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2">
            <Label>Team roles (applied to all members)</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search roles..."
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                className="pl-10 text-sm"
                aria-label="Search team roles by name or description"
                type="search"
              />
            </div>
            <ScrollArea>
              <div className="flex max-h-[15vh] flex-col gap-2">
                {filteredRoles.map((role) => {
                  const roleIndex = formRoles.findIndex((r) =>
                    isSameRole(r, role),
                  );
                  return (
                    <FormField
                      key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                      control={form.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={roleIndex > -1}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([
                                    ...formRoles,
                                    {
                                      ...role,
                                    },
                                  ]);
                                } else {
                                  field.onChange([
                                    ...formRoles.filter(
                                      (r) => !isSameRole(r, role),
                                    ),
                                  ]);
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="flex w-full flex-col gap-2">
                            <span>{role.name}</span>
                            <p className="text-muted-foreground text-xs">
                              {role.description}
                            </p>
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          {formRoles.length > 0 && (
            <ScrollArea className="hidden overflow-auto sm:relative">
              <div className="hidden items-center gap-2 overflow-visible sm:flex">
                {formRoles.map((formRole) => {
                  const role = roles.find((r) => isSameRole(r, formRole));
                  if (!role) return null;
                  return (
                    <Badge
                      key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                      variant="outline"
                      className="text-nowrap"
                    >
                      {role.name}
                    </Badge>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
          <ScrollArea>
            <div className="flex max-h-[25vh] flex-col gap-2">
              <FormField
                control={form.control}
                name="players"
                render={({ field: playerField }) => (
                  <FormItem>
                    <FormLabel>Team Players</FormLabel>
                    <FormControl>
                      <ScrollArea>
                        <div className="flex max-h-[15vh] flex-col gap-2">
                          {playerField.value.map((player, index) => {
                            const foundPlayer = players.find(
                              (p) => p.baseMatchPlayerId === player.id,
                            );
                            if (!foundPlayer) return null;
                            return (
                              <FormField
                                key={player.id}
                                control={form.control}
                                name={`players.${index}`}
                                render={() => (
                                  <FormItem className="flex w-full items-center justify-between gap-2">
                                    <FormLabel className="flex w-full items-center gap-1 text-sm font-normal sm:gap-2">
                                      <PlayerImage
                                        className="size-8"
                                        image={foundPlayer.image}
                                        alt={foundPlayer.name}
                                      />
                                      <div className="text-sm font-medium">
                                        {foundPlayer.name}
                                        {foundPlayer.isUser && (
                                          <Badge
                                            variant="outline"
                                            className="ml-2 text-xs"
                                          >
                                            You
                                          </Badge>
                                        )}
                                      </div>
                                    </FormLabel>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        className="text-destructive hover:bg-destructive hover:text-white"
                                        type="button"
                                        onClick={() => {
                                          playerField.onChange(
                                            formPlayers.filter(
                                              (p) => p.id !== player.id,
                                            ),
                                          );
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </FormControl>

                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </FormControl>
                  </FormItem>
                )}
              />
              <div>
                <Label>Available Players</Label>
                <ScrollArea>
                  <div className="flex max-h-[15vh] flex-col gap-2">
                    {availablePlayers.map((player) => {
                      const foundPlayer = players.find(
                        (p) => p.baseMatchPlayerId === player.baseMatchPlayerId,
                      );
                      if (!foundPlayer) return null;
                      return (
                        <div
                          key={player.baseMatchPlayerId}
                          className="flex w-full items-center justify-between gap-2"
                        >
                          <div className="flex w-full items-center gap-1 text-sm font-normal sm:gap-2">
                            <PlayerImage
                              className="size-8"
                              image={foundPlayer.image}
                              alt={foundPlayer.name}
                            />
                            <div className="text-sm font-medium">
                              {foundPlayer.name}
                              {foundPlayer.isUser && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs"
                                >
                                  You
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => {
                              form.setValue("players", [
                                ...formPlayers,
                                {
                                  id: player.baseMatchPlayerId,
                                  name: foundPlayer.name,
                                  roles: form.getValues("roles"),
                                },
                              ]);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-row justify-end">
            <Button type="submit" disabled={updateMatchTeamMutation.isPending}>
              {updateMatchTeamMutation.isPending ? (
                <>
                  <Spinner />
                  <span>Saving...</span>
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={() => onClose()}>
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
