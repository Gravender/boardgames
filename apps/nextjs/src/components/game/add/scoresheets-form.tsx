"use client";

import { Table, Trash } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Separator } from "@board-games/ui/separator";

import type { AddGameFormValues } from "./add-game.types";
import { withForm } from "~/hooks/form";
import { addGameFormSchema, defaultRound } from "./add-game.types";

export const ScoresheetsForm = withForm({
  defaultValues: {} as AddGameFormValues,
  validators: {
    onSubmit: addGameFormSchema,
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
        })}
      >
        {({ scoreSheetsLength }) => {
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
                                    scoresheet: {
                                      name: `Scoresheet ${scoreSheetsLength + 1}`,
                                      winCondition: "Highest Score",
                                      isCoop: false,
                                      isDefault: false,
                                      roundsScore: "Aggregate",
                                      targetScore: 0,
                                    },
                                    rounds: [defaultRound],
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
                                    return (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between gap-2"
                                      >
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
                                          <span className="text-lg">
                                            {scoresheet.scoresheet.name}
                                          </span>
                                          <div className="mb-2 flex w-full items-center gap-3 text-sm">
                                            <div className="flex min-w-20 items-center gap-1">
                                              <span>Win Condition:</span>
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
                                                {scoresheet.rounds.length > 0
                                                  ? scoresheet.rounds.length
                                                  : "1"}
                                              </span>
                                            </div>
                                          </div>
                                        </button>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          type="button"
                                          onClick={() => {
                                            scoreSheetsField.removeValue(index);
                                          }}
                                        >
                                          <Trash />
                                        </Button>
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
