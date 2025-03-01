import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@board-games/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { api } from "~/trpc/react";

export const TieBreakerPlayerSchema = z
  .array(
    z.object({
      matchPlayerId: z.number(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      score: z.number(),
      placement: z.number().min(1),
    }),
  )
  .min(1);
export function TieBreakerDialog({
  isOpen,
  setIsOpen,
  players,
  gameId,
  matchId,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  gameId: number;
  matchId: number;
  players: z.infer<typeof TieBreakerPlayerSchema>;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <Content
          setIsOpen={setIsOpen}
          players={players}
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
  gameId,
  matchId,
}: {
  gameId: number;
  matchId: number;
  setIsOpen: (isOpen: boolean) => void;
  players: z.infer<typeof TieBreakerPlayerSchema>;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const updateMatchPlacement = api.match.updateMatchPlacement.useMutation({
    onSuccess: async () => {
      await utils.match.getMatch.invalidate({ id: matchId });
      await utils.game.getGame.invalidate({ id: gameId });

      router.push(`/dashboard/games/${gameId}/${matchId}/summary`);
    },
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { players: players },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateMatchPlacement.mutate({
      match: { id: matchId },
      playersPlacement: values.players.map((player) => ({
        id: player.matchPlayerId,
        placement: player.placement,
      })),
    });
  }

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "players",
  });
  const indexes: Map<number, number> = new Map(
    fields.map((player, index) => [player.matchPlayerId, index]),
  );

  function countPlacement(placement: number) {
    let count = 0;
    fields.forEach((player) => {
      if (player.placement === placement) count++;
    });
    return count;
  }
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
                    {fields
                      .toSorted((a, b) => {
                        if (a.placement === b.placement) {
                          return a.name.localeCompare(b.name);
                        } else {
                          return a.placement - b.placement;
                        }
                      })
                      .map((player) => (
                        <div
                          key={player.id}
                          className={cn(
                            "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-2",
                            countPlacement(player.placement) > 1
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
                                  {player.score}
                                </div>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent>
                              <FormField
                                control={form.control}
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

                                          console.log(player);

                                          update(
                                            indexes.get(player.matchPlayerId)!,
                                            {
                                              ...player,
                                              placement: newPlacement,
                                            },
                                          );
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
                      ))}
                  </div>
                </ScrollArea>
                <FormMessage />
              </FormItem>
            )}
          />
          <AlertDialogFooter>
            <Button type="submit">Finish</Button>
          </AlertDialogFooter>
        </form>
      </Form>
    </>
  );
}
