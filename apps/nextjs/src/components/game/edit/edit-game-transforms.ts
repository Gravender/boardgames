import type { RouterInputs, RouterOutputs } from "@board-games/api";
import { isSameRole, isSameScoresheet } from "@board-games/shared";

import type { EditGameFormValues } from "./edit-game.types";

// Helper function to transform form scoresheets back to edit format for change tracking
export function transformFormScoresheetsToEditFormat(
  formScoresheets: EditGameFormValues["scoresheets"],
  initialScoresheets: NonNullable<
    RouterOutputs["newGame"]["gameScoreSheetsWithRounds"]
  >,
) {
  return formScoresheets.map((formSheet) => {
    const originalSheet = initialScoresheets.find(
      (s) =>
        formSheet.scoresheetType !== "new" &&
        isSameScoresheet(
          s,
          formSheet.scoresheetType === "original"
            ? { type: "original", id: formSheet.scoresheet.id }
            : { type: "shared", sharedId: formSheet.sharedId },
        ),
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
  initialGame: NonNullable<RouterOutputs["game"]["getGame"]>,
  initialScoresheets: NonNullable<
    RouterOutputs["newGame"]["gameScoreSheetsWithRounds"]
  >,
  initialRoles: NonNullable<RouterOutputs["newGame"]["gameRoles"]>,
  image:
    | { type: "svg"; name: string }
    | { type: "file"; imageId: number }
    | null
    | undefined,
): RouterInputs["game"]["updateGame"] {
  const gameValues = formValues.game;
  const formScoresheets = transformFormScoresheetsToEditFormat(
    formValues.scoresheets,
    initialScoresheets,
  );

  // Check game changes
  const nameChanged = gameValues.name !== initialGame.name;
  const ownedByChanged = gameValues.ownedBy !== initialGame.ownedBy;
  const playersMinChanged = gameValues.playersMin !== initialGame.players.min;
  const playersMaxChanged = gameValues.playersMax !== initialGame.players.max;
  const playtimeMinChanged =
    gameValues.playtimeMin !== initialGame.playtime.min;
  const playtimeMaxChanged =
    gameValues.playtimeMax !== initialGame.playtime.max;
  const yearPublishedChanged =
    gameValues.yearPublished !== initialGame.yearPublished;
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
        id: initialGame.id,
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
    : { type: "default" as const, id: initialGame.id };

  // Build roles updates
  const updatedRoles = gameValues.roles
    .map<RouterInputs["game"]["updateGame"]["updatedRoles"][number] | null>(
      (role) => {
        const originalRole = initialRoles.find(
          (r) => role.type !== "new" && isSameRole(r, role),
        );
        if (!originalRole) return null;
        const nameChanged = role.name !== originalRole.name;
        const descriptionChanged =
          role.description !== originalRole.description;
        if (!nameChanged && !descriptionChanged) return null;
        if (originalRole.type === "original") {
          return {
            type: "original" as const,
            id: originalRole.id,
            name: role.name,
            description: role.description,
          };
        }
        return {
          type: "shared",
          sharedId: originalRole.sharedId,
          name: role.name,
          description: role.description,
        };
      },
    )
    .filter((role) => role !== null);
  const newRoles = gameValues.roles.filter((role) => role.type === "new");
  const deletedRoles: RouterInputs["game"]["updateGame"]["deletedRoles"] =
    initialRoles
      .filter(
        (role) =>
          !gameValues.roles.find(
            (vRole) => vRole.type !== "new" && isSameRole(vRole, role),
          ),
      )
      .map((role) =>
        role.type === "original"
          ? {
              type: "original",
              id: role.id,
            }
          : {
              type: "shared",
              sharedId: role.sharedId,
            },
      );

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
        const foundScoresheet = initialScoresheets.find(
          (dataScoresheet) =>
            scoresheet.scoresheetType !== "new" &&
            isSameScoresheet(
              dataScoresheet,
              scoresheet.scoresheetType === "original"
                ? { type: "original", id: scoresheet.scoresheet.id }
                : { type: "shared", sharedId: scoresheet.sharedId },
            ),
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
          const baseScoresheet = {
            name: scoresheetName ?? foundScoresheet.name,
            winCondition: scoresheetWinCondition,
            isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,
            isDefault: scoresheet.scoresheet.isDefault ?? false,
            roundsScore: scoresheetRoundsScore,
            targetScore: scoresheetTargetScore,
          };
          const updateScoresheetAndRounds: Extract<
            RouterInputs["game"]["updateGame"]["scoresheets"][number],
            { type: "Update Scoresheet & Rounds" }
          > = {
            type: "Update Scoresheet & Rounds" as const,
            scoresheet: hasScoresheetChanged
              ? {
                  scoreSheetUpdated: "updated" as const,
                  ...(scoresheet.scoresheetType === "original"
                    ? {
                        id: scoresheet.scoresheet.id,
                        scoresheetType: "original",
                      }
                    : {
                        sharedId: scoresheet.sharedId,
                        scoresheetType: "shared",
                      }),
                  ...baseScoresheet,
                }
              : scoresheet.scoresheetType === "original"
                ? {
                    scoreSheetUpdated: "false" as const,
                    scoresheetType: "original",
                    id: scoresheet.scoresheet.id,
                  }
                : {
                    scoreSheetUpdated: "false" as const,
                    scoresheetType: "shared",
                    sharedId: scoresheet.sharedId,
                  },
            roundsToEdit: changedRounds,
            roundsToAdd: roundsToAdd,
            roundsToDelete: roundsToDelete,
          };
          return updateScoresheetAndRounds;
        }

        if (scoresheet.scoreSheetChanged) {
          const baseScoresheet = {
            name: scoresheetName ?? foundScoresheet.name,
            winCondition: scoresheetWinCondition,
            isCoop: scoresheetIsCoop ?? foundScoresheet.isCoop,
            isDefault: scoresheet.scoresheet.isDefault ?? false,
            roundsScore: scoresheetRoundsScore,
            targetScore: scoresheetTargetScore,
          };
          const updateScoresheet: Extract<
            RouterInputs["game"]["updateGame"]["scoresheets"][number],
            { type: "Update Scoresheet" }
          > = {
            type: "Update Scoresheet" as const,
            scoresheet:
              scoresheet.scoresheetType === "original"
                ? {
                    scoresheetType: "original",
                    id: scoresheet.scoresheet.id,
                    ...baseScoresheet,
                  }
                : {
                    scoresheetType: "shared",
                    sharedId: scoresheet.sharedId,
                    ...baseScoresheet,
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

    scoresheetsToDelete = initialScoresheets
      .filter(
        (foundScoresheet) =>
          !formScoresheets.find(
            (scoresheet) =>
              scoresheet.scoresheetType !== "new" &&
              isSameScoresheet(
                foundScoresheet,
                scoresheet.scoresheetType === "original"
                  ? { type: "original" as const, id: scoresheet.scoresheet.id }
                  : { type: "shared" as const, sharedId: scoresheet.sharedId },
              ),
          ),
      )
      .map((foundScoresheet) => {
        return foundScoresheet.type === "original"
          ? { scoresheetType: "original" as const, id: foundScoresheet.id }
          : {
              scoresheetType: "shared" as const,
              sharedId: foundScoresheet.sharedId,
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
