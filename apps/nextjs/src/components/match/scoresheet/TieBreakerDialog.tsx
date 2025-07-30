import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { z } from "zod/v4";

import { imageSchema } from "@board-games/shared";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@board-games/ui/alert-dialog";
import { Button } from "@board-games/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

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
export function TieBreakerDialog({
  isOpen,
  setIsOpen,
  players,
  teams,
  gameId,
  matchId,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  gameId: number;
  matchId: number;

  teams: { id: number; name: string }[];
  players: z.infer<typeof TieBreakerPlayerSchema>;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <Content
          setIsOpen={setIsOpen}
          players={players}
          teams={teams}
          matchId={matchId}
          gameId={gameId}
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
  gameId,
  matchId,
}: {
  gameId: number;
  matchId: number;
  setIsOpen: (isOpen: boolean) => void;
  teams: { id: number; name: string }[];
  players: z.infer<typeof TieBreakerPlayerSchema>;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const updateMatchPlacement = useMutation(
    trpc.match.updateMatchPlacement.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.match.getMatch.queryOptions({ id: matchId }),
          ),
          queryClient.invalidateQueries(
            trpc.game.getGame.queryOptions({ id: gameId }),
          ),
        ]);
        posthog.capture("match finished", {
          gameId: gameId,
          matchId: matchId,
          type: "tiebreaker",
        });

        router.push(`/dashboard/games/${gameId}/${matchId}/summary`);
      },
      onError: (error) => {
        posthog.capture("match placement update error", { error });
        toast.error("Error", {
          description: "There was a problem updating your Match placement.",
        });
      },
    }),
  );
  const form = useForm({
    schema: FormSchema,
    defaultValues: { players: players },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateMatchPlacement.mutate({
      match: { id: matchId },
      playersPlacement: values.players.map((player) => ({
        id: player.matchPlayerId,
        placement: player.placement,
        score: player.score,
      })),
    });
  }

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "players",
  });
  const indexes = new Map<number, number>(
    fields.map((player, index) => [player.matchPlayerId, index]),
  );
  function countPlacement(placement: number) {
    const count = fields
      .toSorted((a, b) => {
        if (a.placement === b.placement) {
          return a.name.localeCompare(b.name);
        } else {
          return a.placement - b.placement;
        }
      })
      .reduce((acc, curr) => {
        if (curr.teamId === null && curr.placement === placement) {
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
              player.teamId !== null && player.placement === placement,
          )
          .map((score) => score.teamId ?? 0),
      ).size
    );
  }
  const uniqueInOrderPlacements = () => {
    const uniqueTeams = Array.from(
      new Set(
        fields
          .filter((player) => player.teamId !== null)
          .map((score) => score.teamId ?? 0),
      ),
    ).map((teamId) => {
      const findFirstPlayer = fields.find((player) => player.teamId === teamId);
      const findTeam = teams.find((team) => team.id === teamId);
      return {
        teamId: teamId,
        placement: findFirstPlayer?.placement ?? 0,
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
    return [...uniqueTeams, ...playersWithoutTeams].toSorted((a, b) => {
      if (a.placement === b.placement) {
        return a.name.localeCompare(b.name);
      } else {
        return a.placement - b.placement;
      }
    });
  };
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Tie Breaker</AlertDialogTitle>
        <AlertDialogDescription>
          Select the placement for each player
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <FormField
            control={form.control}
            name="players"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="hidden">Players</FormLabel>
                  <FormDescription className="hidden">
                    Select Placement
                  </FormDescription>
                </div>
                <ScrollArea className="h-96">
                  <div className="flex flex-col gap-2 rounded-lg">
                    {uniqueInOrderPlacements().map((player, index) => {
                      const numberPlacements = countPlacement(player.placement);
                      if (
                        player.teamId !== null &&
                        index > 0 &&
                        uniqueInOrderPlacements()
                          .slice(0, index)
                          .find(
                            (prevPlayer) => prevPlayer.teamId === player.teamId,
                          )
                      ) {
                        return null;
                      }
                      return (
                        <div
                          key={`${player.id}-${player.matchPlayerId}`}
                          className={cn(
                            "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-2",
                            numberPlacements > 1
                              ? "bg-destructive/50"
                              : "bg-border",
                          )}
                        >
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex w-full items-center justify-between gap-2 text-sm font-normal">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
                                            (team) => team.id === player.teamId,
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
                              <FormField
                                control={form.control}
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                name={`players.${indexes.get(player.matchPlayerId)!}.placement`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Placement</FormLabel>

                                    <FormControl>
                                      <Input
                                        value={field.value}
                                        onChange={(e) => {
                                          const newPlacement = parseInt(
                                            e.target.value,
                                          );

                                          if (
                                            !newPlacement ||
                                            newPlacement < 1 ||
                                            newPlacement > players.length
                                          )
                                            return;

                                          if (player.teamId === null) {
                                            update(
                                              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                              indexes.get(
                                                player.matchPlayerId,
                                              )!,
                                              {
                                                ...player,
                                                placement: newPlacement,
                                              },
                                            );
                                          } else {
                                            const tempPlayers =
                                              form.getValues("players");
                                            for (const tempPlayer of tempPlayers) {
                                              if (
                                                player.teamId ===
                                                tempPlayer.teamId
                                              )
                                                tempPlayer.placement =
                                                  newPlacement;
                                            }
                                            form.setValue(
                                              "players",
                                              tempPlayers,
                                            );
                                          }
                                        }}
                                        type="number"
                                        className="border-none text-center"
                                        max={players.length}
                                      />
                                    </FormControl>

                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <FormMessage />
              </FormItem>
            )}
          />
          <AlertDialogFooter>
            <Button type="submit" disabled={updateMatchPlacement.isPending}>
              {updateMatchPlacement.isPending ? (
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
      </Form>
    </>
  );
}
