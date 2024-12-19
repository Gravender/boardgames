"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";

import {
  createEditGameStore,
  type EditGameStore,
} from "~/stores/edit-game-store";

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
