import type { z } from "zod/v4";
import { describe, expect, it } from "vitest";

import type { insertScoreSheetSchema } from "@board-games/db/zodSchema";

import {
  calculateFinalScore,
  calculateFinalScores,
  calculatePlacement,
} from "./calculateResults";

interface Round {
  score: number;
}

interface scoreSheet {
  roundsScore: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["roundsScore"]
  >;
  winCondition: NonNullable<
    z.infer<typeof insertScoreSheetSchema>["winCondition"]
  >;
  targetScore: z.infer<typeof insertScoreSheetSchema>["targetScore"];
}

describe("calculateFinalScore", () => {
  it("should calculate the aggregate score correctly if the target score is not reached", () => {
    const rounds = [{ score: 10 }, { score: 20 }, { score: 30 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 60,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(60);
  });

  it("should calculate the aggregate target score correctly", () => {
    const rounds = [{ score: 10 }, { score: 20 }, { score: 30 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Target Score",
      targetScore: 50,
    };
    expect(calculateFinalScore(rounds, scoresheet)).toBe(60);
  });

  it("should calculate the aggregate highest score correctly", () => {
    const rounds = [{ score: 10 }, { score: 20 }, { score: 30 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(60);
  });

  it("should calculate the aggregate lowest score correctly", () => {
    const rounds = [{ score: 10 }, { score: 20 }, { score: 30 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Lowest Score",
      targetScore: 50,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(60);
  });

  it("should return the highest score in Best Of format", () => {
    const rounds = [{ score: 10 }, { score: 25 }, { score: 15 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Highest Score",
      targetScore: 50,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(25);
  });

  it("should return the lowest score in Best Of format", () => {
    const rounds = [{ score: 10 }, { score: 25 }, { score: 15 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Lowest Score",
      targetScore: 50,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(10);
  });

  it("should return the target score if reached", () => {
    const rounds = [{ score: 10 }, { score: 25 }, { score: 50 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Target Score",
      targetScore: 50,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(50);
  });

  it("should return the closest score to the target score if the target score is not reached", () => {
    const rounds = [{ score: 10 }, { score: 25 }, { score: 50 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Target Score",
      targetScore: 60,
    };

    expect(calculateFinalScore(rounds, scoresheet)).toBe(50);
  });

  it("should return 0 if no rounds are played", () => {
    const rounds: Round[] = [];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculateFinalScore(rounds, scoresheet)).toBe(0);
  });

  it("should correctly aggregate negative scores", () => {
    const rounds = [{ score: -10 }, { score: -20 }, { score: -30 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculateFinalScore(rounds, scoresheet)).toBe(-60);
  });

  it("should correctly aggregate mixed positive and negative scores", () => {
    const rounds = [{ score: 10 }, { score: -20 }, { score: 30 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculateFinalScore(rounds, scoresheet)).toBe(20);
  });

  it("should return the correct score when all rounds are the same in Best Of format", () => {
    const rounds = [{ score: 20 }, { score: 20 }, { score: 20 }];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculateFinalScore(rounds, scoresheet)).toBe(20);
  });
});

describe("calculateFinalScores", () => {
  it("should return correct scores for multiple players with the highest  aggregate score", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };

    expect(calculateFinalScores(players, scoresheet)).toEqual([
      { id: 1, score: 30, teamId: null },
      { id: 2, score: 45, teamId: null },
    ]);
  });

  it("should return correct scores for multiple players with the lowest aggregate score", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Lowest Score",
      targetScore: 50,
    };

    expect(calculateFinalScores(players, scoresheet)).toEqual([
      { id: 1, score: 30, teamId: null },
      { id: 2, score: 45, teamId: null },
    ]);
  });

  it("should return correct scores for multiple players when the target score is met", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Target Score",
      targetScore: 50,
    };

    expect(calculateFinalScores(players, scoresheet)).toEqual([
      { id: 1, score: 30, teamId: null },
      { id: 2, score: 45, teamId: null },
    ]);
  });
  it("should return correct scores for multiple players when the target score is not met", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Target Score",
      targetScore: 60,
    };

    expect(calculateFinalScores(players, scoresheet)).toEqual([
      { id: 1, score: 30, teamId: null },
      { id: 2, score: 45, teamId: null },
    ]);
  });

  it("should return 0 scores for players with no rounds", () => {
    const players = [
      { id: 1, rounds: [], teamId: null },
      { id: 2, rounds: [], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculateFinalScores(players, scoresheet)).toEqual([
      { id: 1, score: 0, teamId: null },
      { id: 2, score: 0, teamId: null },
    ]);
  });

  it("should handle ties when players have the same final score", () => {
    const players = [
      { id: 1, rounds: [{ score: 30 }], teamId: null },
      { id: 2, rounds: [{ score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculateFinalScores(players, scoresheet)).toEqual([
      { id: 1, score: 30, teamId: null },
      { id: 2, score: 30, teamId: null },
    ]);
  });
});

describe("calculatePlacement", () => {
  it("should correctly rank players based on highest score", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };

    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 2, score: 45, placement: 1 },
      { id: 1, score: 30, placement: 2 },
    ]);
  });

  it("should correctly rank players based on lowest score", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Lowest Score",
      targetScore: 50,
    };

    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 1, score: 30, placement: 1 },
      { id: 2, score: 45, placement: 2 },
    ]);
  });

  it("should correctly rank players based on target score", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 50 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
      { id: 3, rounds: [{ score: 20 }, { score: 40 }], teamId: null },
      { id: 4, rounds: [{ score: 25 }, { score: 60 }], teamId: null },
      { id: 5, rounds: [{ score: 30 }, { score: 70 }], teamId: null },
      { id: 6, rounds: [{ score: 35 }, { score: 80 }], teamId: null },
      { id: 7, rounds: [{ score: 27 }, { score: 23 }], teamId: null },
      { id: 8, rounds: [{ score: 45 }, { score: 100 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Target Score",
      targetScore: 50,
    };

    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 7, score: 50, placement: 1 },
      { id: 2, score: 45, placement: 2 },
      { id: 1, score: 60, placement: 3 },
      { id: 3, score: 60, placement: 3 },
      { id: 4, score: 85, placement: 5 },
      { id: 5, score: 100, placement: 6 },
      { id: 6, score: 115, placement: 7 },
      { id: 8, score: 145, placement: 8 },
    ]);
  });

  it("should correctly rank players when a target score is met", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 50 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Target Score",
      targetScore: 50,
    };

    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 1, score: 50, placement: 1 },
      { id: 2, score: 30, placement: 2 },
    ]);
  });

  it("should calculate the best of high score correctly", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Highest Score",
      targetScore: 50,
    };

    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 2, score: 30, placement: 1 },
      { id: 1, score: 20, placement: 2 },
    ]);
  });

  it("should calculate the best of lowest score correctly", () => {
    const players = [
      { id: 1, rounds: [{ score: 10 }, { score: 20 }], teamId: null },
      { id: 2, rounds: [{ score: 15 }, { score: 30 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Best Of",
      winCondition: "Lowest Score",
      targetScore: 50,
    };

    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 1, score: 10, placement: 1 },
      { id: 2, score: 15, placement: 2 },
    ]);
  });

  it("should assign the same placement for tied players", () => {
    const players = [
      { id: 1, rounds: [{ score: 30 }], teamId: null },
      { id: 2, rounds: [{ score: 30 }], teamId: null },
      { id: 3, rounds: [{ score: 20 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 1, score: 30, placement: 1 },
      { id: 2, score: 30, placement: 1 },
      { id: 3, score: 20, placement: 3 },
    ]);
  });

  it("should correctly rank players when all have the same score", () => {
    const players = [
      { id: 1, rounds: [{ score: 40 }], teamId: null },
      { id: 2, rounds: [{ score: 40 }], teamId: null },
      { id: 3, rounds: [{ score: 40 }], teamId: null },
    ];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 1, score: 40, placement: 1 },
      { id: 2, score: 40, placement: 1 },
      { id: 3, score: 40, placement: 1 },
    ]);
  });

  it("should correctly rank a single player", () => {
    const players = [{ id: 1, rounds: [{ score: 30 }], teamId: null }];
    const scoresheet: scoreSheet = {
      roundsScore: "Aggregate",
      winCondition: "Highest Score",
      targetScore: 50,
    };
    expect(calculatePlacement(players, scoresheet)).toEqual([
      { id: 1, score: 30, placement: 1 },
    ]);
  });
});
