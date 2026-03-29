"use client";

import { Users } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { calculatePlacement, imageSchema } from "@board-games/shared";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@board-games/ui/alert-dialog";
import { Button } from "@board-games/ui/button";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import type { GameAndMatchInput } from "../types/input";
import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useUpdateMatchPlacementsMutation } from "~/hooks/mutations/match/scoresheet";
import { usePlayersAndTeams } from "~/hooks/queries/match/match";

export const TieBreakerPlayerSchema = z
  .array(
    z.object({
      matchPlayerId: z.number(),
      name: z.string(),
      image: imageSchema.nullable(),
      score: z.number().nullable(),
      placement: z.number().min(1),
      teamId: z.number().nullable(),
    }),
  )
  .min(1);
type Scoresheet = RouterOutputs["match"]["getMatchScoresheet"];
export function TieBreakerDialog({
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

  const playersPlacement = calculatePlacement(
    players.map((player) => ({
      id: player.baseMatchPlayerId,
      rounds: player.rounds.map((round) => ({
        score: round.score,
      })),
      teamId: player.teamId,
    })),

    scoresheet,
  );
  const mappedPlayers: z.infer<typeof TieBreakerPlayerSchema> = players.map(
    (p) => {
      const foundPlayer = playersPlacement.find(
        (playerPlacement) => p.baseMatchPlayerId === playerPlacement.id,
      );
      if (!foundPlayer) {
        return {
          matchPlayerId: p.baseMatchPlayerId,
          name: p.name,
          image: p.image,
          score: p.score,
          teamId: p.teamId,
          placement: players.length,
        };
      }

      return {
        matchPlayerId: p.baseMatchPlayerId,
        name: p.name,
        image: p.image,
        placement: foundPlayer.placement,
        score: foundPlayer.score,
        teamId: p.teamId,
      };
    },
  );
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpenAction}>
      <AlertDialogContent>
        <Content
          players={mappedPlayers}
          teams={teams}
          gameAndMatch={gameAndMatch}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

const FormSchema = z.object({
  players: TieBreakerPlayerSchema,
});
function Content({
  players,
  teams,
  gameAndMatch,
}: {
  gameAndMatch: GameAndMatchInput;
  teams: { id: number; name: string }[];
  players: z.infer<typeof TieBreakerPlayerSchema>;
}) {
  const { updateMatchPlacementsMutation } = useUpdateMatchPlacementsMutation(
    gameAndMatch.match,
  );

  const form = useAppForm({
    defaultValues: { players: players },
    validators: {
      onSubmit: FormSchema,
    },
    onSubmit: ({ value }) => {
      updateMatchPlacementsMutation.mutate({
        match: gameAndMatch.match,
        playersPlacement: value.players.map((player) => ({
          id: player.matchPlayerId,
          placement: player.placement,
        })),
      });
    },
  });
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Tie Breaker</AlertDialogTitle>
        <AlertDialogDescription>
          Select the placement for each player
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.Subscribe selector={(state) => state.values.players}>
          {(fields) => (
            <form.AppField name="players" mode="array">
              {(field) => {
                const indexes = new Map<number, number>(
                  fields.map((player, index) => [player.matchPlayerId, index]),
                );
                const countPlacement = (placement: number) => {
                  const count = fields
                    .toSorted((a, b) => {
                      if (a.placement === b.placement) {
                        return a.name.localeCompare(b.name);
                      } else {
                        return a.placement - b.placement;
                      }
                    })
                    .reduce((acc, curr) => {
                      if (
                        curr.teamId === null &&
                        curr.placement === placement
                      ) {
                        acc++;
                      }
                      return acc;
                    }, 0);
                  return (
                    count +
                    new Set(
                      fields
                        .filter(
                          (player) =>
                            player.teamId !== null &&
                            player.placement === placement,
                        )
                        .map((score) => score.teamId ?? 0),
                    ).size
                  );
                };
                const uniqueInOrderPlacements = () => {
                  const uniqueTeams = Array.from(
                    new Set(
                      fields
                        .filter((player) => player.teamId !== null)
                        .map((score) => score.teamId ?? 0),
                    ),
                  ).map((teamId) => {
                    const findFirstPlayer = fields.find(
                      (player) => player.teamId === teamId,
                    );
                    const findTeam = teams.find((team) => team.id === teamId);
                    return {
                      teamId: teamId,
                      placement:
                        findFirstPlayer?.placement != null &&
                        findFirstPlayer.placement >= 1
                          ? findFirstPlayer.placement
                          : 1,
                      name: findTeam?.name ?? "",
                      id: findTeam?.id,
                      image: findFirstPlayer?.image ?? null,
                      score: findFirstPlayer?.score ?? 0,
                      matchPlayerId: findFirstPlayer?.matchPlayerId ?? 0,
                    };
                  });
                  const playersWithoutTeams = fields.filter(
                    (player) => player.teamId === null,
                  );
                  return [...uniqueTeams, ...playersWithoutTeams].toSorted(
                    (a, b) => {
                      if (a.placement === b.placement) {
                        return a.name.localeCompare(b.name);
                      } else {
                        return a.placement - b.placement;
                      }
                    },
                  );
                };
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const placements = uniqueInOrderPlacements();
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel className="hidden">Players</FieldLabel>
                    <ScrollArea className="h-96">
                      <div className="flex flex-col gap-2 rounded-lg">
                        {placements.map((player, index) => {
                          const numberPlacements = countPlacement(
                            player.placement,
                          );
                          if (
                            player.teamId !== null &&
                            index > 0 &&
                            placements
                              .slice(0, index)
                              .find(
                                (prevPlayer) =>
                                  prevPlayer.teamId === player.teamId,
                              )
                          ) {
                            return null;
                          }
                          return (
                            <div
                              key={`${player.teamId ?? "player"}-${player.matchPlayerId}`}
                              className={cn(
                                "flex flex-row items-center space-y-0 space-x-3 rounded-sm p-2",
                                numberPlacements > 1
                                  ? "bg-destructive/50"
                                  : "bg-border",
                              )}
                            >
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="flex w-full items-center justify-between gap-2 text-sm font-normal">
                                    <div className="flex items-center gap-2">
                                      <div className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-10 items-center justify-center rounded-md text-sm font-medium">
                                        {player.placement}
                                      </div>
                                      {player.teamId === null ? (
                                        <>
                                          <PlayerImage
                                            image={player.image}
                                            alt={player.name}
                                          />
                                          <span className="text-lg font-semibold">
                                            {player.name}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                                            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-300">
                                              <Users />
                                            </div>
                                          </div>
                                          <span className="text-lg font-semibold">
                                            {`Team: ${
                                              teams.find(
                                                (team) =>
                                                  team.id === player.teamId,
                                              )?.name
                                            }`}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex w-20 items-center justify-start font-semibold">
                                      {player.score ?? ""}
                                    </div>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <Field>
                                    <FieldLabel>Placement</FieldLabel>
                                    <Input
                                      value={player.placement}
                                      onChange={(e) => {
                                        const newPlacement = parseInt(
                                          e.target.value,
                                        );

                                        if (
                                          Number.isNaN(newPlacement) ||
                                          newPlacement < 1 ||
                                          newPlacement > players.length
                                        ) {
                                          return;
                                        }

                                        if (player.teamId === null) {
                                          const playerIndex = indexes.get(
                                            player.matchPlayerId,
                                          );
                                          if (playerIndex === undefined) return;
                                          const nextPlayers = [...fields];
                                          const existingPlayer =
                                            nextPlayers[playerIndex];
                                          if (!existingPlayer) return;
                                          nextPlayers[playerIndex] = {
                                            matchPlayerId:
                                              existingPlayer.matchPlayerId,
                                            name: existingPlayer.name,
                                            image: existingPlayer.image,
                                            score: existingPlayer.score,
                                            teamId: existingPlayer.teamId,
                                            placement: newPlacement,
                                          };
                                          form.setFieldValue(
                                            "players",
                                            nextPlayers,
                                          );
                                          return;
                                        }

                                        form.setFieldValue(
                                          "players",
                                          fields.map((tempPlayer) =>
                                            tempPlayer.teamId === player.teamId
                                              ? {
                                                  matchPlayerId:
                                                    tempPlayer.matchPlayerId,
                                                  name: tempPlayer.name,
                                                  image: tempPlayer.image,
                                                  score: tempPlayer.score,
                                                  teamId: tempPlayer.teamId,
                                                  placement: newPlacement,
                                                }
                                              : tempPlayer,
                                          ),
                                        );
                                      }}
                                      type="number"
                                      className="border-none text-center"
                                      max={players.length}
                                      inputMode="numeric"
                                    />
                                  </Field>
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.AppField>
          )}
        </form.Subscribe>
        <AlertDialogFooter>
          <Button
            type="submit"
            disabled={updateMatchPlacementsMutation.isPending}
          >
            {updateMatchPlacementsMutation.isPending ? (
              <>
                <Spinner />
                <span>Finishing...</span>
              </>
            ) : (
              "Finish"
            )}
          </Button>
        </AlertDialogFooter>
      </form>
    </>
  );
}
