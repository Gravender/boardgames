"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { RouterOutputs } from "@board-games/api";

import { usePlayerInsightsHeroData } from "~/hooks/queries/player/player-insights";

import type { PlayerInsightsPageInput } from "./player-insights-types";

type PlayerInsightsPageData = {
  header: RouterOutputs["newPlayer"]["stats"]["getPlayerHeader"];
  summary: RouterOutputs["newPlayer"]["stats"]["getPlayerSummary"];
};

const PlayerInsightsDataContext = createContext<PlayerInsightsPageData | null>(
  null,
);

export const PlayerInsightsDataProvider = ({
  playerInput,
  children,
}: {
  playerInput: PlayerInsightsPageInput;
  children: ReactNode;
}) => {
  const { header, summary } = usePlayerInsightsHeroData(playerInput);
  return (
    <PlayerInsightsDataContext.Provider value={{ header, summary }}>
      {children}
    </PlayerInsightsDataContext.Provider>
  );
};

export const usePlayerInsightsPageData = (): PlayerInsightsPageData => {
  const ctx = useContext(PlayerInsightsDataContext);
  if (!ctx) {
    throw new Error(
      "usePlayerInsightsPageData must be used within PlayerInsightsDataProvider",
    );
  }
  return ctx;
};
