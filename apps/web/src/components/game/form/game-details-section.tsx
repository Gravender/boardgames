"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { ImagePreviewType } from "@board-games/shared";
import { gameIcons } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import { GameImage } from "~/components/game-image";
import { withFieldGroup } from "~/hooks/form";

type GameDetailsSectionProps = {
  form: any;
  variant: "add" | "edit";
  imagePreview: ImagePreviewType | null;
  setImagePreview: (imagePreview: ImagePreviewType | null) => void;
  onEditRoles: () => void;
  scoresheets: ReactNode;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
};

export const GameDetailsSection = ({
  form,
  variant,
  imagePreview,
  setImagePreview,
  onEditRoles,
  scoresheets,
  advancedOpen,
  onAdvancedOpenChange,
}: GameDetailsSectionProps) => {
  const [uncontrolledAdvancedOpen, setUncontrolledAdvancedOpen] =
    useState(false);
  const isAdvancedOpen = advancedOpen ?? uncontrolledAdvancedOpen;
  const setIsAdvancedOpen = onAdvancedOpenChange ?? setUncontrolledAdvancedOpen;

  const AdvancedWrapper =
    variant === "add"
      ? ({ children }: { children: ReactNode }) => (
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger
              render={
                <Button
                  className="pl-0"
                  variant="ghost"
                  size="sm"
                  type="button"
                >
                  <span>More options</span>
                  {isAdvancedOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              }
            />
            <CollapsibleContent className="space-y-4">
              {children}
            </CollapsibleContent>
          </Collapsible>
        )
      : ({ children }: { children: ReactNode }) => (
          <div className="space-y-4">{children}</div>
        );

  return (
    <GameDetailsFieldsGroup
      form={form}
      fields={"game" as any}
      imagePreview={imagePreview}
      setImagePreview={setImagePreview}
      onEditRoles={onEditRoles}
      advancedWrapper={(children) => (
        <AdvancedWrapper>{children}</AdvancedWrapper>
      )}
      scoresheets={scoresheets}
    />
  );
};

const GameDetailsFieldsGroup = withFieldGroup({
  defaultValues: {} as any,
  props: {
    imagePreview: null as ImagePreviewType | null,
    setImagePreview: (_: ImagePreviewType | null) => {
      /* empty */
    },
    onEditRoles: () => {
      /* empty */
    },
    advancedWrapper: (_: ReactNode) => <div />,
    scoresheets: null as ReactNode,
  },
  render: function Render({
    group,
    imagePreview,
    setImagePreview,
    onEditRoles,
    advancedWrapper,
    scoresheets,
  }) {
    return (
      <group.Subscribe selector={(state) => state.values.roles.length as number}>
        {(rolesLength) => (
          <div className="space-y-8">
            <group.AppField name="name">
              {(field) => (
                <field.TextField label="Game Name" placeholder="Game name" />
              )}
            </group.AppField>

            <group.AppField name="gameImg">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Image</FieldLabel>
                    <div className="flex items-center space-x-4">
                      <GameImage
                        image={
                          imagePreview
                            ? imagePreview.type === "svg"
                              ? {
                                  name: imagePreview.name,
                                  url: "",
                                  type: "svg",
                                  usageType: "game",
                                }
                              : {
                                  name: "Game Preview Image",
                                  url: imagePreview.url,
                                  type: "file",
                                  usageType: "game",
                                }
                            : null
                        }
                        alt="Game image"
                        containerClassName="h-14 w-14 sm:h-20 sm:w-20"
                        userImageClassName="object-cover"
                      />
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button variant="outline" type="button">
                              Icons
                            </Button>
                          }
                        />
                        <PopoverContent className="w-80">
                          <h4 className="mb-2 font-medium">Select an Icon</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {gameIcons.map((option) => (
                              <Button
                                key={option.name}
                                aria-label={`icon-${option.name}`}
                                type="button"
                                variant="outline"
                                size="icon"
                                className={cn(
                                  "h-12 w-12 p-2",
                                  imagePreview?.type === "svg" &&
                                    imagePreview.name === option.name &&
                                    "ring-primary ring-2",
                                )}
                                onClick={() => {
                                  field.handleChange({
                                    type: "svg",
                                    name: option.name,
                                  });
                                  if (imagePreview?.type === "file") {
                                    URL.revokeObjectURL(imagePreview.url);
                                  }
                                  setImagePreview({
                                    type: "svg",
                                    name: option.name,
                                  });
                                }}
                              >
                                <option.icon className="h-full w-full" />
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="file"
                        accept="image/*"
                        placeholder="Custom Image"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.handleChange(
                            file
                              ? {
                                  type: "file",
                                  file: file,
                                }
                              : null,
                          );
                          if (!file) {
                            return;
                          }
                          if (imagePreview?.type === "file") {
                            URL.revokeObjectURL(imagePreview.url);
                          }
                          setImagePreview({
                            type: "file",
                            url: URL.createObjectURL(file),
                          });
                        }}
                      />
                    </div>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </group.AppField>

            <group.AppField name="ownedBy">
              {(field) => <field.CheckboxField label="Owned by" />}
            </group.AppField>

            {advancedWrapper(
              <>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Players</Label>
                    <group.AppField
                      name="playersMin"
                      validators={{
                        onChangeListenTo: ["playersMax"],
                        onChange: ({ value, fieldApi }) => {
                          const max =
                            fieldApi.form.getFieldValue("playersMax") ?? null;
                          if (value !== null && max !== null && value > max) {
                            return [
                              {
                                message: "Min players must be <= max players",
                              },
                            ];
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <field.NullableNumberField
                          label="Min Players"
                          placeholder="Min"
                          hideLabel
                        />
                      )}
                    </group.AppField>
                    <group.AppField
                      name="playersMax"
                      validators={{
                        onChangeListenTo: ["playersMin"],
                        onChange: ({ value, fieldApi }) => {
                          const min =
                            fieldApi.form.getFieldValue("playersMin") ?? null;
                          if (min !== null && value !== null && value < min) {
                            return [
                              {
                                message: "Max players must be >= min players",
                              },
                            ];
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <field.NullableNumberField
                          label="Max Players"
                          placeholder="Max"
                          hideLabel
                        />
                      )}
                    </group.AppField>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Playtime</Label>
                    <group.AppField
                      name="playtimeMin"
                      validators={{
                        onChangeListenTo: ["playtimeMax"],
                        onChange: ({ value, fieldApi }) => {
                          const max =
                            fieldApi.form.getFieldValue("playtimeMax") ?? null;
                          if (value !== null && max !== null && value > max) {
                            return [
                              {
                                message: "Min playtime must be <= max playtime",
                              },
                            ];
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <field.NullableNumberField
                          label="Min Playtime"
                          placeholder="Min"
                          hideLabel
                        />
                      )}
                    </group.AppField>
                    <group.AppField
                      name="playtimeMax"
                      validators={{
                        onChangeListenTo: ["playtimeMin"],
                        onChange: ({ value, fieldApi }) => {
                          const min =
                            fieldApi.form.getFieldValue("playtimeMin") ?? null;
                          if (min !== null && value !== null && value < min) {
                            return [
                              {
                                message: "Max playtime must be >= min playtime",
                              },
                            ];
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <field.NullableNumberField
                          label="Max Playtime"
                          placeholder="Max"
                          hideLabel
                        />
                      )}
                    </group.AppField>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Year Published</Label>
                    <group.AppField name="yearPublished">
                      {(field) => (
                        <field.NullableNumberField
                          label="Year Published"
                          placeholder="Year"
                          hideLabel
                        />
                      )}
                    </group.AppField>
                    <div />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={onEditRoles}
                >
                  Edit Game Roles{rolesLength > 0 && ` (${rolesLength})`}
                </Button>

                <Separator className="w-full" orientation="horizontal" />
                {scoresheets}
              </>,
            )}
          </div>
        )}
      </group.Subscribe>
    );
  },
});

