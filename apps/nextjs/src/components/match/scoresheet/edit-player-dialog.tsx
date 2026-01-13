"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import {
  isSameRole,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import type { MatchInput } from "../types/input";
import {
  useMatch,
  usePlayersAndTeams,
} from "~/components/match/hooks/suspenseQueries";
import { Spinner } from "~/components/spinner";
import { useGameRoles } from "~/hooks/queries/game/roles";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";
import { useUpdateMatchPlayerTeamAndRolesMutation } from "../hooks/scoresheet";

type Player = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["players"][number];
type Team = NonNullable<
  RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]
>["teams"][number];
export default function PlayerEditorDialog({
  player,
  matchInput,
  onClose,
}: {
  player: Player | null;
  matchInput: MatchInput;
  onClose: () => void;
}) {
  const { match } = useMatch(matchInput);
  const { players, teams } = usePlayersAndTeams(matchInput);
  const { gameRoles } = useGameRoles(
    match.type === "original"
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
    <Dialog open={player !== null} onOpenChange={onClose}>
      <DialogContent className="p-4 sm:max-w-[800px] sm:p-6">
        {player && (
          <Content
            teams={teams}
            player={player}
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
  teams,
  player,
  roles,
  players,
  onClose,
}: {
  teams: Team[];
  player: Player;
  players: Player[];
  roles: RouterOutputs["newGame"]["gameRoles"];
  onClose: () => void;
}) {
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  const { updateMatchPlayerTeamAndRolesMutation } =
    useUpdateMatchPlayerTeamAndRolesMutation();
  const formSchema = z.object({
    team: z.number().nullable(),
    roles: z.array(
      z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
    ),
  });

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      team: player.teamId ?? null,
      roles: player.roles,
    },
  });
  const getTeamRoles = (
    teamPlayers: Player[],
    allRoles: typeof roles,
  ): (
    | z.infer<typeof originalRoleSchema>
    | z.infer<typeof sharedRoleSchema>
  )[] => {
    if (teamPlayers.length === 0) return [];
    return allRoles.reduce<
      (z.infer<typeof originalRoleSchema> | z.infer<typeof sharedRoleSchema>)[]
    >((acc, role) => {
      const roleInEveryPlayer = teamPlayers.every((p) =>
        p.roles.some((r) => {
          return isSameRole(r, role);
        }),
      );
      if (
        !acc.find((r) => {
          return isSameRole(r, role);
        }) &&
        roleInEveryPlayer
      ) {
        acc.push(role);
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
      (role) =>
        !player.roles.find((r) => {
          return isSameRole(r, role);
        }),
    );
    const rolesToRemove = player.roles.filter(
      (role) =>
        !data.roles.find((r) => {
          return isSameRole(r, role);
        }),
    );
    const updateInput =
      player.type === "original"
        ? {
            id: player.id,
            type: "original" as const,
            teamId: isSameTeam ? undefined : data.team,
            rolesToAdd: rolesToAdd,
            rolesToRemove: rolesToRemove.filter((r) => r.type === "original"),
          }
        : {
            sharedMatchPlayerId: player.sharedMatchPlayerId,
            type: "shared" as const,
            teamId: isSameTeam ? undefined : data.team,
            rolesToAdd: rolesToAdd.filter((r) => r.type !== "original"),
            rolesToRemove: rolesToRemove.filter((r) => r.type !== "original"),
          };

    updateMatchPlayerTeamAndRolesMutation.mutate(updateInput, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);

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
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
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
                        const teamId = Number(value);
                        field.onChange(teamId);

                        const newTeamPlayers = players.filter(
                          (p) => p.teamId === teamId,
                        );
                        const newTeamRoles = getTeamRoles(
                          newTeamPlayers,
                          roles,
                        );
                        const customRoles = formRoles.filter(
                          (formRole) =>
                            !teamRoles.find((r) => {
                              return isSameRole(r, formRole);
                            }),
                        );
                        const updatedRoles = [
                          ...customRoles,
                          ...newTeamRoles.filter(
                            (r) => !customRoles.find((cr) => isSameRole(cr, r)),
                          ),
                        ];

                        form.setValue("roles", updatedRoles);
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
          <div className="flex flex-col gap-2">
            <Label>Individual roles</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search roles..."
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                className="pl-10 text-sm"
                aria-label="Search roles"
                type="search"
              />
            </div>
            <ScrollArea>
              <div className="flex max-h-[20vh] flex-col gap-2">
                {filteredRoles.map((role) => {
                  const roleIndex = formRoles.findIndex((r) =>
                    isSameRole(r, role),
                  );
                  const isTeamRole =
                    teamRoles.findIndex((r) => isSameRole(r, role)) > -1 &&
                    formTeam !== null;
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
          <div className="flex flex-col gap-2 border-t pt-4">
            <Label>
              All Roles{teams.length > 0 ? " (individual + team)" : ""}
            </Label>
            {formRoles.length > 0 && (
              <ScrollArea>
                <div className="flex max-w-60 items-center gap-2 sm:max-w-80">
                  {formRoles.map((roleId) => {
                    const role = roles.find((r) => isSameRole(r, roleId));
                    if (!role) return null;
                    const isTeamRole =
                      teamRoles.find((r) => isSameRole(r, roleId)) &&
                      formTeam !== null;
                    return (
                      <Badge
                        key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
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
            <Button
              type="submit"
              disabled={updateMatchPlayerTeamAndRolesMutation.isPending}
            >
              {updateMatchPlayerTeamAndRolesMutation.isPending ? (
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
