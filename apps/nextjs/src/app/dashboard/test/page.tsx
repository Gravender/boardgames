"use client";

import { useState } from "react";

import { Button } from "@board-games/ui/button";
import { Dialog } from "@board-games/ui/dialog";

import {
  CustomMatchSelection,
  PlayerSelector,
  QuickMatchSelection,
} from "~/components/match/add/player-selector";

export default function TestPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [mode, setMode] = useState<"select" | "quick" | "custom" | "match">(
    "select",
  );
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <Button onClick={() => setShowDialog(true)}>Open Dialog</Button>
      {mode === "select" && (
        <PlayerSelector
          playerCount={0}
          onCancel={() => setShowDialog(false)}
          setMode={setMode}
          setShowDialog={setShowDialog}
        />
      )}
      {mode === "quick" && (
        <QuickMatchSelection
          playerCount={0}
          onCancel={() => setShowDialog(false)}
          setMode={setMode}
          setShowDialog={setShowDialog}
        />
      )}
      {mode === "custom" && (
        <CustomMatchSelection
          playerCount={0}
          onCancel={() => setShowDialog(false)}
          setMode={setMode}
          setShowDialog={setShowDialog}
        />
      )}
    </Dialog>
  );
}
