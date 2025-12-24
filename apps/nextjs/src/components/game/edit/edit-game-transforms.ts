import type { RouterInputs, RouterOutputs } from "@board-games/api";

import type { EditGameFormValues } from "./edit-game.types";

// Helper function to transform form scoresheets back to edit format for change tracking
export function transformFormScoresheetsToEditFormat(
  formScoresheets: EditGameFormValues["scoresheets"],
  originalScoresheets: NonNullable<
    RouterOutputs["game"]["getEditGame"]
  >["scoresheets"],
) {
  return formScoresheets.map((formSheet) => {
    const originalSheet = originalScoresheets.find(
      (s) =>
        s.id === formSheet.scoresheet.id &&
        s.scoresheetType === formSheet.scoresheetType,
    );

    // Check if scoresheet changed
    const scoreSheetChanged =
      !originalSheet ||
      originalSheet.name !== formSheet.scoresheet.name ||
      originalSheet.winCondition !== formSheet.scoresheet.winCondition ||
      originalSheet.isCoop !== formSheet.scoresheet.isCoop ||
      originalSheet.isDefault !== formSheet.scoresheet.isDefault ||
      originalSheet.roundsScore !== formSheet.scoresheet.roundsScore ||
      originalSheet.targetScore !== formSheet.scoresheet.targetScore;

    // Check if rounds changed
    const roundChanged =
      !originalSheet ||
      formSheet.rounds.length !== originalSheet.rounds.length ||
      formSheet.rounds.some((round, index) => {
        const originalRound = originalSheet.rounds[index];
        if (!originalRound) return true;
        return (
          round.name !== originalRound.name ||
          round.type !== originalRound.type ||
          round.score !== originalRound.score ||
          round.color !== originalRound.color ||
          round.roundId !== originalRound.id
        );
      }) ||
      originalSheet.rounds.some((originalRound) => {
        return !formSheet.rounds.find((r) => r.roundId === originalRound.id);
      });

    return {
      ...formSheet,
      scoreSheetChanged,
      roundChanged,
    };
  });
}

