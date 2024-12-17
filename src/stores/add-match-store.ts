import { z } from "zod";
import { createStore } from "zustand/vanilla";

import { insertMatchSchema, insertPlayerSchema } from "~/server/db/schema";

export const playersSchema = z
  .array(
    insertPlayerSchema
      .pick({ name: true, id: true })
      .required({ name: true, id: true })
      .extend({
        imageUrl: z.string().nullable(),
        matches: z.number(),
      }),
  )
  .refine((players) => players.length > 0, {
    message: "You must add at least one player",
  });
export type Players = z.infer<typeof playersSchema>;
export const matchSchema = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true });
export type Match = z.infer<typeof matchSchema>;
export const addMatchSchema = z.object({
  isOpen: z.boolean(),
  gameId: z.number(),
  match: matchSchema.extend({ players: playersSchema }),
});

export type AddMatchState = z.infer<typeof addMatchSchema>;

export type AddMatchActions = {
  setIsOpen: (isOpen: boolean) => void;
  setGameId: (gameId: number) => void;
  setMatch: (match: Match) => void;
  setPlayers: (players: Players) => void;
  reset: () => void;
};

export type AddMatchStore = AddMatchState & AddMatchActions;

export const defaultInitState: AddMatchState = {
  isOpen: false,
  gameId: 0,
  match: {
    name: "",
    date: new Date(),
    players: [],
  },
};
export const createAddMatchStore = (
  initState: AddMatchState = defaultInitState,
) => {
  return createStore<AddMatchStore>()((set) => ({
    ...initState,
    setIsOpen: (isOpen: boolean) => set(() => ({ isOpen: isOpen })),
    setGameId: (gameId: number) => set(() => ({ gameId: gameId })),
    setMatch: (match: Match) =>
      set((state) => ({
        match: {
          ...state.match,
          ...match,
        },
      })),
    setPlayers: (players: Players) =>
      set((state) => ({ match: { ...state.match, players: players } })),
    reset: () => set(defaultInitState),
  }));
};
