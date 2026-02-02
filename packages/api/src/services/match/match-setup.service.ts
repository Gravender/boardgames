import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";

import type { InsertRoundInputType } from "../../routers/scoresheet/repository/scoresheet.repository.types";
import type { CreateMatchArgs } from "./match.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { sharedGameRepository } from "../../routers/game/sub-routers/shared/repository/shared-game.repository";
import { locationRepository } from "../../routers/location/repository/location.repository";
import { scoresheetRepository } from "../../routers/scoresheet/repository/scoresheet.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

class MatchSetupService {
  public async resolveGameForMatch(args: {
    gameInput: CreateMatchArgs["input"]["game"];
    userId: string;
    tx: TransactionType;
  }): Promise<number> {
    const { gameInput, userId, tx } = args;
    if (gameInput.type === "original") {
      const returnedGame = await gameRepository.getGame(
        {
          id: gameInput.id,
          createdBy: userId,
        },
        tx,
      );
      assertFound(
        returnedGame,
        {
          userId: userId,
          value: gameInput,
        },
        "Game not found. For Create Match.",
      );
      return returnedGame.id;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (gameInput.type === "shared") {
      const returnedSharedGame = await gameRepository.getSharedGame(
        {
          id: gameInput.sharedGameId,
          sharedWithId: userId,
          with: {
            game: {
              with: {
                roles: true,
              },
            },
          },
        },
        tx,
      );

      assertFound(
        returnedSharedGame,
        {
          userId: userId,
          value: gameInput,
        },
        "Shared game not found. For Create Match.",
      );
      if (returnedSharedGame.linkedGameId !== null) {
        return returnedSharedGame.linkedGameId;
      } else {
        const createdGame = await gameRepository.createGame({
          input: {
            name: returnedSharedGame.game.name,
            playersMin: returnedSharedGame.game.playersMin,
            playersMax: returnedSharedGame.game.playersMax,
            playtimeMin: returnedSharedGame.game.playtimeMin,
            playtimeMax: returnedSharedGame.game.playtimeMax,
            yearPublished: returnedSharedGame.game.yearPublished,
            imageId: returnedSharedGame.game.imageId,
          },
          userId,
          tx,
        });

        assertInserted(
          createdGame,
          { userId, value: gameInput },
          "Game not created. From shared game. For Create Match.",
        );
        await sharedGameRepository.linkSharedGame({
          input: {
            sharedGameId: returnedSharedGame.id,
            linkedGameId: createdGame.id,
          },
          tx,
        });
        return createdGame.id;
      }
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown game type.",
    });
  }
  public async resolveMatchScoresheet(args: {
    scoresheetInput: CreateMatchArgs["input"]["scoresheet"];
    userId: string;
    gameId: number;
    tx: TransactionType;
  }): Promise<{
    id: number;
    rounds: { id: number }[];
    type: "Match";
  }> {
    const { scoresheetInput, userId, gameId, tx } = args;
    if (scoresheetInput.type === "original") {
      return this.resolveOriginalScoresheet({
        scoresheetInput,
        userId,
        gameId,
        tx,
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (scoresheetInput.type === "shared") {
      return this.resolveSharedScoresheet({
        scoresheetInput,
        userId,
        gameId,
        tx,
      });
    }
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown scoresheet type.",
    });
  }

  private async resolveOriginalScoresheet(args: {
    scoresheetInput: Extract<
      CreateMatchArgs["input"]["scoresheet"],
      { type: "original" }
    >;
    userId: string;
    gameId: number;
    tx: TransactionType;
  }): Promise<{
    id: number;
    rounds: { id: number }[];
    type: "Match";
  }> {
    const { scoresheetInput, userId, gameId, tx } = args;
    const returnedScoresheet = await scoresheetRepository.get(
      {
        id: scoresheetInput.id,
        createdBy: userId,
        with: { rounds: true },
      },
      tx,
    );
    assertFound(
      returnedScoresheet,
      { userId, value: scoresheetInput },
      "Scoresheet not found. For Create Match.",
    );
    const insertedScoresheet = await scoresheetRepository.insert(
      {
        name: returnedScoresheet.name,
        isCoop: returnedScoresheet.isCoop,
        winCondition: returnedScoresheet.winCondition,
        targetScore: returnedScoresheet.targetScore,
        roundsScore: returnedScoresheet.roundsScore,
        parentId: returnedScoresheet.id,
        forkedFromScoresheetId: returnedScoresheet.id,
        forkedFromTemplateVersion: returnedScoresheet.templateVersion,
        createdBy: userId,
        gameId,
        type: "Match",
      },
      tx,
    );
    assertInserted(
      insertedScoresheet,
      { userId, value: scoresheetInput },
      "Scoresheet Not Created Successfully. For Create Match.",
    );
    const rounds = await this.insertRoundsFromTemplate(
      returnedScoresheet.rounds,
      insertedScoresheet.id,
      tx,
    );
    return { id: insertedScoresheet.id, rounds, type: "Match" };
  }

  private async resolveSharedScoresheet(args: {
    scoresheetInput: Extract<
      CreateMatchArgs["input"]["scoresheet"],
      { type: "shared" }
    >;
    userId: string;
    gameId: number;
    tx: TransactionType;
  }): Promise<{
    id: number;
    rounds: { id: number }[];
    type: "Match";
  }> {
    const { scoresheetInput, userId, gameId, tx } = args;
    const returnedSharedScoresheet = await scoresheetRepository.getShared(
      {
        id: scoresheetInput.sharedId,
        sharedWithId: userId,
        with: {
          scoresheet: true,
          sharedRounds: { with: { round: true } },
        },
      },
      tx,
    );
    assertFound(
      returnedSharedScoresheet,
      { userId, value: scoresheetInput },
      "Shared scoresheet not found. For Create Match",
    );
    if (returnedSharedScoresheet.linkedScoresheetId !== null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Shared scoresheet already has a linked copy. Cannot create another match from this shared scoresheet.",
      });
    }
    const insertedNewScoresheet = await scoresheetRepository.insert(
      {
        name: returnedSharedScoresheet.scoresheet.name,
        isCoop: returnedSharedScoresheet.scoresheet.isCoop,
        winCondition: returnedSharedScoresheet.scoresheet.winCondition,
        targetScore: returnedSharedScoresheet.scoresheet.targetScore,
        roundsScore: returnedSharedScoresheet.scoresheet.roundsScore,
        createdBy: userId,
        gameId,
        type: "Game",
      },
      tx,
    );
    assertInserted(
      insertedNewScoresheet,
      { userId, value: scoresheetInput },
      "Scoresheet Not Created Successfully. For Create Match. Based on Shared Scoresheet.",
    );
    const newScoresheetRounds = await this.insertRoundsFromTemplate(
      returnedSharedScoresheet.sharedRounds.map((sr) => sr.round),
      insertedNewScoresheet.id,
      tx,
    );
    if (
      newScoresheetRounds.length !==
      returnedSharedScoresheet.sharedRounds.length
    ) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Rounds not inserted successfully for linked scoresheet. For Create Match. Based on Shared Scoresheet.",
      });
    }
    for (let i = 0; i < returnedSharedScoresheet.sharedRounds.length; i++) {
      const sharedRound = returnedSharedScoresheet.sharedRounds[i];
      const newRound = newScoresheetRounds[i];
      if (!sharedRound || !newRound) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Shared round not found. For Create Match. Based on Shared Scoresheet.",
        });
      }
      const linkedSharedRound = await scoresheetRepository.linkSharedRound({
        input: {
          sharedRoundId: sharedRound.id,
          linkedRoundId: newRound.id,
          sharedScoresheetId: sharedRound.sharedScoresheetId,
        },
        tx,
      });
      assertInserted(
        linkedSharedRound,
        { userId, value: scoresheetInput },
        "Shared round not linked successfully. For Create Match. Based on Shared Scoresheet.",
      );
    }
    const linkScoresheet = await scoresheetRepository.linkSharedScoresheet({
      input: {
        sharedScoresheetId: returnedSharedScoresheet.id,
        linkedScoresheetId: insertedNewScoresheet.id,
      },
      tx,
    });
    assertInserted(
      linkScoresheet,
      { userId, value: scoresheetInput },
      "Scoresheet Not Linked Successfully. For Create Match. Based on Shared Scoresheet.",
    );
    return this.resolveOriginalScoresheet({
      scoresheetInput: {
        id: insertedNewScoresheet.id,
        type: "original",
      },
      userId,
      gameId,
      tx,
    });
  }

  public async resolveLocationForMatch(args: {
    locationInput: CreateMatchArgs["input"]["location"] | null | undefined;
    userId: string;
    tx: TransactionType;
  }): Promise<number | null> {
    const { locationInput, userId, tx } = args;
    if (!locationInput) return null;

    if (locationInput.type === "original") {
      const returnedLocation = await locationRepository.get(
        {
          id: locationInput.id,
          createdBy: userId,
        },
        tx,
      );

      assertFound(
        returnedLocation,
        { userId, value: locationInput },
        "Location not found.",
      );

      return returnedLocation.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (locationInput.type === "shared") {
      const returnedSharedLocation = await locationRepository.getShared(
        {
          id: locationInput.sharedId,
          sharedWithId: userId,
          with: {
            location: true,
          },
        },
        tx,
      );

      assertFound(
        returnedSharedLocation,
        { userId, value: locationInput },
        "Shared location not found.",
      );

      const newLocation = await locationRepository.insert(
        {
          name: returnedSharedLocation.location.name,
          isDefault: returnedSharedLocation.isDefault,
          createdBy: userId,
        },
        tx,
      );

      assertInserted(
        newLocation,
        { userId, value: locationInput },
        "Location not created.",
      );

      const linkedLocation = await locationRepository.linkSharedLocation({
        input: {
          sharedLocationId: returnedSharedLocation.id,
          linkedLocationId: newLocation.id,
        },
        tx,
      });

      assertInserted(
        linkedLocation,
        { userId, value: locationInput },
        "Location not linked.",
      );

      return newLocation.id;
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unknown location type.",
    });
  }
  private async insertRoundsFromTemplate(
    rounds: (InsertRoundInputType & { id: number; roundKey?: string })[],
    scoresheetId: number,
    tx: TransactionType,
  ) {
    const mappedRounds = rounds.map((templateRound) => ({
      name: templateRound.name,
      type: templateRound.type,
      color: templateRound.color,
      score: templateRound.score,
      winCondition: templateRound.winCondition,
      toggleScore: templateRound.toggleScore,
      modifier: templateRound.modifier,
      lookup: templateRound.lookup,
      order: templateRound.order,
      parentId: templateRound.id,
      roundKey: templateRound.roundKey ?? crypto.randomUUID(),
      templateRoundId: templateRound.id,
      scoresheetId,
    }));
    if (mappedRounds.length === 0) return [];
    const insertedRounds = await scoresheetRepository.insertRounds(
      mappedRounds,
      tx,
    );
    return insertedRounds;
  }
}

export const matchSetupService = new MatchSetupService();
