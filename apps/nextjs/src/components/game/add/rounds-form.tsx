"use client";

import { Copy, Minus, Plus, Trash } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";

import type { Rounds } from "./add-game.types";
import { GradientPicker } from "~/components/color-picker";
import { withFieldGroup } from "~/hooks/form";
import { defaultRound } from "./add-game.types";
import { RoundPopOver } from "./round-popover";

export const defaultValues: {
  rounds: Rounds;
} = {
  rounds: [defaultRound],
};
export const RoundsForm = withFieldGroup({
  defaultValues: defaultValues,
  props: {
    editable: true,
  },
  render: function Render({ group, editable }) {
    return (
      <div className="flex flex-col gap-2 pb-4">
        <div className="text-xl font-semibold">Rounds</div>
        <group.Field name="rounds" mode="array">
          {(field) => {
            return (
              <>
                <div className="flex max-h-[25vh] flex-col gap-2 overflow-auto py-1">
                  {field.state.value.map((_, index) => {
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <group.AppField name={`rounds[${index}].color`}>
                            {(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                              return (
                                <Field
                                  data-invalid={isInvalid}
                                  className="w-fit rounded-2xl"
                                >
                                  <FieldLabel className="hidden">
                                    Round Color
                                  </FieldLabel>
                                  <GradientPicker
                                    color={field.state.value ?? null}
                                    setColor={field.handleChange}
                                    disabled={!editable}
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
                          <group.AppField name={`rounds[${index}].name`}>
                            {(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                              return (
                                <Field
                                  data-invalid={isInvalid}
                                  className="space-y-0"
                                >
                                  <FieldLabel className="hidden">
                                    Round Name
                                  </FieldLabel>
                                  <Input
                                    placeholder="Round name"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                      field.handleChange(e.target.value)
                                    }
                                    aria-invalid={isInvalid}
                                    disabled={!editable}
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
                        </div>
                        <div className="flex items-center gap-2">
                          {field.state.value[index] && (
                            <RoundPopOver
                              form={group}
                              fields={{
                                round: `rounds[${index}]`,
                              }}
                              disabled={!editable}
                            />
                          )}
                          <Button
                            variant="secondary"
                            size="icon"
                            type="button"
                            onClick={() => {
                              const newRound = {
                                ...field.state.value[index],
                                name: `Round ${field.state.value.length + 1}`,
                                order: field.state.value.length + 1,
                              };
                              field.pushValue(newRound);
                            }}
                            disabled={!editable}
                          >
                            <Copy />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            onClick={() => field.removeValue(index)}
                            disabled={!editable}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    name="addRound"
                    type="button"
                    variant="secondary"
                    size={"icon"}
                    onClick={() =>
                      field.pushValue({
                        ...defaultRound,
                        name: `Round ${field.state.value.length + 1}`,
                        order: field.state.value.length + 1,
                      })
                    }
                    disabled={!editable}
                  >
                    <Plus />
                  </Button>
                  <Button
                    name="removeRound"
                    type="button"
                    variant="secondary"
                    size={"icon"}
                    onClick={() => {
                      if (field.state.value.length > 0) {
                        field.removeValue(field.state.value.length - 1);
                      }
                    }}
                    disabled={!editable}
                  >
                    <Minus />
                  </Button>
                </div>
              </>
            );
          }}
        </group.Field>
      </div>
    );
  },
});
