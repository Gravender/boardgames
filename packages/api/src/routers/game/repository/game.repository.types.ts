import type { TransactionType } from "@board-games/db/client";

import type { GetGameInputType } from "../../../routers/game/game.input";

export interface GetGameArgs {
  input: GetGameInputType;
  userId: string;
}
export interface GetGameMatchesOutputType {
  matches: {
    id: number;
    sharedMatchId: number | null;
    name: string;
    date: Date;
    comment: string | null;
    type: "original" | "shared";
    finished: boolean;
    duration: number;
    game: {
      id: number;
      linkedGameId: number | null;
      sharedGameId: number | null;
      type: string;
      name: string;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
    };
    location: { id: number; name: string } | null;
    teams: { id: number; name: string }[];
    matchPlayers: {
      id: number;
      playerId: number;
      name: string;
      score: number | null;
      teamId: number | null;
      placement: number | null;
      winner: boolean | null;
      type: "original" | "shared";
      playerType: "original" | "shared" | "linked" | "not-shared";
      sharedPlayerId: number | null;
      linkedPlayerId: number | null;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
    }[];
  }[];
  userPlayer: {
    id: number;
    name: string;
    imageId: number | null;
    createdBy: string;
    isUser: boolean;
  };
}

export interface GetGameRolesArgs {
  input: {
    sourceType: "original" | "shared";
    canonicalGameId: number;
  };
  userId: string;
  tx: TransactionType;
}
