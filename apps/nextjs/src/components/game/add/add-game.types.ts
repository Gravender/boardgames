import { z } from "zod/v4";

import {
  baseRoundSchema,
  createGameSchema,
  scoreSheetSchema,
} from "@board-games/shared";

export const scoreSheetWithRoundsSchema = z.object({
  scoresheet: scoreSheetSchema,
  rounds: z.array(baseRoundSchema),
});

export type Round = z.infer<typeof baseRoundSchema>;
export type Rounds = Round[];
export type ScoreSheetWithRounds = z.infer<typeof scoreSheetWithRoundsSchema>;

export const addGameFormSchema = z.object({
  game: createGameSchema,
  scoresheets: z.array(scoreSheetWithRoundsSchema),
  activeScoreSheetIndex: z.number().optional(),
  activeForm: z.enum(["game", "scoresheet", "roles"]),
  moreOptions: z.boolean().optional(),
  gameRolesOpen: z.boolean().optional(),
});

export type AddGameFormValues = z.infer<typeof addGameFormSchema>;

export const defaultValues: AddGameFormValues = {
  game: {
    name: "",
    ownedBy: false,
    gameImg: null,
    playersMin: null,
    playersMax: null,
    playtimeMin: null,
    playtimeMax: null,
    yearPublished: null,
    roles: [],
  },
  scoresheets: [],
  activeScoreSheetIndex: undefined,
  activeForm: "game",
  moreOptions: false,
  gameRolesOpen: false,
};

export const defaultRound: Round = {
  name: "Round 1",
  type: "Numeric",
  color: "#cbd5e1",
  score: 0,
  order: 0,
};
