import type {
  CreateMatchInputType,
  DeleteMatchInputType,
  EditMatchInputType,
  GetMatchInputType,
} from "~/routers/match/match.input";

export interface CreateMatchArgs {
  input: CreateMatchInputType;
  createdBy: string;
}

export interface GetMatchArgs {
  input: GetMatchInputType;
  userId: string;
}

export interface GetMatchScoresheetArgs {
  input: GetMatchInputType;
  userId: string;
}

export interface GetMatchPlayersAndTeamsArgs {
  input: GetMatchInputType;
  userId: string;
}

export interface DeleteMatchArgs {
  input: DeleteMatchInputType;
  userId: string;
}

export interface EditMatchArgs {
  input: EditMatchInputType;
  userId: string;
}
