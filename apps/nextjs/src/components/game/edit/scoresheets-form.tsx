"use client";

import { Table, Trash } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Separator } from "@board-games/ui/separator";

import { withFieldGroup } from "~/hooks/form";
import { defaultRound } from "../add/add-game.types";
import { defaultScoresheetsFormValues } from "./edit-game.types";

export const ScoresheetsForm = withFieldGroup({
  defaultValues: defaultScoresheetsFormValues,
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
          scoreSheets: state.values.scoreSheets,
        })}
      >
        {({ scoreSheetsLength, scoreSheets }) => {
          const originalScoresheets = scoreSheets.filter(
            (s) => s.scoresheetType === "original",
          );
          const canDeleteOriginal = originalScoresheets.length > 1;

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
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                              {scoresheet.scoresheet.name}
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
                                          disabled={!canDelete}
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
