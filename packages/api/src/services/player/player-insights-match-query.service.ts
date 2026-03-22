import type {
  PlayerInsightsGameEntryType,
  PlayerInsightsMatchEntryType,
} from "../../routers/player/player.output";
import type { ImageRowWithUsage } from "@board-games/shared";
import { mapGameImageRowWithLogging } from "../../utils/image";
import type { WithPosthogUserCtx } from "../../utils/shared-args.types";
import { matchService } from "../match/match.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";

export type MapGameEntryFromRowInput = {
  gameId: number;
  sharedGameId: number | null;
  gameType: "original" | "shared" | "linked";
  gameName: string;
  gameImage: ImageRowWithUsage | null;
};

export type MapMatchEntryFromRowInput = {
  matchId: number;
  sharedMatchId: number | null;
  matchType: "original" | "shared";
  date: Date;
  isCoop: boolean;
  gameId: number;
  sharedGameId: number | null;
  gameType: "original" | "shared" | "linked";
  gameName: string;
  gameImage: ImageRowWithUsage | null;
  outcomePlacement: number | null;
  outcomeScore: number | null;
  outcomeWinner: boolean | null;
  playerCount: number;
};

class PlayerInsightsMatchQueryService {
  public async getPlayerInsightMatchRows(args: GetPlayerInsightsArgs) {
    return matchService.getPlayerInsightsMatches(args);
  }

  public async getPlayerInsightMatchSummaries(
    args: GetPlayerInsightsArgs & {
      order?: "asc" | "desc";
      limit?: number;
    },
  ) {
    return matchService.getPlayerInsightsMatchSummaries(args);
  }

  public async mapGameEntryFromRow(
    args: WithPosthogUserCtx<MapGameEntryFromRowInput>,
  ): Promise<PlayerInsightsGameEntryType> {
    const { gameId, sharedGameId, gameType, gameName, gameImage } = args.input;
    const image = await mapGameImageRowWithLogging({
      ctx: args.ctx,
      input: {
        image: gameImage,
        gameId,
      },
    });
    if (gameType === "shared") {
      return {
        type: "shared",
        id: gameId,
        sharedGameId: sharedGameId ?? gameId,
        name: gameName,
        image: image,
      };
    }
    return {
      type: "original",
      id: gameId,
      name: gameName,
      image: image,
    };
  }

  public async mapMatchEntryFromRow(
    args: WithPosthogUserCtx<MapMatchEntryFromRowInput>,
  ): Promise<PlayerInsightsMatchEntryType> {
    const input = args.input;
    const game = await this.mapGameEntryFromRow({
      ctx: args.ctx,
      input: {
        gameId: input.gameId,
        sharedGameId: input.sharedGameId,
        gameType: input.gameType,
        gameName: input.gameName,
        gameImage: input.gameImage,
      },
    });
    if (input.matchType === "shared" && input.sharedMatchId !== null) {
      return {
        type: "shared",
        sharedMatchId: input.sharedMatchId,
        matchId: input.matchId,
        date: input.date,
        game,
        outcome: {
          placement: input.outcomePlacement,
          score: input.outcomeScore,
          isWinner: input.outcomeWinner ?? false,
        },
        playerCount: input.playerCount,
        isCoop: input.isCoop,
      };
    }
    return {
      type: "original",
      matchId: input.matchId,
      date: input.date,
      game,
      outcome: {
        placement: input.outcomePlacement,
        score: input.outcomeScore,
        isWinner: input.outcomeWinner ?? false,
      },
      playerCount: input.playerCount,
      isCoop: input.isCoop,
    };
  }
}

export const playerInsightsMatchQueryService =
  new PlayerInsightsMatchQueryService();
