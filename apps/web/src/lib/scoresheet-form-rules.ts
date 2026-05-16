import {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";

const coopWinConditionOptions: (typeof scoreSheetWinConditions)[number][] = [
  "Manual",
  "Target Score",
];
const nonManualRoundsScoreOptions: (typeof scoreSheetRoundsScore)[number][] =
  scoreSheetRoundsScore.filter((option) => option !== "None");

type ScoresheetShape = {
  scoresheet: {
    isCoop: boolean;
    isDefault?: boolean;
    winCondition?: (typeof scoreSheetWinConditions)[number];
    roundsScore?: (typeof scoreSheetRoundsScore)[number];
    targetScore?: number;
  };
  rounds: unknown[];
};

export const getAllowedWinConditions = ({ isCoop }: { isCoop: boolean }) =>
  isCoop ? coopWinConditionOptions : scoreSheetWinConditions;

export const getDefaultWinCondition = ({
  isCoop,
}: {
  isCoop: boolean;
}): (typeof scoreSheetWinConditions)[number] =>
  isCoop ? "Manual" : "Highest Score";

export const getAllowedRoundsScoreOptions = ({
  winCondition,
}: {
  winCondition: (typeof scoreSheetWinConditions)[number];
}) =>
  winCondition === "Manual"
    ? scoreSheetRoundsScore
    : nonManualRoundsScoreOptions;

export const getDefaultRoundsScore = ({
  winCondition,
}: {
  winCondition: (typeof scoreSheetWinConditions)[number];
}): (typeof scoreSheetRoundsScore)[number] =>
  winCondition === "Manual" ? "Manual" : "Aggregate";

export const normalizeScoresheet = <TScoresheet extends ScoresheetShape>(
  scoresheet: TScoresheet,
): TScoresheet => {
  const allowedWinConditions = getAllowedWinConditions({
    isCoop: scoresheet.scoresheet.isCoop,
  });
  const nextWinCondition = allowedWinConditions.includes(
    scoresheet.scoresheet.winCondition ?? "Highest Score",
  )
    ? (scoresheet.scoresheet.winCondition ?? "Highest Score")
    : getDefaultWinCondition({
        isCoop: scoresheet.scoresheet.isCoop,
      });

  const allowedRoundsScoreOptions = getAllowedRoundsScoreOptions({
    winCondition: nextWinCondition,
  });
  const nextRoundsScore = allowedRoundsScoreOptions.includes(
    scoresheet.scoresheet.roundsScore ?? "Aggregate",
  )
    ? (scoresheet.scoresheet.roundsScore ?? "Aggregate")
    : getDefaultRoundsScore({
        winCondition: nextWinCondition,
      });

  const nextTargetScore =
    nextWinCondition === "Target Score"
      ? (scoresheet.scoresheet.targetScore ?? 0)
      : 0;

  return {
    ...scoresheet,
    scoresheet: {
      ...scoresheet.scoresheet,
      winCondition: nextWinCondition,
      roundsScore: nextRoundsScore,
      targetScore: nextTargetScore,
    },
  };
};

export const normalizeScoresheetAtIndex = <TScoresheet extends ScoresheetShape>(
  scoresheets: TScoresheet[],
  index: number,
): TScoresheet[] =>
  scoresheets.map((scoresheet, scoresheetIndex) =>
    scoresheetIndex === index ? normalizeScoresheet(scoresheet) : scoresheet,
  );

export const normalizeDefaultScoresheets = <
  TScoresheet extends ScoresheetShape,
>(
  scoresheets: TScoresheet[],
  selectedIndex: number,
): TScoresheet[] =>
  scoresheets.map((scoresheet, index) => ({
    ...scoresheet,
    scoresheet: {
      ...scoresheet.scoresheet,
      isDefault: index === selectedIndex,
    },
  }));
