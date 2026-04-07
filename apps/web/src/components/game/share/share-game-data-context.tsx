"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { GameData } from "./types";

const ShareGameDataContext = createContext<GameData | null>(null);

export const ShareGameDataProvider = ({
  gameData,
  children,
}: {
  gameData: GameData;
  children: ReactNode;
}) => (
  <ShareGameDataContext.Provider value={gameData}>
    {children}
  </ShareGameDataContext.Provider>
);

export const useShareGameData = (): GameData => {
  const value = useContext(ShareGameDataContext);
  if (!value) {
    throw new Error(
      "useShareGameData must be used within ShareGameDataProvider",
    );
  }
  return value;
};
