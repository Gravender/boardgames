"use client";

import { usePostHog } from "posthog-js/react";

import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import { Button } from "@board-games/ui/button";
import { CardContent } from "@board-games/ui/card";
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

import type { AddGameFormValues } from "./add-game.types";
import { withForm } from "~/hooks/form";
import { addGameFormSchema } from "./add-game.types";
import { AddRoundsForm } from "./add-rounds-form";

const winConditionOptions = scoreSheetWinConditions;
const roundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
  scoreSheetRoundsScore.filter((option) => option !== "None");
const manualWinConditionOptions = scoreSheetRoundsScore;
const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] = [
  "Manual",
  "Target Score",
];
export const ScoresheetForm = withForm({
  defaultValues: {} as AddGameFormValues,
  validators: {
    onSubmit: addGameFormSchema,
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
                  >
                    {(field) => (
                      <field.CheckboxField
                        label="Is Co-op?"
                        disabled={!scoresheetEditable}
                      />
                    )}
                  </form.AppField>

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.winCondition`}
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
                      const options = form.getFieldValue(
                        `scoresheets[${scoresheetIndex}].scoresheet.isCoop`,
                      )
                        ? coopWinConditionOptions
                        : winConditionOptions;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Win Condition
                          </FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => {
                              const safeValue = scoreSheetWinConditions.find(
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
                              {options.map((condition) => (
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

                  {form.getFieldValue(
                    `scoresheets[${scoresheetIndex}].scoresheet.winCondition`,
                  ) === "Target Score" && (
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
                      const options =
                        form.getFieldValue(
                          `scoresheets[${scoresheetIndex}].scoresheet.winCondition`,
                        ) === "Manual"
                          ? manualWinConditionOptions
                          : roundsScoreOptions;
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
                              const safeValue = options.find(
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
                              {options.map((condition) => (
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
                  <AddRoundsForm
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
