"use client";

import { Users } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { calculateFinalScore, imageSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import { cn } from "@board-games/ui/utils";

import type { GameAndMatchInput } from "../types/input";
import { PlayerImage } from "~/components/player-image";
import { useAppForm } from "~/hooks/form";
import { useUpdateMatchManualWinnerMutation } from "~/hooks/mutations/match/scoresheet";
import { usePlayersAndTeams } from "~/hooks/queries/match/match";

const playerSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: imageSchema.nullable(),
  score: z.number().nullable(),
  teamId: z.number().nullable(),
});
export const ManualWinnerPlayerSchema = z.array(playerSchema);

type Scoresheet = RouterOutputs["match"]["getMatchScoresheet"];
export function ManualWinnerDialog({
  isOpen,
  setIsOpenAction,
  gameAndMatch,
  scoresheet,
}: {
  isOpen: boolean;
  setIsOpenAction: (isOpen: boolean) => void;
  gameAndMatch: GameAndMatchInput;
  scoresheet: Scoresheet;
}) {
  const { teams, players } = usePlayersAndTeams(gameAndMatch.match);

  const mappedPlayers = players.map((p) => ({
    id: p.baseMatchPlayerId,
    name: p.name,
    image: p.image,
    score: calculateFinalScore(
      p.rounds.map((round) => ({
        score: round.score,
      })),
      scoresheet,
    ),
    teamId: p.teamId,
  }));
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpenAction}>
      <DialogContent>
        <Content
          setIsOpenAction={setIsOpenAction}
          gameAndMatch={gameAndMatch}
          scoresheet={scoresheet}
          teams={teams}
          players={mappedPlayers}
        />
      </DialogContent>
    </Dialog>
  );
}

function Content({
  setIsOpenAction,
  players,
  gameAndMatch,
  teams,
  scoresheet,
}: {
  gameAndMatch: GameAndMatchInput;
  setIsOpenAction: (isOpen: boolean) => void;

  teams: { id: number; name: string }[];
  players: z.infer<typeof ManualWinnerPlayerSchema>;
  scoresheet: Scoresheet;
}) {
  const { updateMatchManualWinnerMutation } =
    useUpdateMatchManualWinnerMutation(gameAndMatch.match);

  const FormSchema = z.object({
    players: scoresheet.isCoop
      ? z.array(playerSchema)
      : z.array(playerSchema).min(1),
  });
  const form = useAppForm({
    defaultValues: { players: [] } as z.infer<typeof FormSchema>,
    validators: {
      onSubmit: FormSchema,
    },
    onSubmit: async ({ value }) => {
      updateMatchManualWinnerMutation.mutate({
        match: gameAndMatch.match,
        winners: value.players.map((player) => ({ id: player.id })),
      });
    },
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Winners</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.AppField name="players" mode="array">
          {(field) => {
            const selectedPlayers = field.state.value;
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel className="hidden">Players</FieldLabel>
                <div className="max-h-96 overflow-y-auto">
                  <div className="flex flex-col gap-2 rounded-lg">
                    {teams.map((team) => {
                      const teamPlayers = players.filter(
                        (player) => player.teamId === team.id,
                      );
                      const [firstTeamPlayer] = teamPlayers;
                      if (!firstTeamPlayer) return null;
                      const isSelected =
                        selectedPlayers.findIndex(
                          (player) => player.teamId === team.id,
                        ) > -1;
                      const handleToggleTeam = () => {
                        if (isSelected) {
                          form.setFieldValue(
                            "players",
                            selectedPlayers.filter(
                              (selectedPlayer) =>
                                selectedPlayer.teamId !== team.id,
                            ),
                          );
                          return;
                        }
                        form.setFieldValue("players", [
                          ...selectedPlayers.filter(
                            (selectedPlayer) =>
                              selectedPlayer.teamId !== team.id,
                          ),
                          ...teamPlayers,
                        ]);
                      };
                      const teamCheckboxId = `manual-winner-team-${team.id}`;
                      return (
                        <div
                          key={firstTeamPlayer.id}
                          className={cn(
                            "flex w-full flex-row items-center space-x-3 rounded-sm p-2 text-left",
                            isSelected ? "bg-violet-400" : "bg-border",
                          )}
                        >
                          <Checkbox
                            id={teamCheckboxId}
                            checked={isSelected}
                            onCheckedChange={handleToggleTeam}
                          />
                          <label
                            htmlFor={teamCheckboxId}
                            className="flex w-full cursor-pointer items-center justify-between gap-2 text-sm font-normal"
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-300">
                                  <Users />
                                </div>
                              </div>
                              <span className="text-lg font-semibold">
                                {`Team: ${team.name}`}
                              </span>
                            </div>

                            <div className="flex w-20 items-center justify-start font-semibold">
                              {firstTeamPlayer.score
                                ? `Score: ${firstTeamPlayer.score}`
                                : ""}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                    {players
                      .filter((player) => player.teamId === null)
                      .map((player) => {
                        const playerIndex = selectedPlayers.findIndex(
                          (selectedPlayer) => selectedPlayer.id === player.id,
                        );
                        const isSelected = playerIndex > -1;
                        const handleTogglePlayer = () => {
                          if (isSelected) {
                            field.removeValue(playerIndex);
                            return;
                          }
                          field.pushValue(player);
                        };
                        const playerCheckboxId = `manual-winner-player-${player.id}`;
                        return (
                          <div
                            key={player.id}
                            className={cn(
                              "flex w-full flex-row items-center space-x-3 rounded-sm p-2 text-left",
                              isSelected ? "bg-violet-400" : "bg-border",
                            )}
                          >
                            <Checkbox
                              id={playerCheckboxId}
                              checked={isSelected}
                              onCheckedChange={handleTogglePlayer}
                            />
                            <label
                              htmlFor={playerCheckboxId}
                              className="flex w-full cursor-pointer items-center justify-between gap-2 text-sm font-normal"
                            >
                              <div className="flex items-center gap-2">
                                <PlayerImage
                                  image={player.image}
                                  alt={player.name}
                                />
                                <span className="text-lg font-semibold">
                                  {player.name}
                                </span>
                              </div>

                              <div className="flex w-20 items-center justify-start font-semibold">
                                {player.score ? `Score: ${player.score}` : ""}
                              </div>
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.AppField>
        <DialogFooter className="flex w-full justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                form.setFieldValue("players", []);
                setIsOpenAction(false);
              }}
            >
              Clear
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => form.setFieldValue("players", players)}
            >
              Select All
            </Button>
          </div>
          <Button type="submit">Ok</Button>
        </DialogFooter>
      </form>
    </>
  );
}
