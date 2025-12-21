"use client";

import { Table, Trash } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Separator } from "@board-games/ui/separator";

import type { ScoreSheetWithRounds } from "./add-game.types";
import { withFieldGroup } from "~/hooks/form";
import { defaultRound } from "./add-game.types";

const defaultValues: {
  scoreSheets: ScoreSheetWithRounds[];
  activeScoreSheetIndex?: number;
} = {
  scoreSheets: [],
  activeScoreSheetIndex: 0,
};
export const ScoresheetsForm = withFieldGroup({
  defaultValues: defaultValues,
  props: {
    onOpenScoresheet: () => {
      /* empty */
    },
  },
  render: function Render({ group, onOpenScoresheet }) {
    return (
      <group.Subscribe
        selector={(state) => ({
          scoreSheetsLength: state.values.scoreSheets.length,
        })}
      >
        {({ scoreSheetsLength }) => {
          return (
            <>
              <group.AppField name="activeScoreSheetIndex">
                {(activeScoreSheetField) => {
                  return (
                    <group.AppField name="scoreSheets" mode="array">
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
                    </group.AppField>
                  );
                }}
              </group.AppField>
            </>
          );
        }}
      </group.Subscribe>
    );
  },
});
