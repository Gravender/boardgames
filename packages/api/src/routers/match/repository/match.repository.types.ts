import type { CreateMatchInputType } from "~/routers/match/match.input";

export interface CreateMatchArgs {
  input: CreateMatchInputType;
  createdBy: string;
}
