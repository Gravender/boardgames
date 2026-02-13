import type { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import type { editScoresheetSchemaApiInput } from "@board-games/shared";

import type { EditGameArgs } from "./game.service.types";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

const getSharedScoresheetForUpdate = async (args: {
  sharedId: number;
  userId: string;
  tx: TransactionType;
}) => {
  const { sharedId, userId, tx } = args;
  const returnedSharedScoresheet = await scoresheetRepository.getShared(
    {
      id: sharedId,
      sharedWithId: userId,
    },
    tx,
  );
  assertFound(
    returnedSharedScoresheet,
    {
      userId,
      value: { sharedId },
    },
    "Shared scoresheet not found.",
  );
  return returnedSharedScoresheet;
};

// ---------------------------------------------------------------------------
// Per-type handlers
// ---------------------------------------------------------------------------

const handleNewScoresheet = async (
  inputScoresheet: Extract<
    z.infer<typeof editScoresheetSchemaApiInput>,
    { type: "New" }
  >,
  gameId: number,
  userId: string,
  tx: TransactionType,
) => {
  const returnedScoresheet = await scoresheetRepository.insert(
    {
      name: inputScoresheet.scoresheet.name,
      winCondition: inputScoresheet.scoresheet.winCondition,
      isCoop: inputScoresheet.scoresheet.isCoop,
      roundsScore: inputScoresheet.scoresheet.roundsScore,
      targetScore: inputScoresheet.scoresheet.targetScore,
      createdBy: userId,
      gameId,
      type: "Game",
    },
    tx,
  );
  assertInserted(
    returnedScoresheet,
    {
      userId,
      value: { gameId },
    },
    "Failed to create scoresheet",
  );

  const roundsToInsert = inputScoresheet.rounds.map((round, index) => ({
    name: round.name,
    type: round.type,
    score: round.score,
    color: round.color,
    lookup: round.lookup,
    modifier: round.modifier,
    scoresheetId: returnedScoresheet.id,
    order: index + 1,
  }));
  await scoresheetRepository.insertRounds(roundsToInsert, tx);
};

const handleUpdateScoresheet = async (
  inputScoresheet: Extract<
    z.infer<typeof editScoresheetSchemaApiInput>,
    { type: "Update Scoresheet" }
  >,
  userId: string,
  tx: TransactionType,
) => {
  if (inputScoresheet.scoresheet.scoresheetType === "original") {
    const originalScoresheet = inputScoresheet.scoresheet;
    const returnedOriginalScoresheet = await scoresheetRepository.get(
      {
        id: originalScoresheet.id,
        createdBy: userId,
      },
      tx,
    );
    assertFound(
      returnedOriginalScoresheet,
      {
        userId,
        value: inputScoresheet.scoresheet,
      },
      "Scoresheet not found.",
    );
    await scoresheetRepository.update({
      input: {
        id: originalScoresheet.id,
        name: originalScoresheet.name,
        winCondition: originalScoresheet.winCondition,
        isCoop: originalScoresheet.isCoop,
        type:
          originalScoresheet.isDefault !== undefined
            ? originalScoresheet.isDefault
              ? "Default"
              : "Game"
            : undefined,
        roundsScore: originalScoresheet.roundsScore,
        targetScore: originalScoresheet.targetScore,
      },
      tx,
    });
  } else {
    const sharedScoresheetInput = inputScoresheet.scoresheet;
    const returnedSharedScoresheet = await getSharedScoresheetForUpdate({
      sharedId: sharedScoresheetInput.sharedId,
      userId,
      tx,
    });

    if (returnedSharedScoresheet.permission !== "edit") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Does not have permission to edit this scoresheet.",
      });
    }

    await scoresheetRepository.update({
      input: {
        id: returnedSharedScoresheet.scoresheetId,
        name: sharedScoresheetInput.name,
        winCondition: sharedScoresheetInput.winCondition,
        isCoop: sharedScoresheetInput.isCoop,
        roundsScore: sharedScoresheetInput.roundsScore,
        targetScore: sharedScoresheetInput.targetScore,
      },
      tx,
    });

    if (sharedScoresheetInput.isDefault !== undefined) {
      await scoresheetRepository.updateShared({
        input: {
          id: returnedSharedScoresheet.id,
          isDefault: sharedScoresheetInput.isDefault,
        },
        tx,
      });
    }
  }
};

