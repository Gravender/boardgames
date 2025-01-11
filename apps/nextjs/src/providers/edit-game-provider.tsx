"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import type { EditGameStore } from "~/stores/edit-game-store";
import { createEditGameStore } from "~/stores/edit-game-store";

export type EditGameStoreApi = ReturnType<typeof createEditGameStore>;

export const EditGameStoreContext = createContext<EditGameStoreApi | undefined>(
  undefined,
);

export interface EditGameStoreProviderProps {
  children: ReactNode;
}

export const EditGameStoreProvider = ({
  children,
}: EditGameStoreProviderProps) => {
  const storeRef = useRef<EditGameStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createEditGameStore();
  }

  return (
    <EditGameStoreContext.Provider value={storeRef.current}>
      {children}
    </EditGameStoreContext.Provider>
  );
};

export const useEditGameStore = <T,>(
  selector: (store: EditGameStore) => T,
): T => {
  const editGameStoreContext = useContext(EditGameStoreContext);

  if (!editGameStoreContext) {
    throw new Error(
      `useEditGameStore must be used within EditGameStoreProvider`,
    );
  }

  return useStore(editGameStoreContext, selector);
};
