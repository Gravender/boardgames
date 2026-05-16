import { describe, expect, it } from "vitest";

import {
  getAllowedRoundsScoreOptions,
  getAllowedWinConditions,
  normalizeDefaultScoresheets,
  normalizeScoresheet,
} from "./scoresheet-form-rules";

describe("scoresheet form rules", () => {
  it("limits coop win conditions and normalizes invalid values", () => {
    expect(getAllowedWinConditions({ isCoop: true })).toEqual([
      "Manual",
      "Target Score",
    ]);

    expect(
      normalizeScoresheet({
        scoresheet: {
          name: "Co-op",
          isCoop: true,
          winCondition: "Highest Score",
          roundsScore: "Aggregate",
          targetScore: 9,
        },
        rounds: [],
      }),
    ).toEqual({
      scoresheet: {
        name: "Co-op",
        isCoop: true,
        winCondition: "Manual",
        roundsScore: "Aggregate",
        targetScore: 0,
      },
      rounds: [],
    });
  });

  it("removes invalid rounds score choices when win condition changes", () => {
    expect(
      getAllowedRoundsScoreOptions({ winCondition: "Highest Score" }),
    ).toEqual(["Aggregate", "Manual", "Best Of"]);

    expect(
      normalizeScoresheet({
        scoresheet: {
          name: "Competitive",
          isCoop: false,
          winCondition: "Highest Score",
          roundsScore: "None",
          targetScore: 12,
        },
        rounds: [],
      }),
    ).toEqual({
      scoresheet: {
        name: "Competitive",
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
      },
      rounds: [],
    });
  });

  it("keeps only one default scoresheet", () => {
    expect(
      normalizeDefaultScoresheets(
        [
          {
            scoresheetType: "original" as const,
            scoresheet: {
              name: "A",
              id: 1,
              isCoop: false,
              isDefault: true,
              winCondition: "Highest Score" as const,
              roundsScore: "Aggregate" as const,
              targetScore: 0,
            },
            rounds: [],
            scoreSheetChanged: false,
            roundChanged: false,
          },
          {
            scoresheetType: "new" as const,
            scoresheet: {
              name: "B",
              id: null,
              isCoop: false,
              isDefault: false,
              winCondition: "Highest Score" as const,
              roundsScore: "Aggregate" as const,
              targetScore: 0,
            },
            rounds: [],
          },
        ],
        1,
      ),
    ).toEqual([
      {
        scoresheetType: "original",
        scoresheet: {
          name: "A",
          id: 1,
          isCoop: false,
          isDefault: false,
          winCondition: "Highest Score",
          roundsScore: "Aggregate",
          targetScore: 0,
        },
        rounds: [],
        scoreSheetChanged: false,
        roundChanged: false,
      },
      {
        scoresheetType: "new",
        scoresheet: {
          name: "B",
          id: null,
          isCoop: false,
          isDefault: true,
          winCondition: "Highest Score",
          roundsScore: "Aggregate",
          targetScore: 0,
        },
        rounds: [],
      },
    ]);
  });
});
