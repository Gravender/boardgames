import { z } from "zod";
import { createStore } from "zustand/vanilla";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/schema";

export const scoreSheetSchema = insertScoreSheetSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    type: true,
    gameId: true,
  })
  .required({ name: true });
export type ScoreSheetType = z.infer<typeof scoreSheetSchema>;
export const roundsSchema = z.array(
  insertRoundSchema
    .omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      scoresheetId: true,
    })
    .required({ name: true }),
);
export type RoundsType = z.infer<typeof roundsSchema>;
export const gameSchema = z
  .object({
    name: z.string().min(1, {
      message: "Game name is required",
    }),
    ownedBy: z.boolean(),
    gameImg: z
      .instanceof(File)
      .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
      .refine(
        (file) => file.type === "image/jpeg" || file.type === "image/png",
        "Only .jpg and .png formats are supported.",
      )
      .nullable(),
    playersMin: z.number().min(1).nullable(),
    playersMax: z.number().positive().nullable(),
    playtimeMin: z.number().min(1).positive().nullable(),
    playtimeMax: z.number().positive().nullable(),
    yearPublished: z
      .number()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.playersMin &&
      values.playersMax &&
      values.playersMin > values.playersMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      values.playtimeMin &&
      values.playtimeMax &&
      values.playtimeMin > values.playtimeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
  });
export type GameType = z.infer<typeof gameSchema>;
export const addGameSchema = z.object({
  isOpen: z.boolean(),
  moreOptions: z.boolean(),
  game: gameSchema,
  scoresheet: scoreSheetSchema.or(z.null()),
  rounds: roundsSchema,
});
export type AddGameState = z.infer<typeof addGameSchema>;

export interface AddGameActions {
  setGame: (game: GameType) => void;
  setRounds: (rounds: RoundsType) => void;
  setScoreSheet: (scoreSheet: ScoreSheetType) => void;
  setIsOpen: (isOpen: boolean) => void;
  setMoreOptions: (moreOptions: boolean) => void;
  reset: () => void;
}

export type AddGameStore = AddGameState & AddGameActions;

export const defaultInitState: AddGameState = {
  isOpen: false,
  moreOptions: false,
  game: {
    name: "",
    ownedBy: false,
    gameImg: null,
    playersMin: null,
    playersMax: null,
    playtimeMin: null,
    playtimeMax: null,
    yearPublished: null,
  },
  scoresheet: null,
  rounds: [],
};

export const createAddGameStore = (
  initState: AddGameState = defaultInitState,
) => {
  return createStore<AddGameStore>()((set) => ({
    ...initState,
    setGame: (game: GameType) => set(() => ({ game: game })),
    setRounds: (rounds: RoundsType) => set(() => ({ rounds: rounds })),
    setScoreSheet: (scoreSheet: ScoreSheetType) =>
      set(() => ({ scoresheet: scoreSheet })),
    setIsOpen: (isOpen: boolean) => set(() => ({ isOpen: isOpen })),
    setMoreOptions: (moreOptions: boolean) =>
      set(() => ({ moreOptions: moreOptions })),
    reset: () => set(defaultInitState),
  }));
};
