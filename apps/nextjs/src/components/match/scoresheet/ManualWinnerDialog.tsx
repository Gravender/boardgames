import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { imageSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@board-games/ui/form";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";

const playerSchema = z.object({
  id: z.number(),
  name: z.string(),
  image: imageSchema.nullable(),
  score: z.number().nullable(),
  teamId: z.number().nullable(),
});
export const ManualWinnerPlayerSchema = z.array(playerSchema);
type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
type Scoresheet = Match["scoresheet"];
export function ManualWinnerDialog({
  isOpen,
  setIsOpen,
  gameId,
  matchId,
  teams,
  players,
  scoresheet,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  gameId: Match["gameId"];
  matchId: Match["id"];
  teams: { id: number; name: string }[];
  players: z.infer<typeof ManualWinnerPlayerSchema>;
  scoresheet: Scoresheet;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <Content
          setIsOpen={setIsOpen}
          players={players}
          matchId={matchId}
          gameId={gameId}
          teams={teams}
          scoresheet={scoresheet}
        />
      </DialogContent>
    </Dialog>
  );
}

function Content({
  players,
  gameId,
  matchId,
  teams,
  scoresheet,
}: {
  gameId: Match["gameId"];
  matchId: Match["id"];
  setIsOpen: (isOpen: boolean) => void;

  teams: { id: number; name: string }[];
  players: z.infer<typeof ManualWinnerPlayerSchema>;
  scoresheet: Scoresheet;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const updateWinner = useMutation(
    trpc.match.updateMatchManualWinner.mutationOptions({
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
          type: "manual",
        });

        router.push(`/dashboard/games/${gameId}/${matchId}/summary`);
      },
      onError: (error) => {
        posthog.capture("manual winner update error", { error });
        toast.error("Error", {
          description: "There was a problem updating your Match winners.",
        });
      },
    }),
  );
  const FormSchema = z.object({
    players: scoresheet.isCoop
      ? z.array(playerSchema)
      : z.array(playerSchema).min(1),
  });
  const form = useForm({
    schema: FormSchema,
    defaultValues: { players: [] },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateWinner.mutate({
      matchId: matchId,
      winners: values.players.map((player) => ({ id: player.id })),
    });
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Winners</DialogTitle>
      </DialogHeader>
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
                    Select Winners
                  </FormDescription>
                </div>
                <ScrollArea className="h-96">
                  <div className="flex flex-col gap-2 rounded-lg">
                    {teams.map((team) => {
                      const teamPlayers = players.filter(
                        (player) => player.teamId === team.id,
                      );
                      const [firstTeamPlayer] = teamPlayers;
                      if (firstTeamPlayer === undefined) return null;
                      return (
                        <FormField
                          key={firstTeamPlayer.id}
                          control={form.control}
                          name="players"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={firstTeamPlayer.id}
                                className={cn(
                                  "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-2",
                                  field.value.findIndex(
                                    (i) => i.id === firstTeamPlayer.id,
                                  ) > -1
                                    ? "bg-violet-400"
                                    : "bg-border",
                                )}
                              >
                                <FormControl>
                                  <Checkbox
                                    className="hidden"
                                    checked={
                                      field.value.findIndex(
                                        (i) => i.teamId === team.id,
                                      ) > -1
                                    }
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            ...teamPlayers,
                                          ])
                                        : field.onChange(
                                            field.value.filter(
                                              (value) =>
                                                value.teamId !== team.id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="flex w-full items-center justify-between gap-2 text-sm font-normal">
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
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      );
                    })}
                    {players
                      .filter((player) => player.teamId === null)
                      .map((player) => (
                        <FormField
                          key={player.id}
                          control={form.control}
                          name="players"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={player.id}
                                className={cn(
                                  "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-2",
                                  field.value.findIndex(
                                    (i) => i.id === player.id,
                                  ) > -1
                                    ? "bg-violet-400"
                                    : "bg-border",
                                )}
                              >
                                <FormControl>
                                  <Checkbox
                                    className="hidden"
                                    checked={
                                      field.value.findIndex(
                                        (i) => i.id === player.id,
                                      ) > -1
                                    }
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            player,
                                          ])
                                        : field.onChange(
                                            field.value.filter(
                                              (value) => value.id !== player.id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="flex w-full items-center justify-between gap-2 text-sm font-normal">
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
                                    {player.score
                                      ? `Score: ${player.score}`
                                      : ""}
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                  </div>
                </ScrollArea>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="flex w-full justify-between gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => form.reset()}
              >
                Clear
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => form.setValue("players", players)}
              >
                Select All
              </Button>
            </div>
            <Button type="submit">Ok</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
