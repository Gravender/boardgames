"use client";

import { Table, Trash } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { FieldError } from "@board-games/ui/field";
import { Separator } from "@board-games/ui/separator";

import type { EditGameFormValues } from "./edit-game.types";
import { withForm } from "~/hooks/form";
import { defaultRound } from "../add/add-game.types";
import { editGameFormSchema } from "./edit-game.types";

export const ScoresheetsForm = withForm({
  defaultValues: {} as EditGameFormValues,
  validators: {
    onSubmit: editGameFormSchema,
  },
  props: {
    onOpenScoresheet: () => {
      /* empty */
    },
  },
  render: function Render({ form, onOpenScoresheet }) {
    return (
      <form.Subscribe
        selector={(state) => ({
          scoreSheetsLength: state.values.scoresheets.length,
          scoreSheets: state.values.scoresheets,
        })}
      >
        {({ scoreSheetsLength, scoreSheets }) => {
          const originalScoresheets = scoreSheets.filter(
            (s) => s.scoresheetType === "original",
          );
          const canDeleteOriginal = originalScoresheets.length > 1;

          return (
            <>
              <form.AppField name="activeScoreSheetIndex">
                {(activeScoreSheetField) => {
                  return (
                    <form.AppField name="scoresheets" mode="array">
                      {(scoreSheetsField) => {
                        return (
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <div className="text-xl font-semibold">
                                Scoresheet
                              </div>
                              <Button
                                variant="default"
                                onClick={() => {
                                  onOpenScoresheet();
                                  scoreSheetsField.pushValue({
                                    scoresheetType: "new" as const,
                                    scoresheet: {
                                      id: null,
                                      name: `Scoresheet ${scoreSheetsLength + 1}`,
                                      winCondition: "Highest Score",
                                      isCoop: false,
                                      isDefault: false,
                                      roundsScore: "Aggregate",
                                      targetScore: 0,
                                    },
                                    rounds: [
                                      {
                                        ...defaultRound,
                                        roundId: null,
                                      },
                                    ],
                                  });
                                  activeScoreSheetField.setValue(
                                    scoreSheetsLength,
                                  );
                                }}
                                type="button"
                              >
                                Create New
                              </Button>
                            </div>
                            <div>
                              <div>
                                {scoreSheetsField.state.value.map(
                                  (scoresheet, index) => {
                                    const isOriginal =
                                      scoresheet.scoresheetType === "original";
                                    const isShared =
                                      scoresheet.scoresheetType === "shared";
                                    const canDelete = isOriginal
                                      ? canDeleteOriginal
                                      : true;

                                    return (
                                      <div
                                        key={`${index}-${scoresheet.scoresheet.id}`}
                                      >
                                        <form.AppField
                                          name={`scoresheets[${index}]`}
                                        >
                                          {(field) => {
                                            const isInvalid =
                                              field.state.meta.isTouched &&
                                              !field.state.meta.isValid;
                                            return (
                                              <>
                                                <div className="flex items-center justify-between gap-2">
                                                  <Table />
                                                  <button
                                                    className="flex grow flex-col items-start justify-start"
                                                    onClick={() => {
                                                      onOpenScoresheet();
                                                      activeScoreSheetField.setValue(
                                                        index,
                                                      );
                                                    }}
                                                    type="button"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-lg">
                                                        {
                                                          scoresheet.scoresheet
                                                            .name
                                                        }
                                                      </span>
                                                      {isShared && (
                                                        <Badge
                                                          variant="outline"
                                                          className="bg-blue-600 text-xs text-white"
                                                        >
                                                          Shared
                                                        </Badge>
                                                      )}
                                                      {scoresheet.scoresheet
                                                        .isDefault && (
                                                        <Badge>Default</Badge>
                                                      )}
                                                    </div>
                                                    <div className="mb-2 flex w-full items-center gap-3 text-sm">
                                                      <div className="flex min-w-20 items-center gap-1">
                                                        <span>
                                                          Win Condition:
                                                        </span>
                                                        <span className="text-muted-foreground text-sm">
                                                          {scoresheet.scoresheet
                                                            .winCondition ??
                                                            "Highest Score"}
                                                        </span>
                                                      </div>
                                                      <Separator
                                                        orientation="vertical"
                                                        className="font-semi-bold h-4"
                                                      />
                                                      <div className="flex min-w-20 items-center gap-1">
                                                        <span>Rounds:</span>
                                                        <span className="text-muted-foreground text-sm">
                                                          {scoresheet.rounds
                                                            .length > 0
                                                            ? scoresheet.rounds
                                                                .length
                                                            : "1"}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </button>
                                                  <Button
                                                    name={`removeScoresheet-${scoresheet.scoresheet.name}`}
                                                    variant="destructive"
                                                    size="icon"
                                                    type="button"
                                                    onClick={() => {
                                                      scoreSheetsField.removeValue(
                                                        index,
                                                      );
                                                    }}
                                                    disabled={!canDelete}
                                                  >
                                                    <Trash />
                                                  </Button>
                                                </div>
                                                {isInvalid && (
                                                  <FieldError
                                                    errors={
                                                      field.state.meta.errors
                                                    }
                                                  />
                                                )}
                                              </>
                                            );
                                          }}
                                        </form.AppField>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </form.AppField>
                  );
                }}
              </form.AppField>
            </>
          );
        }}
      </form.Subscribe>
    );
  },
});
