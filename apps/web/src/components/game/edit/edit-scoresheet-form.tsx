"use client";

import { usePostHog } from "posthog-js/react";

import { Button } from "@board-games/ui/button";
import { CardContent } from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import { DialogFooter } from "@board-games/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@board-games/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Separator } from "@board-games/ui/separator";
import { toast } from "@board-games/ui/toast";

import type { EditGameFormValues } from "./edit-game.types";
import { withForm } from "~/hooks/form";
import {
  getAllowedRoundsScoreOptions,
  getAllowedWinConditions,
  normalizeDefaultScoresheets,
  normalizeScoresheet,
} from "~/lib/scoresheet-form-rules";
import { editGameFormSchema } from "./edit-game.types";
import { EditRoundsForm } from "./edit-rounds-form";

export const ScoresheetForm = withForm({
  defaultValues: {} as EditGameFormValues,
  validators: {
    onSubmit: editGameFormSchema,
  },
  props: {
    onSave: () => {
      /* empty */
    },
    onBack: () => {
      /* empty */
    },
    roundsEditable: true,
    scoresheetEditable: true,
  },
  render: function Render({
    form,
    onSave,
    onBack,
    roundsEditable,
    scoresheetEditable,
  }) {
    const posthog = usePostHog();

    return (
      <>
        <form.Subscribe
          selector={(state) => ({
            scoresheetIndex: state.values.activeScoreSheetIndex,
          })}
        >
          {({ scoresheetIndex }) => {
            if (scoresheetIndex === undefined) {
              return null;
            }

            const isCoop = form.getFieldValue(
              `scoresheets[${scoresheetIndex}].scoresheet.isCoop`,
            );
            const winCondition =
              form.getFieldValue(
                `scoresheets[${scoresheetIndex}].scoresheet.winCondition`,
              ) ?? "Highest Score";
            const winConditionChoices = getAllowedWinConditions({ isCoop });
            const roundsScoreChoices = getAllowedRoundsScoreOptions({
              winCondition,
            });

            return (
              <>
                <CardContent className="flex flex-col gap-2 px-2 sm:gap-4 sm:px-6">
                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.name`}
                  >
                    {(field) => (
                      <field.TextField
                        label="Sheet Name"
                        placeholder="Sheet name"
                        disabled={!scoresheetEditable}
                      />
                    )}
                  </form.AppField>

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.isCoop`}
                    listeners={{
                      onChange: ({ fieldApi }) => {
                        const scoresheets = form.getFieldValue(
                          "scoresheets",
                        ) as EditGameFormValues["scoresheets"];
                        const current = scoresheets[scoresheetIndex];
                        if (!current) {
                          return;
                        }
                        form.setFieldValue(
                          "scoresheets",
                          scoresheets.map((scoresheet, index) =>
                            index === scoresheetIndex
                              ? normalizeScoresheet({
                                  ...scoresheet,
                                  scoresheet: {
                                    ...current.scoresheet,
                                    isCoop: fieldApi.state.value,
                                  },
                                })
                              : scoresheet,
                          ),
                        );
                      },
                    }}
                  >
                    {(field) => (
                      <field.CheckboxField
                        label="Is Co-op?"
                        disabled={!scoresheetEditable}
                      />
                    )}
                  </form.AppField>

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.isDefault`}
                    listeners={{
                      onChange: ({ fieldApi }) => {
                        if (!fieldApi.state.value) {
                          return;
                        }
                        form.setFieldValue(
                          "scoresheets",
                          normalizeDefaultScoresheets(
                            form.getFieldValue(
                              "scoresheets",
                            ) as EditGameFormValues["scoresheets"],
                            scoresheetIndex,
                          ),
                        );
                      },
                    }}
                  >
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field
                          data-invalid={isInvalid}
                          orientation="horizontal"
                        >
                          <Checkbox
                            id={field.name}
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked === true)
                            }
                            disabled={!scoresheetEditable}
                          />
                          <FieldLabel
                            htmlFor={field.name}
                            className="font-normal"
                          >
                            Is Default?
                          </FieldLabel>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.AppField>

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.winCondition`}
                    listeners={{
                      onChange: ({ fieldApi }) => {
                        const scoresheets = form.getFieldValue(
                          "scoresheets",
                        ) as EditGameFormValues["scoresheets"];
                        const current = scoresheets[scoresheetIndex];
                        if (!current) {
                          return;
                        }
                        form.setFieldValue(
                          "scoresheets",
                          scoresheets.map((scoresheet, index) =>
                            index === scoresheetIndex
                              ? normalizeScoresheet({
                                  ...scoresheet,
                                  scoresheet: {
                                    ...current.scoresheet,
                                    winCondition:
                                      fieldApi.state.value ?? "Highest Score",
                                  },
                                })
                              : scoresheet,
                          ),
                        );
                      },
                    }}
                    validators={{
                      onChangeListenTo: [
                        `scoresheets[${scoresheetIndex}].scoresheet.isCoop`,
                      ],
                      onChange: ({ value, fieldApi }) => {
                        if (
                          fieldApi.form.getFieldValue(
                            `scoresheets[${scoresheetIndex}].scoresheet.isCoop`,
                          ) &&
                          value !== "Manual" &&
                          value !== "Target Score"
                        ) {
                          return [
                            {
                              message:
                                "Win condition must be Manual or Target Score for Coop games.",
                            },
                          ];
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Win Condition
                          </FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                              const safeValue = winConditionChoices.find(
                                (condition) => condition === value,
                              );
                              if (safeValue) {
                                field.handleChange(safeValue);
                              } else {
                                toast.error("Invalid win condition.");
                                posthog.capture(
                                  "scoresheet_win_condition_invalid",
                                  { value },
                                );
                              }
                            }}
                            disabled={!scoresheetEditable}
                          >
                            <SelectTrigger
                              aria-invalid={isInvalid}
                              name="winCondition"
                            >
                              <SelectValue placeholder="Select a win condition" />
                            </SelectTrigger>
                            <SelectContent>
                              {winConditionChoices.map((condition) => (
                                <SelectItem key={condition} value={condition}>
                                  {condition}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.AppField>

                  {winCondition === "Target Score" && (
                    <form.AppField
                      name={`scoresheets[${scoresheetIndex}].scoresheet.targetScore`}
                    >
                      {(field) => (
                        <field.NumberField
                          label="Target Score"
                          disabled={!scoresheetEditable}
                        />
                      )}
                    </form.AppField>
                  )}

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.roundsScore`}
                    validators={{
                      onChangeListenTo: [
                        `scoresheets[${scoresheetIndex}].scoresheet.winCondition`,
                        `scoresheets[${scoresheetIndex}].rounds`,
                      ],
                      onChange: ({ value, fieldApi }) => {
                        const rounds = fieldApi.form.getFieldValue(
                          `scoresheets[${scoresheetIndex}].rounds`,
                        );
                        if (
                          fieldApi.form.getFieldValue(
                            `scoresheets[${scoresheetIndex}].scoresheet.winCondition`,
                          ) !== "Manual" &&
                          value === "None"
                        ) {
                          return [
                            {
                              message:
                                "Rounds score cannot be None when win condition is not Manual.",
                            },
                          ];
                        }
                        if (
                          fieldApi.form.getFieldValue(
                            `scoresheets[${scoresheetIndex}].scoresheet.winCondition`,
                          ) !== "Manual" &&
                          value !== "Manual" &&
                          Array.isArray(rounds) &&
                          rounds.length === 0
                        ) {
                          return [
                            {
                              message:
                                "Rounds cannot be empty when win condition is not Manual and rounds score is not Manual.",
                            },
                          ];
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Scoring Method
                          </FieldLabel>
                          <FieldDescription>
                            Select how the scoresheet rounds are scored.
                          </FieldDescription>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                              const safeValue = roundsScoreChoices.find(
                                (option) => option === value,
                              );
                              if (safeValue) {
                                field.handleChange(safeValue);
                              } else {
                                toast.error("Invalid scoring method.");
                                posthog.capture(
                                  "scoresheet_rounds_score_invalid",
                                  { value },
                                );
                              }
                            }}
                            disabled={!scoresheetEditable}
                          >
                            <SelectTrigger
                              aria-invalid={isInvalid}
                              name={"roundsScore"}
                            >
                              <SelectValue placeholder="Select a scoring method" />
                            </SelectTrigger>
                            <SelectContent>
                              {roundsScoreChoices.map((condition) => (
                                <SelectItem key={condition} value={condition}>
                                  {condition}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.AppField>

                  <Separator className="w-full" orientation="horizontal" />
                  <EditRoundsForm
                    form={form}
                    fields={{
                      rounds: `scoresheets[${scoresheetIndex}].rounds`,
                    }}
                    editable={roundsEditable}
                  />
                </CardContent>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onBack()}
                  >
                    Cancel
                  </Button>
                  {/*
          TODO: Add validation before saving
           */}
                  <Button
                    type="button"
                    onClick={async () => {
                      // Validate all relevant fields with submit mode
                      await form.validateField(
                        `scoresheets[${scoresheetIndex}].scoresheet`,
                        "submit",
                      );

                      if (!form.state.isValid) {
                        return;
                      } else {
                        onSave();
                      }
                    }}
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </form.Subscribe>
      </>
    );
  },
});
