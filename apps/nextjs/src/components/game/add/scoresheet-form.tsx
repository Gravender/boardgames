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
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
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

import type { ScoreSheetWithRounds } from "./add-game.types";
import { withFieldGroup } from "~/hooks/form";
import { RoundsForm } from "./rounds-form";

const winConditionOptions = scoreSheetWinConditions;
const roundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
  scoreSheetRoundsScore.filter((option) => option !== "None");
const manualWinConditionOptions = scoreSheetRoundsScore;
const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] = [
  "Manual",
  "Target Score",
];
export const defaultValues: ScoreSheetWithRounds = {
  scoresheet: {
    name: "Default",
    winCondition: "Highest Score",
    isCoop: false,
    roundsScore: "Aggregate",
    targetScore: 0,
  },
  rounds: [
    {
      name: "Round 1",
      type: "Numeric",
      color: "#cbd5e1",
      score: 0,
      order: 0,
    },
  ],
};
export const ScoresheetForm = withFieldGroup({
  defaultValues,
  props: {
    onSave: () => {
      /* empty */
    },
    onBack: () => {
      /* empty */
    },
  },
  render: function Render({ group, onSave, onBack }) {
    const posthog = usePostHog();

    return (
      <>
        <group.Subscribe
          selector={(state) => ({
            winCondition: state.values.scoresheet.winCondition,
            isCoop: state.values.scoresheet.isCoop,
            roundsLength: state.values.rounds.length,
          })}
        >
          {({ winCondition, isCoop, roundsLength }) => {
            return (
              <CardContent className="flex flex-col gap-2 px-2 sm:gap-4 sm:px-6">
                <group.AppField name={`scoresheet.name`}>
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Sheet Name</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Sheet name"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </group.AppField>

                <group.AppField name={`scoresheet.isCoop`}>
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field
                        data-invalid={isInvalid}
                        className="flex flex-row items-start gap-2 space-y-0 space-x-3"
                      >
                        <FieldLabel htmlFor={field.name}>Is Co-op?</FieldLabel>
                        <Checkbox
                          id={field.name}
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked as boolean)
                          }
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </group.AppField>

                <group.AppField
                  name={`scoresheet.winCondition`}
                  validators={{
                    onChangeListenTo: [`scoresheet.isCoop`],
                    onChange: ({ value, fieldApi }) => {
                      const coop =
                        fieldApi.form.getFieldValue(`scoresheet.isCoop`);
                      if (
                        coop &&
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
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    const options = isCoop
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
                        >
                          <SelectTrigger aria-invalid={isInvalid}>
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
                </group.AppField>

                {winCondition === "Target Score" && (
                  <group.AppField name={`scoresheet.targetScore`}>
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
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
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </group.AppField>
                )}

                <group.AppField
                  name={`scoresheet.roundsScore`}
                  validators={{
                    onChangeListenTo: [`scoresheet.winCondition`, `rounds`],
                    onChange: ({ value }) => {
                      if (winCondition !== "Manual" && value === "None") {
                        return [
                          {
                            message:
                              "Rounds score cannot be None when win condition is not Manual.",
                          },
                        ];
                      }
                      if (
                        winCondition !== "Manual" &&
                        value !== "Manual" &&
                        roundsLength === 0
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
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    const options =
                      winCondition === "Manual"
                        ? manualWinConditionOptions
                        : roundsScoreOptions;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Scoring Method
                        </FieldLabel>
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
                        >
                          <SelectTrigger aria-invalid={isInvalid}>
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
                </group.AppField>

                <Separator className="w-full" orientation="horizontal" />
                <RoundsForm
                  form={group}
                  fields={{
                    rounds: `rounds`,
                  }}
                />
              </CardContent>
            );
          }}
        </group.Subscribe>
        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onBack()}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSave()}>
            Submit
          </Button>
        </DialogFooter>
      </>
    );
  },
});
