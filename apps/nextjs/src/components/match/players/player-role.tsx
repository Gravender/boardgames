"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { sharedOrOriginalSchema } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { Form, FormField, useForm } from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { useFilteredRoles } from "~/hooks/use-filtered-roles";

const roleSchema = z.array(
  z.object({ type: sharedOrOriginalSchema, id: z.number() }),
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
    roles: { type: "original" | "shared" | "linked"; id: number }[];
  };
  teamRoles: { type: "original" | "shared" | "linked"; id: number }[];
  roles: RouterOutputs["newGame"]["gameRoles"];
  onClose: () => void;
  onSave: (
    roles: { type: "original" | "shared" | "linked"; id: number }[],
  ) => void;
}) => {
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const formSchema = z.object({
    roles: roleSchema,
  });
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      roles: player.roles,
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
          <DialogTitle>Edit {player.name} Roles</DialogTitle>
        </DialogHeader>
        <FormField
          control={form.control}
          name={`roles`}
          render={({ field }) => (
            <div className="flex flex-col gap-2 py-2 pt-4">
              {/* Search Roles */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
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
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {roleSearchTerm
                        ? "No roles found matching your search"
                        : "No roles available"}
                    </p>
                  ) : (
                    filteredRoles.map((role) => {
                      const isTeamRole =
                        teamRoles.findIndex(
                          (r) => r.id === role.id && r.type === role.type,
                        ) > -1;
                      return (
                        <div
                          key={`${role.type}-${role.id}`}
                          className="flex items-center space-x-3 rounded p-2"
                        >
                          <Checkbox
                            id={`${role.type}-${role.id}`}
                            checked={
                              field.value.find(
                                (r) => r.id === role.id && r.type === role.type,
                              ) !== undefined
                            }
                            onCheckedChange={() => {
                              const foundRoleIndex = field.value.findIndex(
                                (r) => r.id === role.id && r.type === role.type,
                              );
                              if (foundRoleIndex > -1) {
                                const newRoles = [
                                  ...field.value.filter(
                                    (r) =>
                                      !(r.id == role.id && r.type == role.type),
                                  ),
                                ];
                                field.onChange(newRoles);
                              } else {
                                field.onChange([
                                  ...field.value,
                                  { type: role.type, id: role.id },
                                ]);
                              }
                            }}
                            disabled={isTeamRole}
                          />
                          <div className="flex-1 gap-2">
                            <Label htmlFor={`${role.type}-${role.id}`}>
                              {role.name}
                              {isTeamRole ? " (Team)" : ""}
                            </Label>

                            <p className="text-xs text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Selected Roles Summary */}
              {formRoles.length > 0 && (
                <div className="border-foreground-secondary flex flex-col gap-2 border-t pt-2">
                  <p className="text-xs text-foreground">Selected roles:</p>
                  <ScrollArea>
                    <div className="flex max-h-12 flex-wrap gap-2">
                      {formRoles.map((formRole) => {
                        const foundRole = roles.find(
                          (r) =>
                            r.id === formRole.id && r.type === formRole.type,
                        );
                        const isTeamRole =
                          teamRoles.findIndex(
                            (r) =>
                              r.id === formRole.id && r.type === formRole.type,
                          ) > -1;
                        return foundRole ? (
                          <Badge
                            key={`${foundRole.type}-${foundRole.id}`}
                            variant="secondary"
                            className="w-28 truncate text-nowrap text-xs"
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
