"use client";

import { Button } from "@board-games/ui/button";

import { api } from "~/trpc/react";

export function UpdateAllMatchesPlacement() {
  const updateAllMatchPlacements =
    api.match.updateAllMatchPlacements.useMutation();

  return (
    <div>
      <Button onClick={() => updateAllMatchPlacements.mutate()}>
        Update All Matches
      </Button>
    </div>
  );
}
