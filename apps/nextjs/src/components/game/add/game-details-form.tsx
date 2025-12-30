"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import type { ImagePreviewType } from "@board-games/shared";
import { gameIcons } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
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

import type { AddGameFormValues } from "./add-game.types";
import { GameImage } from "~/components/game-image";
import { withForm } from "~/hooks/form";
import { ScoresheetsForm } from "./scoresheets-form";

export const GameDetailsForm = withForm({
  defaultValues: {} as AddGameFormValues,
  props: {
    imagePreview: null as ImagePreviewType | null,
    setImagePreview: (_: ImagePreviewType | null) => {
      /* empty */
    },
    setIsScoresheet: () => {
      /* empty */
    },
    setActiveScoreSheet: (_: number) => {
      /* empty */
    },
  },
  render: function Render({ form, imagePreview, setImagePreview }) {
    return (
      <form.Subscribe
        selector={(state) => ({
          roles: state.values.game.roles,
          moreOptions: state.values.moreOptions,
        })}
      >
        {({ roles, moreOptions }) => {
          return (
            <div className="space-y-8">
              <form.AppField name="game.name">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Game Name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Game name"
                        autoComplete="off"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.AppField>

              <form.AppField name="game.gameImg">
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
                          <PopoverTrigger asChild>
                            <Button variant="outline" type="button">
                              Icons
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <h4 className="mb-2 font-medium">Select an Icon</h4>
                            <div className="grid grid-cols-4 gap-2">
                              {gameIcons.map((option) => (
                                <Button
                                  key={option.name}
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
                            if (file) {
                              if (imagePreview?.type === "file") {
                                URL.revokeObjectURL(imagePreview.url);
                              }
                              setImagePreview({
                                type: "file",
                                url: URL.createObjectURL(file),
                              });
                            }
                          }}
                        />
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.AppField>

              <form.AppField name="game.ownedBy">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} orientation="horizontal">
                      <Checkbox
                        id={field.name}
                        checked={field.state.value}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked as boolean)
                        }
                      />
                      <FieldLabel htmlFor={field.name} className="font-normal">
                        Owned by
                      </FieldLabel>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.AppField>

              <Collapsible
                open={moreOptions}
                onOpenChange={(open) => form.setFieldValue("moreOptions", open)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    className="pl-0"
                    variant="ghost"
                    size="sm"
                    type="button"
                  >
                    <span>More options</span>
                    {moreOptions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label>Players</Label>
                      <form.AppField
                        name="game.playersMin"
                        validators={{
                          onChangeListenTo: ["game.playersMax"],
                          onChange: ({ value, fieldApi }) => {
                            const max =
                              fieldApi.form.getFieldValue("game.playersMax");
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
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel className="sr-only">
                                Min Players
                              </FieldLabel>
                              <Input
                                type="number"
                                name={field.name}
                                placeholder="Min"
                                value={field.state.value ?? ""}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value === ""
                                      ? null
                                      : parseInt(e.target.value),
                                  )
                                }
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.AppField>
                      <form.AppField
                        name="game.playersMax"
                        validators={{
                          onChangeListenTo: ["game.playersMin"],
                          onChange: ({ value, fieldApi }) => {
                            const min =
                              fieldApi.form.getFieldValue("game.playersMin");
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
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel className="sr-only">
                                Max Players
                              </FieldLabel>
                              <Input
                                type="number"
                                name={field.name}
                                placeholder="Max"
                                value={field.state.value ?? ""}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value === ""
                                      ? null
                                      : parseInt(e.target.value),
                                  )
                                }
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.AppField>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label>Playtime</Label>
                      <form.AppField
                        name="game.playtimeMin"
                        validators={{
                          onChangeListenTo: ["game.playtimeMax"],
                          onChange: ({ value, fieldApi }) => {
                            const max =
                              fieldApi.form.getFieldValue("game.playtimeMax");
                            if (value !== null && max !== null && value > max) {
                              return [
                                {
                                  message:
                                    "Min playtime must be <= max playtime",
                                },
                              ];
                            }
                            return undefined;
                          },
                        }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel className="sr-only">
                                Min Playtime
                              </FieldLabel>
                              <Input
                                type="number"
                                name={field.name}
                                placeholder="Min"
                                value={field.state.value ?? ""}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value === ""
                                      ? null
                                      : parseInt(e.target.value),
                                  )
                                }
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.AppField>
                      <form.AppField
                        name="game.playtimeMax"
                        validators={{
                          onChangeListenTo: ["game.playtimeMin"],
                          onChange: ({ value, fieldApi }) => {
                            const min =
                              fieldApi.form.getFieldValue("game.playtimeMin");
                            if (min !== null && value !== null && value < min) {
                              return [
                                {
                                  message:
                                    "Max playtime must be >= min playtime",
                                },
                              ];
                            }
                            return undefined;
                          },
                        }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel className="sr-only">
                                Max Playtime
                              </FieldLabel>
                              <Input
                                type="number"
                                name={field.name}
                                placeholder="Max"
                                value={field.state.value ?? ""}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value === ""
                                      ? null
                                      : parseInt(e.target.value),
                                  )
                                }
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.AppField>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label>Year Published</Label>
                      <form.AppField name="game.yearPublished">
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel className="sr-only">
                                Year Published
                              </FieldLabel>
                              <Input
                                type="number"
                                name={field.name}
                                placeholder="Year"
                                value={field.state.value ?? ""}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(
                                    e.target.value === ""
                                      ? null
                                      : parseInt(e.target.value),
                                  )
                                }
                                aria-invalid={isInvalid}
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.AppField>
                      <div></div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => form.setFieldValue("activeForm", "roles")}
                  >
                    Edit Game Roles{roles.length > 0 && ` (${roles.length})`}
                  </Button>
                  <Separator className="w-full" orientation="horizontal" />
                  <ScoresheetsForm
                    form={form}
                    onOpenScoresheet={() =>
                      form.setFieldValue("activeForm", "scoresheet")
                    }
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        }}
      </form.Subscribe>
    );
  },
});
