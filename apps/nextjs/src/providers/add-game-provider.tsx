"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import type { AddGameStore } from "~/stores/add-game-store";
import { createAddGameStore } from "~/stores/add-game-store";

export type AddGameStoreApi = ReturnType<typeof createAddGameStore>;

export const AddGameStoreContext = createContext<AddGameStoreApi | undefined>(
  undefined,
);

export interface AddGameStoreProviderProps {
  children: ReactNode;
}

export const AddGameStoreProvider = ({
  children,
}: AddGameStoreProviderProps) => {
  const storeRef = useRef<AddGameStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createAddGameStore();
  }

  return (
    <AddGameStoreContext.Provider value={storeRef.current}>
      {children}
    </AddGameStoreContext.Provider>
  );
};

export const useAddGameStore = <T,>(
  selector: (store: AddGameStore) => T,
): T => {
  const addGameStoreContext = useContext(AddGameStoreContext);

  if (!addGameStoreContext) {
    throw new Error(`useAddGameStore must be used within AddGameStoreProvider`);
  }

  return useStore(addGameStoreContext, selector);
};
