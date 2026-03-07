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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import { ScrollArea } from "@board-games/ui/scroll-area";

import type { Team } from "./selector";
import { useAppForm } from "~/hooks/form";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";
import { AddTeamForm, TeamRow } from "./team-selector-components";

const formSchema = z.object({
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string().trim().min(1, { message: "Team name is required" }),
      roles: z.array(
        z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
      ),
    }),
  ),
});

const roleFormSchema = z.object({
  roles: z.array(
    z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
  ),
});

export type TeamValue = z.infer<typeof formSchema>["teams"][number];

/**
 * Generates a temporary negative team id for in-form teams that are not yet persisted.
 * This ensures unsaved teams never collide with existing positive database ids.
 */
const getLowestTeamId = (teams: TeamValue[]) =>
  teams.reduce((acc, curr) => (curr.id < acc ? curr.id : acc), -1) - 2;

/**
 * Team editor for match setup.
 * Accepts current teams with player counts, supports temporary team IDs, and
 * returns normalized teams through setTeams or exits through cancel.
 */
export const ManageTeamContent = ({
  teams,
  roles,
  setTeams,
  cancel,
}: {
  teams: (Team & { players: number })[];

  roles: RouterOutputs["game"]["gameRoles"];
  setTeams: (teams: Team[]) => void;
  cancel: () => void;
}) => {
  const [newTeam, setNewTeam] = useState("");
  const [editingTeamRoles, setEditingTeamRoles] = useState(false);
  const [activeTeamEdit, setActiveTeamEdit] = useState<number | null>(null);
  const [showAddTeam, setShowAddTeam] = useState(false);

  const form = useAppForm({
    defaultValues: {
      teams: teams.map(({ players: _players, ...team }) => team),
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      setTeams(value.teams);
    },
  });

  if (editingTeamRoles && activeTeamEdit !== null) {
    const currentTeams = form.getFieldValue("teams");
    const foundTeam = currentTeams.find((t) => t.id === activeTeamEdit);
    if (foundTeam) {
      const onClose = () => {
        setEditingTeamRoles(false);
        setActiveTeamEdit(null);
      };
      const onSave = (
        newRoles: (
          | z.infer<typeof originalRoleSchema>
          | z.infer<typeof sharedRoleSchema>
        )[],
      ) => {
        const teamIndex = currentTeams.findIndex(
          (t) => t.id === activeTeamEdit,
        );
        form.setFieldValue(`teams[${teamIndex}].roles`, newRoles);
        onClose();
      };
      return (
        <ManageTeamRoles
          roles={roles}
          team={foundTeam}
          onClose={onClose}
          onSave={onSave}
        />
      );
    }
  }
  const handleAddTeam = () => {
    const trimmedTeam = newTeam.trim();
    if (trimmedTeam.length === 0) {
      return;
    }
    const currentTeams = form.getFieldValue("teams");
    form.pushFieldValue("teams", {
      id: getLowestTeamId(currentTeams),
      name: trimmedTeam,
      roles: [],
    });
    setNewTeam("");
    setShowAddTeam(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Teams</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
      >
        <div className="border-b border-gray-700 py-2 sm:p-6">
          <AddTeamForm
            showAddTeam={showAddTeam}
            newTeam={newTeam}
            setNewTeam={setNewTeam}
            setShowAddTeam={setShowAddTeam}
            addTeam={handleAddTeam}
          />
        </div>
        <ScrollArea>
          <form.Field name="teams">
            {(teamsField) => (
              <div className="flex max-h-[50vh] flex-col gap-2">
                {teamsField.state.value.map((team, index) => {
                  const teamPlayers =
                    teams.find((t) => t.id === team.id)?.players ?? 0;
                  const teamNameFieldPath = `teams[${index}].name` as const;
                  const editingNameValue =
                    form.getFieldValue(teamNameFieldPath);

                  return (
                    <TeamRow
                      key={team.id}
                      team={team}
                      teamPlayers={teamPlayers}
                      isEditingName={activeTeamEdit === team.id}
                      editingNameValue={editingNameValue}
                      onEditingNameValueChange={(value) => {
                        form.setFieldValue(teamNameFieldPath, value);
                      }}
                      onSaveName={() => {
                        const trimmedTeam = editingNameValue.trim();
                        if (trimmedTeam.length === 0) {
                          return;
                        }
                        form.setFieldValue(teamNameFieldPath, trimmedTeam);
                        setActiveTeamEdit(null);
                      }}
                      setActiveTeamEdit={setActiveTeamEdit}
                      setEditingTeamRoles={setEditingTeamRoles}
                      onRemoveTeam={() => {
                        teamsField.removeValue(index);
                        setActiveTeamEdit(null);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </form.Field>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              cancel();
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </>
  );
};

const ManageTeamRoles = ({
  team,
  roles,
  onClose,
  onSave,
}: {
  team: {
    id: number;
    name: string;
    roles: (
      | z.infer<typeof originalRoleSchema>
      | z.infer<typeof sharedRoleSchema>
    )[];
  };
  roles: RouterOutputs["game"]["gameRoles"];
  onClose: () => void;
  onSave: (
    roles: (
      | z.infer<typeof originalRoleSchema>
      | z.infer<typeof sharedRoleSchema>
    )[],
  ) => void;
}) => {
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const form = useAppForm({
    defaultValues: {
      roles: team.roles,
    },
    validators: {
      onSubmit: roleFormSchema,
    },
    onSubmit: ({ value }) => {
      onSave(value.roles);
    },
  });

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Edit {team.name} Roles</DialogTitle>
      </DialogHeader>
      <form.Field name="roles">
        {(field) => (
          <div className="flex flex-col gap-2 py-2 pt-4">
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

            <ScrollArea className="h-[30vh]">
              <div className="flex flex-col gap-2">
                {filteredRoles.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    {roleSearchTerm
                      ? "No roles found matching your search"
                      : "No roles available"}
                  </p>
                ) : (
                  filteredRoles.map((role) => (
                    <div
                      key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                      className="flex items-center space-x-3 rounded p-2"
                    >
                      <Checkbox
                        id={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                        checked={
                          field.state.value.find((r) => isSameRole(r, role)) !==
                          undefined
                        }
                        onCheckedChange={() => {
                          const foundRoleIndex = field.state.value.findIndex(
                            (r) => isSameRole(r, role),
                          );
                          if (foundRoleIndex > -1) {
                            const newRoles = field.state.value.filter(
                              (r) => !isSameRole(r, role),
                            );
                            field.handleChange(newRoles);
                          } else {
                            field.handleChange([...field.state.value, role]);
                          }
                        }}
                      />
                      <div className="flex-1 gap-2">
                        <Label
                          htmlFor={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                        >
                          {role.name}
                        </Label>

                        <p className="text-muted-foreground text-xs">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {field.state.value.length > 0 && (
              <div className="border-foreground-secondary flex flex-col gap-2 border-t pt-2">
                <p className="text-foreground text-xs">Selected roles:</p>
                <ScrollArea>
                  <div className="flex max-h-12 flex-wrap gap-2">
                    {field.state.value.map((formRole) => {
                      const role = roles.find((r) => isSameRole(r, formRole));
                      return role ? (
                        <Badge
                          key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                          variant="secondary"
                          className="w-28 truncate text-xs text-nowrap"
                        >
                          {role.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </form.Field>
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onClose();
          }}
        >
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  );
};
