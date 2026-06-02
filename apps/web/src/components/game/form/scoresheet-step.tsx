"use client";

import { Copy, Minus, Plus, Trash } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import type { AppFieldExtendedReactFormApi } from "@tanstack/react-form";
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

import type { AddGameFormValues } from "../add/add-game.types";
import { defaultRound } from "../add/add-game.types";
import { scoreSheetWithRoundsSchema } from "../add/add-game.types";
import type { EditGameFormValues } from "../edit/edit-game.types";
import { defaultEditRound } from "../edit/edit-game.types";
import { editScoresheetSchema } from "../edit/edit-game.types";
import {
  getAllowedRoundsScoreOptions,
  getAllowedWinConditions,
  normalizeDefaultScoresheets,
  normalizeScoresheet,
} from "~/lib/scoresheet-form-rules";
import { GradientPicker } from "~/components/color-picker";
import { RoundPopOver } from "../add/round-popover";
import { withFieldGroup } from "~/hooks/form";

type SharedProps = {
  onSave: () => void;
  onBack: () => void;
  roundsEditable: boolean;
  scoresheetEditable: boolean;
};

type AddGameFormApi = AppFieldExtendedReactFormApi<
  AddGameFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
type EditGameFormApi = AppFieldExtendedReactFormApi<
  EditGameFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

type AddModeProps = SharedProps & { mode: "add"; form: AddGameFormApi };
type EditModeProps = SharedProps & { mode: "edit"; form: EditGameFormApi };

export type ScoresheetStepProps = AddModeProps | EditModeProps;

export const ScoresheetStep = (props: ScoresheetStepProps) => {
  const { mode, onSave, onBack, roundsEditable, scoresheetEditable } = props;
  const form = props.form;

  return (
    <form.Subscribe
      selector={(state: any) => ({
        scoresheetIndex: state.values.activeScoreSheetIndex as
          | number
          | undefined,
      })}
    >
      {({ scoresheetIndex }: any) => {
        if (scoresheetIndex === undefined) {
          return null;
        }

        const groupName = `scoresheets[${scoresheetIndex}]`;
        const groupSchema =
          mode === "add" ? scoreSheetWithRoundsSchema : editScoresheetSchema;

        return (
          <form.FormGroup
            name={groupName}
            validators={{ onSubmit: groupSchema as any }}
            onGroupSubmit={onSave}
          >
            {(formGroup: any) => (
              <ScoresheetFieldsGroup
                form={form}
                fields={groupName as any}
                mode={mode}
                scoresheetIndex={scoresheetIndex}
                roundsEditable={roundsEditable}
                scoresheetEditable={scoresheetEditable}
                handleSubmit={formGroup.handleSubmit}
                onBack={onBack}
              />
            )}
          </form.FormGroup>
        );
      }}
    </form.Subscribe>
  );
};

