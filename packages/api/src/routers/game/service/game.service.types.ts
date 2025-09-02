import type { GetGameInputType } from "~/routers/game/game.input";

export interface GetGameArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}
