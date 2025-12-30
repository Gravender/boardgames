"use client";

import { usePostHog } from "posthog-js/react";

import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
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
import { Input } from "@board-games/ui/input";
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
import { RoundsForm } from "../add/rounds-form";
import { editGameFormSchema } from "./edit-game.types";

const winConditionOptions = scoreSheetWinConditions;
const roundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
  scoreSheetRoundsScore.filter((option) => option !== "None");
const manualWinConditionOptions = scoreSheetRoundsScore;
const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] = [
  "Manual",
  "Target Score",
];
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
            return (
              <>
                <CardContent className="flex flex-col gap-2 px-2 sm:gap-4 sm:px-6">
                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.name`}
                  >
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Sheet Name
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Sheet name"
                            autoComplete="off"
                            disabled={!scoresheetEditable}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.AppField>

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.isCoop`}
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
                              field.handleChange(checked as boolean)
                            }
                            disabled={!scoresheetEditable}
                          />
                          <FieldLabel
                            htmlFor={field.name}
                            className="font-normal"
                          >
                            Is Co-op?
                          </FieldLabel>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.AppField>

                  <form.AppField
                    name={`scoresheets[${scoresheetIndex}].scoresheet.isDefault`}
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
                            onCheckedChange={(checked) => {
                              const scoresheets =
                                form.getFieldValue(`scoresheets`);
                              if (checked) {
                                const temp: EditGameFormValues["scoresheets"] =
                                  scoresheets.map((s, index) => {
                                    if (s.scoresheetType === "new") {
                                      return {
                                        scoresheetType: "new",
                                        scoresheet: {
                                          ...s.scoresheet,
                                          isDefault:
                                            index === scoresheetIndex
                                              ? true
                                              : false,
                                        },
                                        rounds: s.rounds,
                                      };
                                    }
                                    const roundChanged = s.roundChanged;
                                    if (index === scoresheetIndex) {
                                      return {
                                        ...s,
                                        scoresheet: {
                                          ...s.scoresheet,
                                          isDefault: true,
                                        },
                                        scoreSheetChanged: true,
                                        roundChanged: roundChanged,
                                      };
                                    }
                                    return {
                                      ...s,
                                      scoresheet: {
                                        ...s.scoresheet,
                                        isDefault: false,
                                      },
                                      scoreSheetChanged:
                                        s.scoresheet.isDefault ??
                                        s.scoreSheetChanged,
                                      roundChanged: roundChanged,
                                    };
                                  });
                                form.setFieldValue(`scoresheets`, temp);
                              } else {
                                field.handleChange(false);
                              }
                            }}
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
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Target Score
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(Number(e.target.value))
                              }
                              type="number"
                              className="text-center"
                              aria-invalid={isInvalid}
                              disabled={!scoresheetEditable}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
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
                  <RoundsForm
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