const ScoresheetFieldsGroup = withFieldGroup({
  defaultValues: {} as any,
  props: {
    mode: "add" as "add" | "edit",
    scoresheetIndex: 0,
    roundsEditable: true,
    scoresheetEditable: true,
    handleSubmit: async () => {
      /* empty */
    },
    onBack: () => {
      /* empty */
    },
  },
  render: function Render({
    group,
    mode,
    scoresheetIndex,
    roundsEditable,
    scoresheetEditable,
    handleSubmit,
    onBack,
  }) {
    const posthog = usePostHog();

    const createTempId = () => {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
      }
      return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    };

    const getNextRoundOrder = (rounds: any[]) => {
      const maxOrder = rounds.reduce<number>((max, round) => {
        const order = typeof round?.order === "number" ? round.order : null;
        return order === null ? max : Math.max(max, order);
      }, 0);
      return maxOrder + 1;
    };

    return (
      <group.Subscribe
        selector={(state) => ({
          isCoop: state.values.scoresheet.isCoop as boolean,
          winCondition: ((state.values.scoresheet.winCondition as any) ??
            "Highest Score") as any,
        })}
      >
        {({ isCoop, winCondition }) => {
          const winConditionChoices = getAllowedWinConditions({ isCoop });
          const roundsScoreChoices = getAllowedRoundsScoreOptions({
            winCondition,
          });

          return (
            <>
              <CardContent className="flex flex-col gap-2 px-2 sm:gap-4 sm:px-6">
                <group.AppField name="scoresheet.name">
                  {(field) => (
                    <field.TextField
                      label="Sheet Name"
                      placeholder="Sheet name"
                      disabled={!scoresheetEditable}
                    />
                  )}
                </group.AppField>

                <group.AppField
                  name="scoresheet.isCoop"
                  listeners={{
                    onChange: ({ fieldApi }) => {
                      const nextIsCoop = fieldApi.state.value;

                      if (mode === "add") {
                        const scoresheets = group.form.getFieldValue(
                          "scoresheets",
                        ) as AddGameFormValues["scoresheets"];
                        const current = scoresheets[scoresheetIndex];
                        if (!current) {
                          return;
                        }
                        group.form.setFieldValue(
                          "scoresheets",
                          scoresheets.map((scoresheet, index) =>
                            index === scoresheetIndex
                              ? normalizeScoresheet({
                                  ...scoresheet,
                                  scoresheet: {
                                    ...current.scoresheet,
                                    isCoop: nextIsCoop,
                                  },
                                })
                              : scoresheet,
                          ),
                        );
                        return;
                      }

                      const scoresheets = group.form.getFieldValue(
                        "scoresheets",
                      ) as EditGameFormValues["scoresheets"];
                      const current = scoresheets[scoresheetIndex];
                      if (!current) {
                        return;
                      }
                      const normalized = normalizeScoresheet({
                        ...current,
                        scoresheet: {
                          ...current.scoresheet,
                          isCoop: nextIsCoop,
                        },
                        rounds: [],
                      });

                      if (
                        normalized.scoresheet.roundsScore !==
                        current.scoresheet.roundsScore
                      ) {
                        group.setFieldValue(
                          "scoresheet.roundsScore",
                          normalized.scoresheet.roundsScore,
                        );
                      }
                      if (
                        normalized.scoresheet.targetScore !==
                        current.scoresheet.targetScore
                      ) {
                        group.setFieldValue(
                          "scoresheet.targetScore",
                          normalized.scoresheet.targetScore,
                        );
                      }
                      if (
                        normalized.scoresheet.winCondition !==
                        current.scoresheet.winCondition
                      ) {
                        group.setFieldValue(
                          "scoresheet.winCondition",
                          normalized.scoresheet.winCondition,
                        );
                      }
                    },
                  }}
                >
                  {(field) => (
                    <field.CheckboxField
                      label="Is Co-op?"
                      disabled={!scoresheetEditable}
                    />
                  )}
                </group.AppField>

                {mode === "edit" && (
                  <group.AppField
                    name="scoresheet.isDefault"
                    listeners={{
                      onChange: ({ fieldApi }) => {
                        if (!fieldApi.state.value) {
                          return;
                        }
                        group.form.setFieldValue(
                          "scoresheets",
                          normalizeDefaultScoresheets(
                            group.form.getFieldValue("scoresheets") as any,
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
                  </group.AppField>
                )}

                <group.AppField
                  name="scoresheet.winCondition"
                  listeners={{
                    onChange: ({ fieldApi }) => {
                      const nextWinCondition = fieldApi.state.value;

                      if (mode === "add") {
                        const scoresheets = group.form.getFieldValue(
                          "scoresheets",
                        ) as AddGameFormValues["scoresheets"];
                        const current = scoresheets[scoresheetIndex];
                        if (!current) {
                          return;
                        }
                        group.form.setFieldValue(
                          "scoresheets",
                          scoresheets.map((scoresheet, index) =>
                            index === scoresheetIndex
                              ? normalizeScoresheet({
                                  ...scoresheet,
                                  scoresheet: {
                                    ...current.scoresheet,
                                    winCondition:
                                      nextWinCondition ?? "Highest Score",
                                  },
                                })
                              : scoresheet,
                          ),
                        );
                        return;
                      }

                      const scoresheets = group.form.getFieldValue(
                        "scoresheets",
                      ) as EditGameFormValues["scoresheets"];
                      const current = scoresheets[scoresheetIndex];
                      if (!current) {
                        return;
                      }
                      const normalized = normalizeScoresheet({
                        ...current,
                        scoresheet: {
                          ...current.scoresheet,
                          winCondition: nextWinCondition,
                        },
                        rounds: [],
                      });
                      if (
                        normalized.scoresheet.roundsScore !==
                        current.scoresheet.roundsScore
                      ) {
                        group.setFieldValue(
                          "scoresheet.roundsScore",
                          normalized.scoresheet.roundsScore,
                        );
                      }
                      if (
                        normalized.scoresheet.targetScore !==
                        current.scoresheet.targetScore
                      ) {
                        group.setFieldValue(
                          "scoresheet.targetScore",
                          normalized.scoresheet.targetScore,
                        );
                      }
                    },
                  }}
                  validators={{
                    onChangeListenTo: ["scoresheet.isCoop"],
                    onChange: ({ value, fieldApi }) => {
                      if (
                        fieldApi.form.getFieldValue("scoresheet.isCoop") &&
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
                              return;
                            }
                            toast.error("Invalid win condition.");
                            posthog.capture(
                              "scoresheet_win_condition_invalid",
                              {
                                value,
                              },
                            );
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
                </group.AppField>

                {winCondition === "Target Score" && (
                  <group.AppField name="scoresheet.targetScore">
                    {(field) => (
                      <field.NumberField
                        label="Target Score"
                        disabled={!scoresheetEditable}
                      />
                    )}
                  </group.AppField>
                )}

                <group.AppField
                  name="scoresheet.roundsScore"
                  validators={{
                    onChangeListenTo: ["scoresheet.winCondition", "rounds"],
                    onChange: ({ value, fieldApi }) => {
                      const rounds = fieldApi.form.getFieldValue("rounds");
                      if (
                        fieldApi.form.getFieldValue(
                          "scoresheet.winCondition",
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
                          "scoresheet.winCondition",
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
                              return;
                            }
                            toast.error("Invalid scoring method.");
                            posthog.capture("scoresheet_rounds_score_invalid", {
                              value,
                            });
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
                </group.AppField>

                <Separator className="w-full" orientation="horizontal" />
                <div className="flex flex-col gap-2 pb-4">
                  <div className="text-xl font-semibold">Rounds</div>
                  <group.AppField name="rounds" mode="array">
                    {(roundsField: any) => {
                      const rounds = roundsField.state.value as any[];
                      const defaultNewRound =
                        mode === "add"
                          ? defaultRound
                          : { ...defaultEditRound, roundId: null };

                      return (
                        <>
                          <div className="flex max-h-[25vh] flex-col gap-2 overflow-auto py-1">
                            {rounds.map((round, index) => {
                              const keySeed =
                                mode === "edit"
                                  ? (round.roundId ??
                                    round._tempId ??
                                    round.name ??
                                    round.order)
                                  : (round._tempId ??
                                    round.name ??
                                    round.order);
                              const roundKey = `round-${keySeed ? keySeed : `index-${index}`}`;
                              const roundLabel = round?.name
                                ? String(round.name)
                                : `#${index + 1}`;

                              return (
                                <div
                                  key={roundKey}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <group.AppField
                                      name={`rounds[${index}].color`}
                                    >
                                      {(field: any) => {
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
                                              disabled={!roundsEditable}
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
                                      name={`rounds[${index}].name`}
                                    >
                                      {(field: any) => (
                                        <field.TextField
                                          label="Round Name"
                                          hideLabel
                                          placeholder="Round name"
                                          disabled={!roundsEditable}
                                        />
                                      )}
                                    </group.AppField>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RoundPopOver
                                      form={group}
                                      roundPath={`rounds[${index}]`}
                                      disabled={!roundsEditable}
                                    />
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      type="button"
                                      aria-label={`Duplicate round ${roundLabel}`}
                                      onClick={() => {
                                        const current = rounds[index];
                                        if (!current) {
                                          return;
                                        }
                                        const nextOrder =
                                          getNextRoundOrder(rounds);
                                        const newRound = {
                                          ...current,
                                          _tempId: createTempId(),
                                          name: `Round ${nextOrder}`,
                                          order: nextOrder,
                                          ...(mode === "edit"
                                            ? { roundId: null }
                                            : {}),
                                        };
                                        roundsField.pushValue(newRound);
                                      }}
                                      disabled={!roundsEditable}
                                    >
                                      <Copy />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      type="button"
                                      aria-label={`Delete round ${roundLabel}`}
                                      onClick={() =>
                                        roundsField.removeValue(index)
                                      }
                                      disabled={!roundsEditable}
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
                              aria-label="Add round"
                              onClick={() => {
                                const nextOrder = getNextRoundOrder(rounds);
                                roundsField.pushValue({
                                  ...defaultNewRound,
                                  _tempId: createTempId(),
                                  name: `Round ${nextOrder}`,
                                  order: nextOrder,
                                });
                              }}
                              disabled={!roundsEditable}
                            >
                              <Plus />
                            </Button>
                            <Button
                              name="removeRound"
                              type="button"
                              variant="secondary"
                              size={"icon"}
                              aria-label="Remove last round"
                              onClick={() => {
                                if (rounds.length > 0) {
                                  roundsField.removeValue(rounds.length - 1);
                                }
                              }}
                              disabled={!roundsEditable}
                            >
                              <Minus />
                            </Button>
                          </div>
                        </>
                      );
                    }}
                  </group.AppField>
                </div>
              </CardContent>

              <DialogFooter className="gap-2">
                <Button type="button" variant="secondary" onClick={onBack}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    await handleSubmit();
                  }}
                >
                  Submit
                </Button>
              </DialogFooter>
            </>
          );
        }}
      </group.Subscribe>
    );
  },
});
