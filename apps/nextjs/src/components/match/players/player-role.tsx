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

import { useAppForm } from "~/hooks/form";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";

const roleSchema = z.array(
  z.discriminatedUnion("type", [originalRoleSchema, sharedRoleSchema]),
);
export const ManagePlayerRoles = ({
  player,
  teamRoles,
  roles,
  onClose,
  onSave,
}: {
  player: {
    id: number;
    name: string;
    roles: (
      | z.infer<typeof originalRoleSchema>
      | z.infer<typeof sharedRoleSchema>
    )[];
  };
  teamRoles: (
    | z.infer<typeof originalRoleSchema>
    | z.infer<typeof sharedRoleSchema>
  )[];
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
    roles: roleSchema,
  });
  const form = useAppForm({
    defaultValues: {
      roles: player.roles,
    },
    validators: {
      onSubmit: formSchema,
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
        <DialogTitle>Edit {player.name} Roles</DialogTitle>
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
                  filteredRoles.map((role) => {
                    const isTeamRole =
                      teamRoles.findIndex((r) => isSameRole(r, role)) > -1;
                    return (
                      <div
                        key={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                        className="flex items-center space-x-3 rounded p-2"
                      >
                        <Checkbox
                          id={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                          checked={
                            field.state.value.find((r) =>
                              isSameRole(r, role),
                            ) !== undefined
                          }
                          onCheckedChange={() => {
                            const foundRoleIndex = field.state.value.findIndex(
                              (r) => isSameRole(r, role),
                            );
                            if (foundRoleIndex > -1) {
                              const newRoles = [
                                ...field.state.value.filter(
                                  (r) => !isSameRole(r, role),
                                ),
                              ];
                              field.handleChange(newRoles);
                            } else {
                              field.handleChange([
                                ...field.state.value,
                                { ...role },
                              ]);
                            }
                          }}
                          disabled={isTeamRole}
                        />
                        <div className="flex-1 gap-2">
                          <Label
                            htmlFor={`${role.type}-${role.type === "original" ? role.id : role.sharedId}`}
                          >
                            {role.name}
                            {isTeamRole ? " (Team)" : ""}
                          </Label>

                          <p className="text-muted-foreground text-xs">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {field.state.value.length > 0 && (
              <div className="border-foreground-secondary flex flex-col gap-2 border-t pt-2">
                <p className="text-foreground text-xs">Selected roles:</p>
                <ScrollArea>
                  <div className="flex max-h-12 flex-wrap gap-2">
                    {field.state.value.map((formRole) => {
                      const foundRole = roles.find((r) =>
                        isSameRole(r, formRole),
                      );
                      const isTeamRole =
                        teamRoles.findIndex((r) => isSameRole(r, formRole)) >
                        -1;
                      return foundRole ? (
                        <Badge
                          key={`${foundRole.type}-${foundRole.type === "original" ? foundRole.id : foundRole.sharedId}`}
                          variant="secondary"
                          className="w-28 truncate text-xs text-nowrap"
                        >
                          {foundRole.name}
                          {isTeamRole ? " (Team)" : ""}
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
