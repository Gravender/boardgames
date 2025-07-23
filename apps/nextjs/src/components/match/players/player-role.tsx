"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
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

const roleSchema = z.array(z.number());
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
    roles: number[];
  };
  teamRoles: number[];
  roles: RouterOutputs["game"]["getGameRoles"];
  onClose: () => void;
  onSave: (roles: number[]) => void;
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
                        teamRoles.findIndex((r) => r === role.id) > -1;
                      return (
                        <div
                          key={role.id}
                          className="flex items-center space-x-3 rounded p-2"
                        >
                          <Checkbox
                            id={`${role.id}`}
                            checked={field.value.includes(role.id)}
                            onCheckedChange={() => {
                              const foundRoleIndex = field.value.findIndex(
                                (r) => r === role.id,
                              );
                              if (foundRoleIndex > -1) {
                                const newRoles = [
                                  ...field.value.filter((r) => r !== role.id),
                                ];
                                field.onChange(newRoles);
                              } else {
                                field.onChange([...field.value, role.id]);
                              }
                            }}
                            disabled={isTeamRole}
                          />
                          <div className="flex-1 gap-2">
                            <Label htmlFor={`${role.id}`}>
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
                      {formRoles.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        const isTeamRole =
                          teamRoles.findIndex((r) => r === roleId) > -1;
                        return role ? (
                          <Badge
                            key={roleId}
                            variant="secondary"
                            className="w-28 truncate text-nowrap text-xs"
                          >
                            {role.name}
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
