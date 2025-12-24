"use client";

import { useGame } from "../hooks/game";
import { useGameRoles } from "../hooks/roles";
import { useGameScoreSheetsWithRounds } from "../hooks/scoresheets-with-rounds";
import { EditGameForm } from "./edit-game-form";

export function EditGameFormWithSuspense({
  game,
}: {
  game:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      };
}) {
  const { game: initialGame } = useGame(game);
  const { gameScoreSheetsWithRounds: initialScoresheets } =
    useGameScoreSheetsWithRounds(game);
  const { gameRoles: initialRoles } = useGameRoles(game);

  return (
    <EditGameForm
      initialGame={initialGame}
      initialScoresheets={initialScoresheets}
      initialRoles={initialRoles}
    />
  );
}
