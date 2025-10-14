import type { GetGameInputType } from "../../../routers/game/game.input";

export interface GetGameArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}

export interface GetGameRolesArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}
