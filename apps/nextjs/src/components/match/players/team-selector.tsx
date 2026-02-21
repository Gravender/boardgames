"use client";

import { useState } from "react";
import { Plus, Search, SquarePen, Trash2 } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import {
  isSameRole,
  originalRoleSchema,
  sharedRoleSchema,
} from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
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
import { Label } from "@board-games/ui/label";
import { ScrollArea } from "@board-games/ui/scroll-area";

import type { Team } from "./selector";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";

const formSchema = z.object({
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

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      teams: teams,
    },
  });

  const formTeams = form.watch("teams");
  const { append, remove, update } = useFieldArray({
    control: form.control,
    name: "teams",
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setTeams(data.teams);
  };

  if (editingTeamRoles && activeTeamEdit) {
    const foundTeam = formTeams.find((t) => t.id === activeTeamEdit);
    if (foundTeam) {
      const onClose = () => {
        setEditingTeamRoles(false);
        setActiveTeamEdit(null);
      };
      const onSave = (
        roles: (
          | z.infer<typeof originalRoleSchema>
          | z.infer<typeof sharedRoleSchema>
        )[],
      ) => {
        const teamIndex = formTeams.findIndex((t) => t.id === activeTeamEdit);
        update(teamIndex, {
          id: foundTeam.id,
          roles,
          name: foundTeam.name,
        });
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

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>Edit Teams</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="border-b border-gray-700 py-2 sm:p-6">
          {showAddTeam ? (
            <Card className="py-2">
              <CardContent className="flex items-center gap-3 px-2 sm:px-4">
                <Input
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      const lowestId =
                        formTeams.reduce(
                          (acc, curr) => (curr.id < acc ? curr.id : acc),
                          -1,
                        ) - 2;
                      append(
                        {
                          id: lowestId,
                          name: newTeam,
                          roles: [],
                        },
                        {
                          shouldFocus: false,
                        },
                      );
                      setNewTeam("");
                    }
                  }}
                  placeholder={"Add new team"}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-sm sm:text-base"
                  onClick={() => {
                    const lowestId =
                      formTeams.reduce(
                        (acc, curr) => (curr.id < acc ? curr.id : acc),
                        -1,
                      ) - 2;
                    append({
                      id: lowestId,
                      name: newTeam,
                      roles: [],
                    });
                    setNewTeam("");
                    setShowAddTeam(false);
                  }}
                  disabled={newTeam === ""}
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddTeam(false);
                    setNewTeam("");
                  }}
                  className="text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setShowAddTeam(true)}
              className="w-full border-dashed"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Team
            </Button>
          )}
        </div>
        <ScrollArea>
          <div className="flex max-h-[50vh] flex-col gap-2">
            {formTeams.map((team) => {
              const foundIndex = formTeams.findIndex((t) => t.id === team.id);
              if (foundIndex === -1) {
                return null;
              }
              const teamPlayers =
                teams.find((t) => t.id === team.id)?.players ?? 0;

              return (
                <Card key={team.id}>
                  <CardContent className="flex flex-col gap-2 px-4 py-2">
                    <div className="flex flex-col gap-1">
                      {activeTeamEdit === team.id ? (
                        <FormField
                          control={form.control}
                          name={`teams.${foundIndex}.name`}
                          render={({ field }) => (
                            <FormItem className="space-y-0">
                              <FormLabel className="sr-only">
                                Team Name
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-2">
                                  <Input
                                    className="text-base font-medium"
                                    placeholder="Team name"
                                    {...field}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => setActiveTeamEdit(null)}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="flex h-10 items-center gap-2 py-2">
                          <span
                            className="cursor-pointer font-medium transition-colors hover:text-purple-300"
                            onClick={() => setActiveTeamEdit(team.id)}
                            title="Click to edit team name"
                          >
                            {team.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveTeamEdit(team.id)}
                          >
                            <SquarePen className="size-6" />
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <span>{teamPlayers} players</span>
                        <span>{team.roles.length} team roles</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTeamRoles(true);
                          setActiveTeamEdit(team.id);
                        }}
                      >
                        {team.roles.length > 0 ? (
                          <div>
                            {`${team.roles.length} role${team.roles.length !== 1 ? "s" : ""} selected`}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No roles selected
                          </span>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          remove(foundIndex);
                          setActiveTeamEdit(null);
                        }}
                        className="border-destructive text-destructive hover:bg-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Team</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
    </Form>
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
  const formSchema = z.object({
    roles: z.array(
      z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
    ),
  });
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      roles: team.roles,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values.roles);
  };

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);

  const formRoles = form.watch("roles");
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Edit {team.name} Roles</DialogTitle>
        </DialogHeader>
        <FormField
          control={form.control}
          name={`roles`}
          render={({ field }) => (
            <div className="flex flex-col gap-2 py-2 pt-4">
              {/* Search Roles */}
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

              {/* Roles List */}
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
                            field.value.find((r) => isSameRole(r, role)) !==
                            undefined
                          }
                          onCheckedChange={() => {
                            const foundRoleIndex = field.value.findIndex((r) =>
                              isSameRole(r, role),
                            );
                            if (foundRoleIndex > -1) {
                              const newRoles = [
                                ...field.value.filter(
                                  (r) => !isSameRole(r, role),
                                ),
                              ];
                              field.onChange(newRoles);
                            } else {
                              field.onChange([...field.value, role]);
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

              {/* Selected Roles Summary */}
              {formRoles.length > 0 && (
                <div className="border-foreground-secondary flex flex-col gap-2 border-t pt-2">
                  <p className="text-foreground text-xs">Selected roles:</p>
                  <ScrollArea>
                    <div className="flex max-h-12 flex-wrap gap-2">
                      {formRoles.map((formRole) => {
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
        />
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
    </Form>
  );
};
