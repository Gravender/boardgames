"use client";

import { useMemo, useState } from "react";
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
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
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
import { useAppForm } from "~/hooks/form";
import { useUpdateMatchPlayerTeamAndRolesMutation } from "~/hooks/mutations/match/scoresheet";
import { useGameRoles } from "~/hooks/queries/game/roles";
import { useMatch, usePlayersAndTeams } from "~/hooks/queries/match/match";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";

type Player = NonNullable<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]
>["players"][number];
type Team = NonNullable<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]
>["teams"][number];
export default function PlayerEditorDialog({
  player,
  matchInput,
  onCloseAction,
}: {
  player: Player | null;
  matchInput: MatchInput;
  onCloseAction: () => void;
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
    <Dialog open={player !== null} onOpenChange={onCloseAction}>
      <DialogContent className="p-4 sm:max-w-[800px] sm:p-6">
        {player && (
          <Content
            teams={teams}
            player={player}
            players={players}
            roles={gameRoles}
            onCloseAction={onCloseAction}
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
  onCloseAction,
}: {
  teams: Team[];
  player: Player;
  players: Player[];
  roles: RouterOutputs["game"]["gameRoles"];
  onCloseAction: () => void;
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

  const form = useAppForm({
    defaultValues: {
      team: player.teamId ?? null,
      roles: player.roles,
    } as z.infer<typeof formSchema>,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      const isSameTeam = value.team === player.teamId;
      const rolesToAdd = value.roles.filter(
        (role) =>
          !player.roles.find((r) => {
            return isSameRole(r, role);
          }),
      );
      const rolesToRemove = player.roles.filter(
        (role) =>
          !value.roles.find((r) => {
            return isSameRole(r, role);
          }),
      );
      const updateInput =
        player.type === "original"
          ? {
              id: player.id,
              type: "original" as const,
              teamId: isSameTeam ? undefined : value.team,
              rolesToAdd: rolesToAdd,
              rolesToRemove: rolesToRemove.filter((r) => r.type === "original"),
            }
          : {
              sharedMatchPlayerId: player.sharedMatchPlayerId,
              type: "shared" as const,
              teamId: isSameTeam ? undefined : value.team,
              rolesToAdd: rolesToAdd.filter((r) => r.type !== "original"),
              rolesToRemove: rolesToRemove.filter((r) => r.type !== "original"),
            };

      updateMatchPlayerTeamAndRolesMutation.mutate(updateInput, {
        onSuccess: () => {
          onCloseAction();
        },
      });
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
  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);
  const teamSelectItems = useMemo(() => {
    const m: Record<string, string> = { "no-team": "No team" };
    for (const t of teams) {
      m[String(t.id)] = t.name;
    }
    return m;
  }, [teams]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {player.name}</DialogTitle>
        <DialogDescription>
          Edit the {teams.length > 0 ? "team and roles" : "roles"} of{" "}
          {player.name}.
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <form.Subscribe
          selector={(state) => ({
            team: state.values.team,
            roles: state.values.roles,
          })}
        >
          {({ team: formTeam, roles: formRoles }) => {
            const sameTeamPlayers = players.filter(
              (p) => formTeam !== null && p.teamId === formTeam,
            );
            const teamRoles = getTeamRoles(sameTeamPlayers, roles);

            return (
              <>
                {teams.length > 0 && (
                  <form.Field name="team">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel>Team Assignment</FieldLabel>
                          <Select
                            value={
                              field.state.value
                                ? field.state.value.toString()
                                : "no-team"
                            }
                            items={teamSelectItems}
                            onValueChange={(value) => {
                              if (value === "no-team") {
                                const previousTeamPlayers = players.filter(
                                  (p) => p.teamId === field.state.value,
                                );
                                const previousTeamRoles = getTeamRoles(
                                  previousTeamPlayers,
                                  roles,
                                );
                                const updatedRoles = formRoles.filter(
                                  (formRole) =>
                                    !previousTeamRoles.find((teamRole) =>
                                      isSameRole(teamRole, formRole),
                                    ),
                                );
                                form.setFieldValue("roles", updatedRoles);
                                field.handleChange(null);
                                return;
                              }
                              const teamId = Number(value);
                              field.handleChange(teamId);

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
                                  (r) =>
                                    !customRoles.find((cr) =>
                                      isSameRole(cr, r),
                                    ),
                                ),
                              ];

                              form.setFieldValue("roles", updatedRoles);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no-team">No team</SelectItem>
                              {teams.map((team) => (
                                <SelectItem
                                  key={team.id}
                                  value={team.id.toString()}
                                >
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>
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
                        const roleRowId = `edit-player-role-${role.type}-${role.type === "original" ? role.id : role.sharedId}`;
                        const roleIndex = formRoles.findIndex((r) =>
                          isSameRole(r, role),
                        );
                        const isTeamRole =
                          teamRoles.findIndex((r) => isSameRole(r, role)) >
                            -1 && formTeam !== null;
                        return (
                          <form.Field
                            key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                            name="roles"
                          >
                            {(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                              return (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={roleRowId}
                                      checked={roleIndex > -1}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.handleChange([
                                            ...formRoles,
                                            {
                                              ...role,
                                            },
                                          ]);
                                        } else {
                                          field.handleChange(
                                            formRoles.filter(
                                              (r) => !isSameRole(r, role),
                                            ),
                                          );
                                        }
                                      }}
                                      disabled={isTeamRole}
                                    />
                                    <Label
                                      htmlFor={roleRowId}
                                      className="flex w-full flex-col gap-2"
                                    >
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
                                    </Label>
                                  </div>
                                  {isInvalid && (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  )}
                                </div>
                              );
                            }}
                          </form.Field>
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
              </>
            );
          }}
        </form.Subscribe>

        <DialogFooter>
          <form.AppForm>
            <form.SubscribeButton label="Save" />
          </form.AppForm>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onCloseAction()}
          >
            Cancel
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
