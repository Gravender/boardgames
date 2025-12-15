import type z from "zod";

import type {
  CreateGameInputType,
  GetGameInputType,
} from "@board-games/api/routers/game/game.input";
import type { TransactionType } from "@board-games/db/client";
import { insertGameRoleSchema } from "@board-games/db/zodSchema";

export interface GetGameArgs {
  input: GetGameInputType;
  userId: string;
}
export interface CreateGameArgs {
  input: CreateGameInputType["game"] & { imageId: number | null };
  userId: string;
  tx?: TransactionType;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createGameRoleInput = insertGameRoleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
type CreateGameRoleInputType = z.infer<typeof createGameRoleInput>;
export interface CreateGameRoleArgs {
  input: CreateGameRoleInputType;
  tx?: TransactionType;
}
export interface CreateGameRolesArgs {
  input: CreateGameRoleInputType[];
  tx?: TransactionType;
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
