import { z } from "zod/v4";
import { createStore } from "zustand/vanilla";

import {
  insertGroupSchema,
  insertPlayerSchema,
} from "@board-games/db/zodSchema";

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
export const groupSchema = insertGroupSchema
  .pick({
    name: true,
  })
  .required({ name: true });
export type Group = z.infer<typeof groupSchema>;
export const addGroupSchema = z.object({
  isOpen: z.boolean(),
  group: groupSchema.extend({ players: playersSchema }),
});

export type AddGroupState = z.infer<typeof addGroupSchema>;

export interface AddGroupActions {
  setIsOpen: (isOpen: boolean) => void;
  setGroup: (group: Group) => void;
  setPlayers: (players: Players) => void;
  reset: () => void;
}

export type AddGroupStore = AddGroupState & AddGroupActions;

export const defaultInitState: AddGroupState = {
  isOpen: false,
  group: {
    name: "",
    players: [],
  },
};
export const createAddGroupStore = (
  initState: AddGroupState = defaultInitState,
) => {
  return createStore<AddGroupStore>()((set) => ({
    ...initState,
    setIsOpen: (isOpen: boolean) => set(() => ({ isOpen: isOpen })),
    setGroup: (group: Group) =>
      set((state) => ({
        group: {
          ...state.group,
          ...group,
        },
      })),
    setPlayers: (players: Players) =>
      set((state) => ({ group: { ...state.group, players: players } })),
    reset: () => set(defaultInitState),
  }));
};
