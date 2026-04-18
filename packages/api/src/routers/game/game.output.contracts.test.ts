import { describe, expect, test } from "vitest";

import {
  getGameScoresheetStatsOutput,
  getSharedScoresheetAnalyticsLinkStateOutput,
} from "./game.output";

describe("game router output contracts", () => {
  test("getGameScoresheetStatsOutput accepts original and shared analytics families", () => {
    const parsed = getGameScoresheetStatsOutput.safeParse([
      {
        type: "original",
        id: 10,
        name: "Local Analytics Sheet",
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        isDefault: false,
        plays: 2,
        avgScore: 18.5,
        winningAvgScore: 22,
        analyticsGroupingScoresheetId: 10,
        analyticsGroupingScoresheetSourceType: "local",
        analyticsGroupingKey: "local:10",
        linkageState: "original",
        contributingVisibleScoresheets: [
          {
            visibleScoresheetId: 10,
            visibleScoresheetSourceType: "local",
            name: "Local Analytics Sheet",
            matchCount: 2,
          },
        ],
        contributingMatchCount: 2,
        players: [
          {
            type: "original",
            playerId: 1,
            name: "Alice",
            numMatches: 2,
            wins: 1,
            winRate: 0.5,
            avgScore: 20,
            bestScore: 24,
            worstScore: 16,
            image: null,
            isUser: false,
            scores: [
              {
                date: new Date("2026-03-01T12:00:00.000Z"),
                score: 24,
                isWin: true,
              },
            ],
          },
        ],
        rounds: [
          {
            id: 101,
            name: "Points",
            type: "Numeric",
            order: 1,
            score: 1,
            color: null,
            lookup: null,
            modifier: null,
            avgScore: 14,
            volatility: 3,
            winningAvgScore: 18,
            checkRate: null,
            winningCheckRate: null,
            players: [],
          },
        ],
      },
      {
        type: "shared",
        sharedId: 22,
        permission: "view",
        name: "Shared Analytics Sheet",
        isCoop: false,
        winCondition: "Highest Score",
        roundsScore: "Aggregate",
        targetScore: 0,
        isDefault: false,
        plays: 1,
        avgScore: null,
        winningAvgScore: null,
        analyticsGroupingScoresheetId: 22,
        analyticsGroupingScoresheetSourceType: "shared",
        analyticsGroupingKey: "shared:22",
        linkageState: "shared_unlinked",
        contributingVisibleScoresheets: [
          {
            visibleScoresheetId: 22,
            visibleScoresheetSourceType: "shared",
            name: "Shared Analytics Sheet",
            matchCount: 1,
          },
        ],
        contributingMatchCount: 1,
        players: [
          {
            type: "shared",
            sharedId: 7,
            name: "Bob",
            numMatches: 1,
            wins: 0,
            winRate: 0,
            avgScore: null,
            bestScore: null,
            worstScore: null,
            image: null,
            isUser: false,
            scores: [
              {
                date: new Date("2026-03-02T12:00:00.000Z"),
                score: null,
                isWin: false,
              },
            ],
          },
        ],
        rounds: [
          {
            id: 202,
            name: "Bonus",
            type: "Checkbox",
            order: 2,
            score: 1,
            color: null,
            lookup: null,
            modifier: null,
            avgScore: null,
            volatility: null,
            winningAvgScore: null,
            checkRate: 50,
            winningCheckRate: 100,
            players: [],
          },
        ],
      },
    ]);

    expect(parsed.success).toBe(true);
  });

  test("getSharedScoresheetAnalyticsLinkStateOutput accepts mixed linked and unlinked rounds", () => {
    const parsed = getSharedScoresheetAnalyticsLinkStateOutput.safeParse({
      sharedScoresheetId: 5,
      analyticsLinkedScoresheetId: 10,
      legacyLinkedScoresheetId: 10,
      linkageState: "shared_linked",
      rounds: [
        {
          sharedRoundId: 50,
          roundId: 500,
          roundName: "Points",
          analyticsLinkedRoundId: 1000,
          legacyLinkedRoundId: 1000,
          linkageState: "shared_linked",
        },
        {
          sharedRoundId: 51,
          roundId: 501,
          roundName: "Bonus",
          analyticsLinkedRoundId: null,
          legacyLinkedRoundId: 1001,
          linkageState: "shared_unlinked",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});
