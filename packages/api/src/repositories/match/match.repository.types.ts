import type z from "zod";

import {
  insertMatchSchema,
  insertSharedMatchSchema,
} from "@board-games/db/zodSchema";

import type {
  CreateMatchInputType,
  DeleteMatchInputType,
  EditMatchInputType,
  GetMatchInputType,
} from "../../routers/match/match.input";

export const insertMatchSchemaInput = insertMatchSchema.pick({
  createdBy: true,
  date: true,
  name: true,
  locationId: true,
  gameId: true,
  scoresheetId: true,
  running: true,
});
export type InsertMatchInputType = z.infer<typeof insertMatchSchemaInput>;

export const insertSharedMatchSchemaInput = insertSharedMatchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharedMatchInputType = z.infer<
  typeof insertSharedMatchSchemaInput
>;
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
