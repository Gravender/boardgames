"use client";

import { useState } from "react";
import { Plus, Search, SquarePen, Trash2 } from "lucide-react";
import z from "zod";

import { editRoleSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
} from "@board-games/ui/card";
import { DialogFooter } from "@board-games/ui/dialog";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Textarea } from "@board-games/ui/textarea";

import { withFieldGroup } from "~/hooks/form";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rolesSchema = z.array(editRoleSchema);
type rolesSchemaType = z.infer<typeof rolesSchema>;
const defaultValues: {
  roles: rolesSchemaType;
} = {
  roles: [],
};
export const RolesForm = withFieldGroup({
  defaultValues: defaultValues,
  props: {
    onClose: () => {
      /* empty */
    },
  },
  render: function Render({ group, onClose }) {
    const [editGameRoleIndex, setEditGameRoleIndex] = useState<number | null>(
      null,
    );
    const [roleSearchTerm, setRoleSearchTerm] = useState("");
    const [newGameRole, setNewGameRole] = useState<{
      name: string;
      description: string | null;
    }>({
      name: "",
      description: null,
    });

    return (
      <group.Subscribe selector={(state) => state.values.roles}>
        {(roles) => {
          const rolesWithType = roles.map((r) => ({
            ...r,
            type: "original" as const,
          }));
          const searchTerm = roleSearchTerm.toLowerCase();

          const filteredRoles = rolesWithType.filter(
            (role) =>
              role.name.toLowerCase().includes(searchTerm) ||
              role.description?.toLowerCase().includes(searchTerm),
          );

          filteredRoles.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            const aDesc = a.description?.toLowerCase() ?? "";
            const bDesc = b.description?.toLowerCase() ?? "";

            const aNameIndex = aName.indexOf(searchTerm);
            const bNameIndex = bName.indexOf(searchTerm);
            const aDescIndex = aDesc.indexOf(searchTerm);
            const bDescIndex = bDesc.indexOf(searchTerm);

            if (aNameIndex !== -1 && bNameIndex === -1) return -1;
            if (aNameIndex === -1 && bNameIndex !== -1) return 1;

            const aIndex = aNameIndex !== -1 ? aNameIndex : aDescIndex;
            const bIndex = bNameIndex !== -1 ? bNameIndex : bDescIndex;

            if (aIndex !== bIndex) return aIndex - bIndex;
            if (aName !== bName) return aName.localeCompare(bName);
            return aDesc.localeCompare(bDesc);
          });

          return (
            <>
              <CardContent className="space-y-8">
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
                <group.AppField name="roles" mode="array">
                  {(field) => {
                    return (
                      <ScrollArea>
                        <div className="flex max-h-[40vh] flex-col gap-2">
                          {editGameRoleIndex === -1 ? (
                            <Card className="gap-2 p-2 py-2">
                              <CardContent className="flex flex-col gap-4 px-2">
                                <Input
                                  placeholder="Role Name"
                                  value={newGameRole.name}
                                  onChange={(e) => {
                                    setNewGameRole({
                                      name: e.target.value,
                                      description: newGameRole.description,
                                    });
                                  }}
                                />
                                <Textarea
                                  placeholder="Role Description"
                                  value={newGameRole.description ?? ""}
                                  onChange={(e) =>
                                    setNewGameRole({
                                      name: newGameRole.name,
                                      description:
                                        e.target.value === ""
                                          ? null
                                          : e.target.value,
                                    })
                                  }
                                />
                              </CardContent>
                              <CardFooter className="justify-end gap-2 p-2 pt-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditGameRoleIndex(null);
                                    setNewGameRole({
                                      name: "",
                                      description: null,
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    const minId = Math.min(
                                      ...field.state.value.map(
                                        (role) => role.id,
                                      ),
                                      0,
                                    );
                                    field.pushValue({
                                      id: isNaN(minId) ? -1 : minId - 1,
                                      name: newGameRole.name,
                                      description: newGameRole.description,
                                    });
                                    setEditGameRoleIndex(null);
                                    setNewGameRole({
                                      name: "",
                                      description: null,
                                    });
                                  }}
                                >
                                  Save
                                </Button>
                              </CardFooter>
                            </Card>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full"
                              onClick={() => {
                                setEditGameRoleIndex(-1);
                              }}
                            >
                              <Plus />
                              Role
                            </Button>
                          )}
                          {filteredRoles.map((role) => {
                            const roleIndex = roles.findIndex(
                              (r) => r.id === role.id,
                            );
                            if (roleIndex === editGameRoleIndex) {
                              return (
                                <Card key={role.id} className="gap-2 p-2 py-2">
                                  <CardContent className="flex flex-col gap-2 px-2">
                                    <group.AppField
                                      name={`roles[${roleIndex}].name`}
                                    >
                                      {(field) => {
                                        const isInvalid =
                                          field.state.meta.isTouched &&
                                          !field.state.meta.isValid;
                                        return (
                                          <Field data-invalid={isInvalid}>
                                            <FieldLabel className="sr-only">
                                              Name
                                            </FieldLabel>
                                            <Input
                                              placeholder="Role name"
                                              value={field.state.value}
                                              onBlur={field.handleBlur}
                                              onChange={(e) =>
                                                field.handleChange(
                                                  e.target.value,
                                                )
                                              }
                                              aria-invalid={isInvalid}
                                            />
                                            {isInvalid && (
                                              <FieldError
                                                errors={field.state.meta.errors}
                                              />
                                            )}
                                          </Field>
                                        );
                                      }}
                                    </group.AppField>
                                    <group.AppField
                                      name={`roles[${roleIndex}].description`}
                                    >
                                      {(field) => {
                                        const isInvalid =
                                          field.state.meta.isTouched &&
                                          !field.state.meta.isValid;
                                        return (
                                          <Field data-invalid={isInvalid}>
                                            <FieldLabel className="sr-only">
                                              Description
                                            </FieldLabel>
                                            <Textarea
                                              placeholder="Description for role"
                                              className="resize-none"
                                              value={field.state.value ?? ""}
                                              onBlur={field.handleBlur}
                                              onChange={(e) => {
                                                if (e.target.value === "") {
                                                  field.handleChange(null);
                                                  return;
                                                }
                                                field.handleChange(
                                                  e.target.value,
                                                );
                                              }}
                                              aria-invalid={isInvalid}
                                            />
                                            {isInvalid && (
                                              <FieldError
                                                errors={field.state.meta.errors}
                                              />
                                            )}
                                          </Field>
                                        );
                                      }}
                                    </group.AppField>
                                  </CardContent>
                                  <CardFooter className="justify-end p-2 pt-2">
                                    <CardAction>
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          setEditGameRoleIndex(null);
                                        }}
                                      >
                                        Save
                                      </Button>
                                    </CardAction>
                                  </CardFooter>
                                </Card>
                              );
                            }

                            return (
                              <Card key={role.id} className="p-2 py-2">
                                <CardContent className="flex flex-row justify-between gap-2 px-4">
                                  <div className="flex flex-1 items-center gap-3">
                                    <div className="flex-1">
                                      <h4 className="text-sm font-medium">
                                        {role.name}
                                      </h4>
                                      {role.description && (
                                        <p className="text-muted-foreground max-w-xs truncate text-xs">
                                          {role.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setEditGameRoleIndex(roleIndex)
                                      }
                                    >
                                      <SquarePen className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        field.removeValue(roleIndex);
                                      }}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    );
                  }}
                </group.AppField>
              </CardContent>
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
                <Button type="button" onClick={() => onClose()}>
                  Save
                </Button>
              </DialogFooter>
            </>
          );
        }}
      </group.Subscribe>
    );
  },
});