// Transform form values to API input format
export function transformToApiInput(
  formValues: EditGameFormValues,
  originalData: NonNullable<RouterOutputs["game"]["getEditGame"]>,
  image:
    | { type: "svg"; name: string }
    | { type: "file"; imageId: number }
    | null
    | undefined,
): RouterInputs["game"]["updateGame"] {
  const gameValues = formValues.game;
  const formScoresheets = transformFormScoresheetsToEditFormat(
    formValues.scoresheets,
    originalData.scoresheets,
  );

  // Check game changes
  const nameChanged = gameValues.name !== originalData.game.name;
  const ownedByChanged = gameValues.ownedBy !== originalData.game.ownedBy;
  const playersMinChanged =
    gameValues.playersMin !== originalData.game.playersMin;
  const playersMaxChanged =
    gameValues.playersMax !== originalData.game.playersMax;
  const playtimeMinChanged =
    gameValues.playtimeMin !== originalData.game.playtimeMin;
  const playtimeMaxChanged =
    gameValues.playtimeMax !== originalData.game.playtimeMax;
  const yearPublishedChanged =
    gameValues.yearPublished !== originalData.game.yearPublished;
  const imageChanged = image !== undefined;

  const gameChanged =
    nameChanged ||
    ownedByChanged ||
    playersMinChanged ||
    playersMaxChanged ||
    playtimeMinChanged ||
    playtimeMaxChanged ||
    yearPublishedChanged ||
    imageChanged;

  // Check scoresheet changes
  const scoresheetChanged = formScoresheets.some(
    (scoresheet) =>
      scoresheet.scoresheetType === "new" ||
      scoresheet.scoreSheetChanged ||
      scoresheet.roundChanged,
  );

  // Build game update
  const game = gameChanged
    ? {
        type: "updateGame" as const,
        id: originalData.game.id,
        name: nameChanged ? gameValues.name : undefined,
        ownedBy: ownedByChanged ? gameValues.ownedBy : undefined,
        playersMin: playersMinChanged ? gameValues.playersMin : undefined,
        playersMax: playersMaxChanged ? gameValues.playersMax : undefined,
        playtimeMin: playtimeMinChanged ? gameValues.playtimeMin : undefined,
        playtimeMax: playtimeMaxChanged ? gameValues.playtimeMax : undefined,
        yearPublished: yearPublishedChanged
          ? gameValues.yearPublished
          : undefined,
        image: image,
      }
    : { type: "default" as const, id: originalData.game.id };

  // Build roles updates
  const updatedRoles = gameValues.roles
    .map((role) => {
      const originalRole = originalData.roles.find((r) => r.id === role.id);
      if (!originalRole) return null;
      const nameChanged = role.name !== originalRole.name;
      const descriptionChanged = role.description !== originalRole.description;
      if (!nameChanged && !descriptionChanged) return null;
      return {
        id: role.id,
        name: role.name,
        description: role.description,
      };
    })
    .filter((role) => role !== null);
  const newRoles = gameValues.roles.filter((role) => role.id < 0);
  const deletedRoles = originalData.roles
    .filter((role) => !gameValues.roles.find((vRole) => vRole.id === role.id))
    .map((role) => role.id);

  // Build scoresheets updates
  let changedScoresheets: RouterInputs["game"]["updateGame"]["scoresheets"] =
    [];
  let scoresheetsToDelete: RouterInputs["game"]["updateGame"]["scoresheetsToDelete"] =
    [];

  if (scoresheetChanged) {
    changedScoresheets = formScoresheets
      .filter(
        (scoresheet) =>
          scoresheet.scoresheetType === "new" ||
          scoresheet.scoreSheetChanged ||
          scoresheet.roundChanged,
      )
      .map<
        RouterInputs["game"]["updateGame"]["scoresheets"][number] | undefined
      >((scoresheet) => {
        const foundScoresheet = originalData.scoresheets.find(
          (dataScoresheet) =>
            dataScoresheet.id === scoresheet.scoresheet.id &&
            dataScoresheet.scoresheetType === scoresheet.scoresheetType,
        );

        if (!foundScoresheet || scoresheet.scoresheetType === "new") {
          const newScoresheet: Extract<
            RouterInputs["game"]["updateGame"]["scoresheets"][number],
            { type: "New" }
          > = {
            type: "New" as const,
            scoresheet: {
              name: scoresheet.scoresheet.name,
              winCondition: scoresheet.scoresheet.winCondition,
              isCoop: scoresheet.scoresheet.isCoop,
              isDefault: scoresheet.scoresheet.isDefault ?? false,
              roundsScore: scoresheet.scoresheet.roundsScore,
              targetScore: scoresheet.scoresheet.targetScore,
            },
            rounds: scoresheet.rounds.map((round) => ({
              name: round.name,
              type: round.type,
              score: round.score,
              color: round.color,
              order: round.order,
              roundId: round.roundId,
            })),
          };
          return newScoresheet;
        }

        const scoresheetName =
          scoresheet.scoresheet.name !== foundScoresheet.name
            ? scoresheet.scoresheet.name
            : undefined;
        const scoresheetWinCondition =
          scoresheet.scoresheet.winCondition !== foundScoresheet.winCondition
            ? scoresheet.scoresheet.winCondition
            : undefined;
        const scoresheetIsCoop =
          scoresheet.scoresheet.isCoop !== foundScoresheet.isCoop
            ? scoresheet.scoresheet.isCoop
            : undefined;
        const scoresheetRoundsScore =
          scoresheet.scoresheet.roundsScore !== foundScoresheet.roundsScore
            ? scoresheet.scoresheet.roundsScore
            : undefined;
        const scoresheetTargetScore =
          scoresheet.scoresheet.targetScore !== foundScoresheet.targetScore
            ? scoresheet.scoresheet.targetScore
            : undefined;
        const hasScoresheetChanged =
          scoresheetName !== undefined ||
          scoresheetWinCondition !== undefined ||
          scoresheetIsCoop !== undefined ||
          scoresheetRoundsScore !== undefined ||
          scoresheetTargetScore !== undefined;

        if (scoresheet.roundChanged) {
          type UpdateScoresheetAndRoundsType = Extract<
            RouterInputs["game"]["updateGame"]["scoresheets"][number],
            { type: "Update Scoresheet & Rounds" }
          >;

          const changedRounds = scoresheet.rounds
            .map<
              UpdateScoresheetAndRoundsType["roundsToEdit"][number] | undefined
            >((round) => {
              const foundRound = foundScoresheet.rounds.find(
                (dataRound) => dataRound.id === round.roundId,
              );
              if (!foundRound || !round.roundId) return undefined;

              const nameChanged =
                round.name !== foundRound.name ? round.name : undefined;
              const typeChanged =
                round.type !== foundRound.type ? round.type : undefined;
              const scoreChanged =
                round.score !== foundRound.score ? round.score : undefined;
              const colorChanged =
                round.color !== foundRound.color ? round.color : undefined;

              if (nameChanged || typeChanged || scoreChanged || colorChanged) {
                return {
                  id: round.roundId,
                  name: nameChanged,
                  type: typeChanged,
                  score: scoreChanged,
                  color: colorChanged,
                };
              }
              return undefined;
            })
            .filter<UpdateScoresheetAndRoundsType["roundsToEdit"][number]>(
              (round) => round !== undefined,
            );

          const roundsToDelete = foundScoresheet.rounds
            .map<
              UpdateScoresheetAndRoundsType["roundsToDelete"][number]
            >((round) => round.id)
            .filter(
              (roundId) =>
                !scoresheet.rounds.find((round) => round.roundId === roundId),
            );

          const roundsToAdd = scoresheet.rounds
            .map<
              UpdateScoresheetAndRoundsType["roundsToAdd"][number] | undefined
            >((round, index) => {
              const foundRound = foundScoresheet.rounds.find(
                (dataRound) => dataRound.id === round.roundId,
              );
              if (foundRound) return undefined;

              return {
                name: round.name,
                type: round.type,
                score: round.score,
                color: round.color,
                scoresheetId: foundScoresheet.id,
                order:
                  foundScoresheet.rounds.length -
                  roundsToDelete.length +
                  index +
                  1,
              };
            })
            .filter<UpdateScoresheetAndRoundsType["roundsToAdd"][number]>(
              (round) => round !== undefined,
            );

          const updateScoresheetAndRounds: Extract<
            RouterInputs["game"]["updateGame"]["scoresheets"][number],
            { type: "Update Scoresheet & Rounds" }
          > = {
            type: "Update Scoresheet & Rounds" as const,
            scoresheet: hasScoresheetChanged
              ? {
                  id: foundScoresheet.id,
                  scoresheetType: scoresheet.scoresheetType,
                  name: scoresheetName,
                  winCondition: scoresheetWinCondition,
                  isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,
                  isDefault: scoresheet.scoresheet.isDefault ?? false,
                  roundsScore: scoresheetRoundsScore,
                  targetScore: scoresheetTargetScore,
                }
              : {
                  id: foundScoresheet.id,
                  scoresheetType: scoresheet.scoresheetType,
                },
            roundsToEdit: changedRounds,
            roundsToAdd: roundsToAdd,
            roundsToDelete: roundsToDelete,
          };
          return updateScoresheetAndRounds;
        }

        if (scoresheet.scoreSheetChanged) {
          const updateScoresheet: Extract<
            RouterInputs["game"]["updateGame"]["scoresheets"][number],
            { type: "Update Scoresheet" }
          > = {
            type: "Update Scoresheet" as const,
            scoresheet: {
              id: foundScoresheet.id,
              scoresheetType: scoresheet.scoresheetType,
              name: scoresheetName ?? foundScoresheet.name,
              winCondition: scoresheetWinCondition,
              isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,
              isDefault: scoresheet.scoresheet.isDefault ?? false,
              roundsScore: scoresheetRoundsScore,
              targetScore: scoresheetTargetScore,
            },
          };
          return updateScoresheet;
        }

        return undefined;
      })
      .filter(
        (
          scoresheet,
        ): scoresheet is RouterInputs["game"]["updateGame"]["scoresheets"][number] =>
          scoresheet !== undefined,
      );

    scoresheetsToDelete = originalData.scoresheets
      .filter(
        (foundScoresheet) =>
          !formScoresheets.find(
            (scoresheet) =>
              scoresheet.scoresheet.id === foundScoresheet.id &&
              scoresheet.scoresheetType === foundScoresheet.scoresheetType,
          ),
      )
      .map((foundScoresheet) => {
        return {
          id: foundScoresheet.id,
          scoresheetType: foundScoresheet.scoresheetType,
        };
      });
  }

  return {
    game,
    scoresheets: changedScoresheets,
    scoresheetsToDelete,
    updatedRoles,
    newRoles,
    deletedRoles,
  };
}
