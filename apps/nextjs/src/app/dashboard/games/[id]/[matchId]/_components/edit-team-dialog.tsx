"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
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
import { ScrollArea } from "@board-games/ui/scroll-area";

import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type Player = Match["players"][number];
type Team = Match["teams"][number];
export default function TeamEditorDialog({
  team,
  players,
  gameId,
  onClose,
}: {
  team: Team | null;
  players: Player[];
  gameId: number;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const { data: roles } = useSuspenseQuery(
    trpc.game.getGameRoles.queryOptions({ gameId: gameId }),
  );
  return (
    <Dialog open={team !== null} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-[800px] sm:p-6">
        {team && (
          <Content
            team={team}
            players={players}
            roles={roles}
            gameId={gameId}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function Content({
  team,
  players,
  roles,
  gameId,
  onClose,
}: {
  team: Team;
  players: Player[];
  roles: RouterOutputs["game"]["getGameRoles"];
  gameId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const updateTeam = useMutation(
    trpc.match.updateMatchTeam.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.match.getMatch.queryOptions({ id: team.matchId }),
          ),
          queryClient.invalidateQueries(
            trpc.game.getGame.queryOptions({ id: gameId }),
          ),
        ]);
        onClose();
      },
    }),
  );

  const originalTeamPlayers = players.filter(
    (player) => player.teamId === team.id,
  );
  const teamRoles = originalTeamPlayers.reduce<number[]>((acc, player) => {
    player.roles.forEach((role) => {
      const roleInEveryPlayer = originalTeamPlayers.every((p) =>
        p.roles.map((r) => r.id).includes(role.id),
      );
      if (!acc.includes(role.id) && roleInEveryPlayer) {
        acc.push(role.id);
      }
      return acc;
    });
    return acc;
  }, []);

  const formSchema = z.object({
    name: z.string(),
    roles: z.array(z.number()),
    players: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        roles: z.array(z.number()),
      }),
    ),
  });

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      name: team.name,
      players: players
        .filter((player) => player.teamId === team.id)
        .map((player) => {
          return {
            id: player.id,
            name: player.name,
            roles: player.roles.map((role) => role.id),
          };
        }),
      roles: teamRoles,
    },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const isSameTeamName = data.name === team.name;
    const playersToAdd = data.players
      .filter((player) => !originalTeamPlayers.find((p) => p.id === player.id))
      .map((p) => {
        const foundPlayer = players.find((p) => p.id === p.id);
        if (!foundPlayer) return null;
        const rolesToAdd = data.roles.filter(
          (role) => !foundPlayer.roles.map((r) => r.id).includes(role),
        );
        return {
          id: p.id,
          roles: rolesToAdd,
        };
      })
      .filter((p) => p !== null);
    const playersToRemove = originalTeamPlayers
      .filter((player) => !data.players.find((p) => p.id === player.id))
      .map((p) => {
        const foundPlayer = players.find((p) => p.id === p.id);
        if (!foundPlayer) return null;
        const rolesToRemove = foundPlayer.roles
          .filter((role) => data.roles.map((r) => r).includes(role.id))
          .map((role) => role.id);
        return {
          id: p.id,
          roles: rolesToRemove,
        };
      })
      .filter((p) => p !== null);
    const playersToUpdate = data.players
      .map((player) => {
        const foundPlayer = players.find((p) => p.id === player.id);
        if (!foundPlayer) return null;
        const rolesToAdd = data.roles.filter(
          (role) => !foundPlayer.roles.map((r) => r.id).includes(role),
        );
        const rolesToRemove = foundPlayer.roles
          .filter(
            (role) =>
              teamRoles.includes(role.id) && !data.roles.includes(role.id),
          )
          .map((role) => role.id);
        if (rolesToAdd.length === 0 && rolesToRemove.length === 0) return null;
        return {
          id: foundPlayer.id,
          rolesToAdd: rolesToAdd,
          rolesToRemove: rolesToRemove,
        };
      })
      .filter((p) => p !== null);
    updateTeam.mutate({
      match: {
        id: team.matchId,
      },
      team: isSameTeamName
        ? {
            type: "original",
            id: team.id,
          }
        : {
            type: "update",
            id: team.id,
            name: data.name,
          },
      playersToAdd: playersToAdd,
      playersToRemove: playersToRemove,
      playersToUpdate: playersToUpdate,
    });
  };

  const formRoles = form.watch("roles");
  const formPlayers = form.watch("players");
  const availablePlayers = useMemo(() => {
    return players.filter(
      (player) => !formPlayers.find((p) => p.id === player.id),
    );
  }, [players, formPlayers]);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {team.name}</DialogTitle>
        <DialogDescription>
          Edit the name and roles of your team.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          <div>
            <Label>Team roles (applied to all member)</Label>
            <ScrollArea>
              <div className="flex max-h-[20vh] flex-col gap-2">
                {roles.map((role) => {
                  const roleIndex = formRoles.findIndex((r) => r === role.id);
                  return (
                    <FormField
                      key={role.id}
                      control={form.control}
                      name="roles"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={roleIndex > -1}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...formRoles, role.id]);
                                } else {
                                  field.onChange([
                                    ...formRoles.filter((r) => r !== role.id),
                                  ]);
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="flex w-full flex-col gap-2">
                            <span>{role.name}</span>
                            <p className="text-xs text-muted-foreground">
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
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {formRoles.map((roleId) => {
                const role = roles.find((r) => r.id === roleId);
                if (!role) return null;
                return (
                  <Badge key={roleId} variant="outline">
                    {role.name}
                  </Badge>
                );
              })}
            </div>
          )}

          <FormField
            control={form.control}
            name="players"
            render={({ field: playerField }) => (
              <FormItem>
                <FormLabel>Team Players</FormLabel>
                <FormControl>
                  <ScrollArea>
                    <div className="flex max-h-[20vh] flex-col gap-2">
                      {playerField.value.map((player, index) => {
                        const foundPlayer = players.find(
                          (p) => p.id === player.id,
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
              <div className="flex max-h-[20vh] flex-col gap-2">
                {availablePlayers.map((player) => {
                  const foundPlayer = players.find((p) => p.id === player.id);
                  if (!foundPlayer) return null;
                  return (
                    <div
                      key={player.id}
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
                            <Badge variant="outline" className="ml-2 text-xs">
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
                              id: player.id,
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

          <DialogFooter>
            <Button type="submit" disabled={updateTeam.isPending}>
              {updateTeam.isPending ? (
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
