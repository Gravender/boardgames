import { useRouter } from "next/navigation";
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
import { cn } from "@board-games/ui/utils";

import type { GameAndMatchInput } from "../types/input";
import { PlayerImage } from "~/components/player-image";
import { formatMatchLink } from "~/utils/linkFormatting";
import { useUpdateMatchManualWinnerMutation } from "../hooks/scoresheet";
import { usePlayersAndTeams } from "../hooks/suspenseQueries";

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
  setIsOpen,
  gameAndMatch,
  scoresheet,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <Content
          setIsOpen={setIsOpen}
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
  setIsOpen,
  players,
  gameAndMatch,
  teams,
  scoresheet,
}: {
  gameAndMatch: GameAndMatchInput;
  setIsOpen: (isOpen: boolean) => void;

  teams: { id: number; name: string }[];
  players: z.infer<typeof ManualWinnerPlayerSchema>;
  scoresheet: Scoresheet;
}) {
  const router = useRouter();
  const { updateMatchManualWinnerMutation } =
    useUpdateMatchManualWinnerMutation(gameAndMatch.match);

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
    updateMatchManualWinnerMutation.mutate(
      {
        match: gameAndMatch.match,
        winners: values.players.map((player) => ({ id: player.id })),
      },
      {
        onSuccess: () => {
          router.push(
            formatMatchLink(
              gameAndMatch.type === "shared"
                ? {
                    sharedMatchId: gameAndMatch.match.sharedMatchId,
                    sharedGameId: gameAndMatch.game.sharedGameId,
                    type: gameAndMatch.game.type,
                    linkedGameId: gameAndMatch.game.linkedGameId,
                    finished: true,
                  }
                : {
                    matchId: gameAndMatch.match.id,
                    gameId: gameAndMatch.game.id,
                    type: gameAndMatch.game.type,
                    finished: true,
                  },
            ),
          );
        },
      },
    );
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
                                  "flex flex-row items-center space-y-0 space-x-3 rounded-sm p-2",
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
                                  "flex flex-row items-center space-y-0 space-x-3 rounded-sm p-2",
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
                onClick={() => {
                  form.reset();
                  setIsOpen(false);
                }}
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
