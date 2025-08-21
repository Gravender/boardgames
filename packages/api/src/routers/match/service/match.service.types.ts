import type { CreateMatchInputType } from "~/routers/match/match.input";

export interface CreateMatchArgs {
  input: CreateMatchInputType;
  ctx: {
    userId: string;
  };
}
