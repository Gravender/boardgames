import { useState } from "react";
import { Search } from "lucide-react";

import type { OriginalRole, SharedRole } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Checkbox } from "@board-games/ui/checkbox";
import { DialogHeader, DialogTitle } from "@board-games/ui/dialog";
import { Field } from "@board-games/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@board-games/ui/input-group";
import { ItemDescription, ItemGroup, ItemTitle } from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { withFieldGroup } from "~/hooks/form";

const defaultValues: {
  roles: (OriginalRole | SharedRole)[];
} = {
  roles: [],
};
export const PlayerRoleSelectorField = withFieldGroup({
  defaultValues,
  props: {
    title: "Role",
    gameRoles: [] as (OriginalRole | SharedRole)[],
    team: {
      id: 1,
      name: "Team 1",
      roles: [] as (OriginalRole | SharedRole)[],
    } as
      | {
          id: number;
          name: string;
          roles: (OriginalRole | SharedRole)[];
        }
      | undefined,
  },
  render: function Render({ group, title, gameRoles, team }) {
    const [roleSearchQuery, setRoleSearchQuery] = useState("");
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{`Assign Roles to ${title}`}</DialogTitle>
        </DialogHeader>
        <group.AppField name="roles" mode="array">
          {(field) => {
            const filteredRoles = gameRoles.filter(
              (role) =>
                role.name
                  .toLowerCase()
                  .includes(roleSearchQuery.toLowerCase()) ||
                role.description
                  ?.toLowerCase()
                  .includes(roleSearchQuery.toLowerCase()),
            );
            return (
              <>
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search Roles..."
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  {roleSearchQuery !== "" && (
                    <InputGroupAddon align="inline-end">
                      {filteredRoles.length} results
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <ScrollArea>
                  <ItemGroup className="max-h-[60vh] gap-4">
                    {filteredRoles.map((role) => {
                      const selected = field.state.value.findIndex((r) => {
                        if (r.type == "original") {
                          return r.type === role.type && r.id === role.id;
                        }
                        return (
                          r.type === role.type && r.sharedId === role.sharedId
                        );
                      });
                      const isRoleFromTeam = () => {
                        const foundRole = team?.roles.find((r) => {
                          if (r.type == "original") {
                            return r.type === role.type && r.id === role.id;
                          }
                          return (
                            r.type === role.type && r.sharedId === role.sharedId
                          );
                        });
                        if (foundRole) {
                          return true;
                        } else {
                          return false;
                        }
                      };
                      const fromTeam = isRoleFromTeam();
                      const toggleRole = () => {
                        if (selected > -1) {
                          field.removeValue(selected);
                        } else {
                          if (role.type === "original") {
                            field.pushValue(role);
                          } else {
                            field.pushValue({
                              type: "shared",
                              sharedId: role.sharedId,
                              name: role.name,
                              description: role.description,
                            });
                          }
                        }
                      };
                      return (
                        <Field
                          key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                          orientation="horizontal"
                          className={cn(
                            "border-border focus-visible:border-ring focus-visible:ring-ring/50 flex flex-row gap-4 rounded-md border p-4",
                            selected > -1 && "border-primary bg-primary/5",
                          )}
                        >
                          <Checkbox
                            id={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                            checked={selected > -1}
                            onCheckedChange={() => toggleRole()}
                          />
                          <label
                            htmlFor={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                            className="flex-1 gap-2"
                          >
                            <ItemTitle>
                              {role.name}
                              {fromTeam && (
                                <Badge variant="secondary" className="text-xs">
                                  Team Role
                                </Badge>
                              )}
                            </ItemTitle>
                            <ItemDescription>
                              {role.description}
                            </ItemDescription>
                          </label>
                        </Field>
                      );
                    })}
                  </ItemGroup>
                </ScrollArea>
              </>
            );
          }}
        </group.AppField>
      </div>
    );
  },
});
export const TeamRoleSelectorField = withFieldGroup({
  defaultValues,
  props: {
    title: "Role",
    gameRoles: [] as (OriginalRole | SharedRole)[],
  },
  render: function Render({ group, title, gameRoles }) {
    const [roleSearchQuery, setRoleSearchQuery] = useState("");
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{`Assign Roles to ${title}`}</DialogTitle>
        </DialogHeader>
        <group.AppField name="roles" mode="array">
          {(field) => {
            const filteredRoles = gameRoles.filter(
              (role) =>
                role.name
                  .toLowerCase()
                  .includes(roleSearchQuery.toLowerCase()) ||
                role.description
                  ?.toLowerCase()
                  .includes(roleSearchQuery.toLowerCase()),
            );
            return (
              <>
                <InputGroup>
                  <InputGroupInput
                    placeholder="Search Roles..."
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  {roleSearchQuery !== "" && (
                    <InputGroupAddon align="inline-end">
                      {filteredRoles.length} results
                    </InputGroupAddon>
                  )}
                </InputGroup>
                <ScrollArea>
                  <ItemGroup className="max-h-[60vh] gap-4">
                    {filteredRoles.map((role) => {
                      const selected = field.state.value.findIndex((r) => {
                        if (r.type == "original") {
                          return r.type === role.type && r.id === role.id;
                        }
                        return (
                          r.type === role.type && r.sharedId === role.sharedId
                        );
                      });
                      const toggleRole = () => {
                        if (selected > -1) {
                          field.removeValue(selected);
                        } else {
                          if (role.type === "original") {
                            field.pushValue(role);
                          } else {
                            field.pushValue({
                              type: "shared",
                              sharedId: role.sharedId,
                              name: role.name,
                              description: role.description,
                            });
                          }
                        }
                      };
                      return (
                        <Field
                          key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                          orientation="horizontal"
                          className={cn(
                            "border-border focus-visible:border-ring focus-visible:ring-ring/50 flex flex-row gap-4 rounded-md border p-4",
                            selected > -1 && "border-primary bg-primary/5",
                          )}
                        >
                          <Checkbox
                            id={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                            checked={selected > -1}
                            onCheckedChange={() => toggleRole()}
                          />
                          <label
                            htmlFor={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                            className="flex-1 gap-2"
                          >
                            <ItemTitle>{role.name}</ItemTitle>
                            <ItemDescription>
                              {role.description}
                            </ItemDescription>
                          </label>
                        </Field>
                      );
                    })}
                  </ItemGroup>
                </ScrollArea>
              </>
            );
          }}
        </group.AppField>
      </div>
    );
  },
});
