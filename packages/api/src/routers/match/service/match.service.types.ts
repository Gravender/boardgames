import type {
  CreateMatchInputType,
  GetMatchInputType,
} from "~/routers/match/match.input";

export interface CreateMatchArgs {
  input: CreateMatchInputType;
  ctx: {
    userId: string;
  };
}

export interface GetMatchArgs {
  input: GetMatchInputType;
  ctx: {
    userId: string;
  };
}

export interface GetMatchScoresheetArgs {
  input: GetMatchInputType;
  ctx: {
    userId: string;
  };
}

export interface GetMatchPlayersAndTeamsArgs {
  input: GetMatchInputType;
  ctx: {
    userId: string;
  };
}
