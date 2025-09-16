import type { GetMatchesByDateInputType } from "../date-match.input";

export interface GetMatchesByDateArgs {
  input: GetMatchesByDateInputType;
  ctx: {
    userId: string;
  };
}
export interface GetMatchesByCalenderArgs {
  ctx: {
    userId: string;
  };
}
