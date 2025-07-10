"use client";

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
import { Label } from "@board-games/ui/label";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type Player = Match["players"][number];
type Team = Match["teams"][number];
export default function PlayerEditorDialog({
  teams,
  players,
  player,
  gameId,
  matchId,
  onClose,
}: {
  teams: Team[];
  players: Player[];
  player: Player | null;
  gameId: number;
  matchId: number;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const { data: roles } = useSuspenseQuery(
    trpc.game.getGameRoles.queryOptions({ gameId: gameId }),
  );

  return (
    <Dialog open={player !== null} onOpenChange={onClose}>
      <DialogContent className="p-4 sm:max-w-[800px] sm:p-6">
        {player && (
          <Content
            teams={teams}
            player={player}
            players={players}
            roles={roles}
            gameId={gameId}
            matchId={matchId}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function Content({
  teams,
  player,
  roles,
  players,
  gameId,
  matchId,
  onClose,
}: {
  teams: Team[];
  player: Player;
  players: Player[];
  roles: RouterOutputs["game"]["getGameRoles"];
  gameId: number;
  matchId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const updatePlayer = useMutation(
    trpc.match.updateMatchPlayerTeamAndRoles.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.match.getMatch.queryOptions({ id: matchId }),
          ),
          queryClient.invalidateQueries(
            trpc.game.getGame.queryOptions({ id: gameId }),
          ),
        ]);
        onClose();
      },
    }),
  );

  const formSchema = z.object({
    team: z.number().nullable(),
    roles: z.array(z.number()),
  });

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      team: player.teamId ?? null,
      roles: player.roles.map((role) => role.id),
    },
  });
  const getTeamRoles = (
    teamPlayers: Player[],
    allRoles: typeof roles,
  ): number[] => {
    return allRoles.reduce<number[]>((acc, role) => {
      const roleInEveryPlayer = teamPlayers.every((p) =>
        p.roles.map((r) => r.id).includes(role.id),
      );
      if (!acc.includes(role.id) && roleInEveryPlayer) {
        acc.push(role.id);
      }
      return acc;
    }, []);
  };
  const formTeam = form.watch("team");
  const formRoles = form.watch("roles");
  const sameTeamPlayers = players.filter(
    (p) => formTeam !== null && p.teamId === formTeam,
  );
  const teamRoles = getTeamRoles(sameTeamPlayers, roles);
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const isSameTeam = data.team === player.teamId;
    const rolesToAdd = data.roles.filter(
      (role) => !player.roles.map((r) => r.id).includes(role),
    );
    const rolesToRemove = player.roles
      .filter((role) => !data.roles.map((r) => r).includes(role.id))
      .map((role) => role.id);

    updatePlayer.mutate({
      matchPlayer: isSameTeam
        ? {
            type: "original",
            id: player.id,
          }
        : {
            type: "update",
            id: player.id,
            teamId: data.team,
          },
      rolesToAdd: rolesToAdd,
      rolesToRemove: rolesToRemove,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {player.name}</DialogTitle>
        <DialogDescription>
          Edit the {teams.length > 0 ? "team and roles" : "roles"} of{" "}
          {player.name}.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {teams.length > 0 && (
            <FormField
              control={form.control}
              name="team"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Assignment</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ? field.value.toString() : "no-team"}
                      onValueChange={(value) => {
                        if (value === "no-team") {
                          field.onChange(null);
                          return;
                        }
                        field.onChange(Number(value));
                        const newTeamPlayers = players.filter(
                          (p) =>
                            value !== "no-team" && p.teamId === Number(value),
                        );
                        const rolesToAdd = getTeamRoles(
                          newTeamPlayers,
                          roles,
                        ).filter((role) => !formRoles.find((r) => r === role));
                        const newRoles = [...formRoles, ...rolesToAdd];
                        form.setValue("roles", newRoles);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-team">No team</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div>
            <Label>Individual roles</Label>
            <ScrollArea>
              <div className="flex max-h-[20vh] flex-col gap-2">
                {roles.map((role) => {
                  const roleIndex = formRoles.findIndex((r) => r === role.id);
                  const isTeamRole =
                    teamRoles.includes(role.id) && formTeam !== null;
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
                              disabled={isTeamRole}
                            />
                          </FormControl>
                          <FormLabel className="flex w-full flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span>{role.name}</span>
                              {isTeamRole && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs"
                                >
                                  Team Role
                                </Badge>
                              )}
                            </div>
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
          <div className="flex flex-col gap-2 border-t pt-4">
            <Label>
              All Roles{teams.length > 0 ? " (individual + team)" : ""}
            </Label>
            {formRoles.length > 0 && (
              <ScrollArea>
                <div className="flex max-w-60 items-center gap-2 sm:max-w-80">
                  {formRoles.map((roleId) => {
                    const role = roles.find((r) => r.id === roleId);
                    if (!role) return null;
                    const isTeamRole =
                      teamRoles.includes(role.id) && formTeam !== null;
                    return (
                      <Badge
                        key={roleId}
                        variant={isTeamRole ? "outline" : "secondary"}
                        className="text-nowrap"
                      >
                        {role.name}
                        {isTeamRole && "(Team)"}
                      </Badge>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={updatePlayer.isPending}>
              {updatePlayer.isPending ? (
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
