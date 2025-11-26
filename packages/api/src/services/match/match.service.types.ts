import type {
  CreateMatchInputType,
  DeleteMatchInputType,
  EditMatchInputType,
  GetMatchInputType,
} from "../../routers/match/match.input";

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

export interface DeleteMatchArgs {
  input: DeleteMatchInputType;
  ctx: {
    userId: string;
  };
}

export interface EditMatchArgs {
  input: EditMatchInputType;
  ctx: {
    userId: string;
  };
}
