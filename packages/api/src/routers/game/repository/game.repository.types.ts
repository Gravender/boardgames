import type { TransactionType } from "@board-games/db/client";

import type { GetGameInputType } from "../../../routers/game/game.input";

export interface GetGameArgs {
  input: GetGameInputType;
  userId: string;
}

export interface GetGameRolesArgs {
  input: {
    sourceType: "original" | "shared";
    canonicalGameId: number;
  };
  userId: string;
  tx: TransactionType;
}