const handleUpdateScoresheetAndRounds = async (
  inputScoresheet: Extract<
    z.infer<typeof editScoresheetSchemaApiInput>,
    { type: "Update Scoresheet & Rounds" }
  >,
  userId: string,
  tx: TransactionType,
) => {
  let scoresheetId: number | undefined = undefined;
  let sharedScoresheetId: number | undefined = undefined;

  if (inputScoresheet.scoresheet.scoresheetType === "original") {
    const originalScoresheet = inputScoresheet.scoresheet;
    const returnedOriginalScoresheet = await scoresheetRepository.get(
      {
        id: originalScoresheet.id,
        createdBy: userId,
      },
      tx,
    );
    assertFound(
      returnedOriginalScoresheet,
      {
        userId,
        value: originalScoresheet,
      },
      "Scoresheet not found.",
    );
    scoresheetId = returnedOriginalScoresheet.id;
  } else {
    const sharedScoresheetInput = inputScoresheet.scoresheet;
    const returnedSharedScoresheet = await getSharedScoresheetForUpdate({
      sharedId: sharedScoresheetInput.sharedId,
      userId,
      tx,
    });
    if (returnedSharedScoresheet.permission !== "edit") {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Does not have permission to edit this scoresheet.",
      });
    }
    scoresheetId = returnedSharedScoresheet.scoresheetId;
    sharedScoresheetId = returnedSharedScoresheet.id;
  }

  if (
    inputScoresheet.scoresheet.scoreSheetUpdated === "updated" &&
    scoresheetId
  ) {
    const scoresheetData = inputScoresheet.scoresheet;
    const scoresheetType = () => {
      if (
        scoresheetData.scoresheetType === "original" &&
        "isDefault" in inputScoresheet.scoresheet
      ) {
        return inputScoresheet.scoresheet.isDefault ? "Default" : "Game";
      }
      return undefined;
    };
    await scoresheetRepository.update({
      input: {
        id: scoresheetId,
        name: scoresheetData.name,
        winCondition: scoresheetData.winCondition,
        isCoop: scoresheetData.isCoop,
        type: scoresheetType(),
        roundsScore: scoresheetData.roundsScore,
        targetScore: scoresheetData.targetScore,
      },
      tx,
    });

    if (
      scoresheetData.scoresheetType === "shared" &&
      sharedScoresheetId &&
      inputScoresheet.scoresheet.isDefault !== undefined
    ) {
      await scoresheetRepository.updateShared({
        input: {
          id: sharedScoresheetId,
          isDefault: inputScoresheet.scoresheet.isDefault,
        },
        tx,
      });
    }
  }

  if (inputScoresheet.roundsToEdit.length > 0) {
    await bulkUpdateRounds({
      roundsToEdit: inputScoresheet.roundsToEdit,
      tx,
    });
  }

  if (inputScoresheet.roundsToAdd.length > 0) {
    if (scoresheetId === undefined) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Scoresheet ID is required to add rounds.",
      });
    }
    await scoresheetRepository.insertRounds(
      inputScoresheet.roundsToAdd.map((round) => ({
        ...round,
        scoresheetId,
      })),
      tx,
    );
  }

  if (inputScoresheet.roundsToDelete.length > 0) {
    await scoresheetRepository.deleteRounds({
      input: {
        ids: inputScoresheet.roundsToDelete,
      },
      tx,
    });
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const updateScoresheets = async (args: {
  input: EditGameArgs["input"]["scoresheets"];
  gameId: number;
  userId: string;
  tx: TransactionType;
}) => {
  const { input, gameId, userId, tx } = args;

  for (const inputScoresheet of input) {
    if (inputScoresheet.type === "New") {
      await handleNewScoresheet(inputScoresheet, gameId, userId, tx);
    }

    if (inputScoresheet.type === "Update Scoresheet") {
      await handleUpdateScoresheet(inputScoresheet, userId, tx);
    }

    if (inputScoresheet.type === "Update Scoresheet & Rounds") {
      await handleUpdateScoresheetAndRounds(inputScoresheet, userId, tx);
    }
  }
};

const bulkUpdateRounds = async (args: {
  roundsToEdit: Extract<
    z.infer<typeof editScoresheetSchemaApiInput>,
    { type: "Update Scoresheet & Rounds" }
  >["roundsToEdit"];
  tx: TransactionType;
}) => {
  const { roundsToEdit, tx } = args;
  for (const round of roundsToEdit) {
    await scoresheetRepository.updateRound({
      id: round.id,
      input: {
        name: round.name,
        score: round.score,
        type: round.type,
        color: round.color,
        lookup: round.lookup,
        modifier: round.modifier,
      },
      tx,
    });
  }
};

export const deleteScoresheets = async (args: {
  input: EditGameArgs["input"]["scoresheetsToDelete"];
  userId: string;
  tx: TransactionType;
}) => {
  const { input, userId, tx } = args;
  const sharedScoresheetsToDelete = input.filter(
    (scoresheetDelete) => scoresheetDelete.scoresheetType === "shared",
  );
  const originalScoresheetsToDelete = input.filter(
    (scoresheetDelete) => scoresheetDelete.scoresheetType === "original",
  );

  if (originalScoresheetsToDelete.length > 0) {
    for (const scoresheetToDelete of originalScoresheetsToDelete) {
      await scoresheetRepository.deleteScoresheet({
        input: {
          id: scoresheetToDelete.id,
          createdBy: userId,
        },
        tx,
      });
    }
  }

  if (sharedScoresheetsToDelete.length > 0) {
    for (const sharedScoresheetToDelete of sharedScoresheetsToDelete) {
      await scoresheetRepository.deleteSharedScoresheet({
        input: {
          sharedId: sharedScoresheetToDelete.sharedId,
          userId,
        },
        tx,
      });
    }
  }
};
