"use client";

/* eslint-disable react-compiler/react-compiler */
import type { ReactNode } from "react";
import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import type { AddMatchStore } from "~/stores/add-match-store";
import { createAddMatchStore } from "~/stores/add-match-store";

export type AddMatchStoreApi = ReturnType<typeof createAddMatchStore>;

export const AddMatchStoreContext = createContext<AddMatchStoreApi | undefined>(
  undefined,
);

export interface AddMatchStoreProviderProps {
  children: ReactNode;
}

export const AddMatchStoreProvider = ({
  children,
}: AddMatchStoreProviderProps) => {
  const storeRef = useRef<AddMatchStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createAddMatchStore();
  }

  return (
    <AddMatchStoreContext.Provider value={storeRef.current}>
      {children}
    </AddMatchStoreContext.Provider>
  );
};

export const useAddMatchStore = <T,>(
  selector: (store: AddMatchStore) => T,
): T => {
  const addMatchStoreContext = useContext(AddMatchStoreContext);

  if (!addMatchStoreContext) {
    throw new Error(
      `useAddMatchStore must be used within AddMatchStoreProvider`,
    );
  }

  return useStore(addMatchStoreContext, selector);
};
