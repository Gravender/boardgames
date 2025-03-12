"use client";

/* eslint-disable react-compiler/react-compiler */
import type { ReactNode } from "react";
import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import type { AddGroupStore } from "~/stores/add-group-store";
import { createAddGroupStore } from "~/stores/add-group-store";

export type AddGroupStoreApi = ReturnType<typeof createAddGroupStore>;

export const AddGroupStoreContext = createContext<AddGroupStoreApi | undefined>(
  undefined,
);

export interface AddGroupStoreProviderProps {
  children: ReactNode;
}

export const AddGroupStoreProvider = ({
  children,
}: AddGroupStoreProviderProps) => {
  const storeRef = useRef<AddGroupStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createAddGroupStore();
  }

  return (
    <AddGroupStoreContext.Provider value={storeRef.current}>
      {children}
    </AddGroupStoreContext.Provider>
  );
};

export const useAddGroupStore = <T,>(
  selector: (store: AddGroupStore) => T,
): T => {
  const addGroupStoreContext = useContext(AddGroupStoreContext);

  if (!addGroupStoreContext) {
    throw new Error(
      `useAddGroupStore must be used within AddGroupStoreProvider`,
    );
  }

  return useStore(addGroupStoreContext, selector);
};
