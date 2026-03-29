import z from "zod";

import { imageSchema } from "@board-games/shared";

const locationsSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
  }),
]);
export type LocationType = z.infer<typeof locationsSchema> | null;
const scoresheetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
  }),
]);
export type ScoresheetType = z.infer<typeof scoresheetSchema>;
const roleSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.number(),
    type: z.literal("original"),
    name: z.string(),
    description: z.string().nullable(),
  }),
  z.object({
    sharedId: z.number(),
    type: z.literal("shared"),
    name: z.string(),
    description: z.string().nullable(),
  }),
]);
const teamsSchema = z.object({
  id: z.number(),
  name: z.string(),
  roles: z.array(roleSchema),
});
export type TeamType = z.infer<typeof teamsSchema>;
const playerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    name: z.string(),
    roles: z.array(roleSchema),
    teamId: z.number().nullish(),
    image: imageSchema.nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    name: z.string(),
    roles: z.array(roleSchema),
    teamId: z.number().nullish(),
    image: imageSchema.nullable(),
  }),
]);
export type PlayerType = z.infer<typeof playerSchema>;
export const addMatchSchema = z.object({
  name: z.string().min(1, "Match name is required"),
  date: z.date(),
  location: locationsSchema.nullable(),
  scoresheet: scoresheetSchema,
  teams: z.array(teamsSchema),
  players: z.array(playerSchema).min(1, "At least one player is required"),
});
