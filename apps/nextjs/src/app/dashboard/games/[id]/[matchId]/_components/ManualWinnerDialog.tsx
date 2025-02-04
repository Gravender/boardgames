import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
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
} from "@board-games/ui/form";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { api } from "~/trpc/react";

export const ManualWinnerPlayerSchema = z
  .array(
    z.object({
      id: z.number(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      score: z.number(),
    }),
  )
  .min(1);
export function ManualWinnerDialog({
  isOpen,
  setIsOpen,
  gameId,
  matchId,
  players,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  gameId: number;
  matchId: number;
  players: z.infer<typeof ManualWinnerPlayerSchema>;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <Content
          setIsOpen={setIsOpen}
          players={players}
          matchId={matchId}
          gameId={gameId}
        />
      </DialogContent>
    </Dialog>
  );
}
const FormSchema = z.object({
  players: ManualWinnerPlayerSchema,
});
function Content({
  players,
  gameId,
  matchId,
}: {
  gameId: number;
  matchId: number;
  setIsOpen: (isOpen: boolean) => void;
  players: z.infer<typeof ManualWinnerPlayerSchema>;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const updateWinner = api.match.updateMatchManualWinner.useMutation({
    onSuccess: async () => {
      await utils.match.getMatch.invalidate({ id: matchId });
      await utils.game.getGame.invalidate({ id: gameId });

      router.push(`/dashboard/games/${gameId}/${matchId}/summary`);
    },
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
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
                    {players.map((player) => (
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
                                      ? field.onChange([...field.value, player])
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
                                  <Avatar>
                                    <AvatarImage
                                      className="object-cover"
                                      src={player.imageUrl ?? ""}
                                      alt={player.name}
                                    />
                                    <AvatarFallback className="bg-slate-300">
                                      <User />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-lg font-semibold">
                                    {player.name}
                                  </span>
                                </div>

                                <div className="flex w-20 items-center justify-start font-semibold">
                                  {`Score: ${player.score}`}
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
