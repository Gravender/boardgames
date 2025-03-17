"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import type { RouterOutputs } from "@board-games/api";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import { CardFooter } from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
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

import { Spinner } from "~/components/spinner";
import { useAddMatchStore } from "~/providers/add-match-provider";
import { playersSchema } from "~/stores/add-match-store";

const formSchema = z.object({
  players: playersSchema,
});
type formSchemaType = z.infer<typeof formSchema>;
export default function SelectPlayersForm({
  players,
  gameId,
}: {
  players: RouterOutputs["player"]["getPlayersByGame"];
  gameId: number;
}) {
  const router = useRouter();

  const { match, setPlayers, setIsOpen } = useAddMatchStore((state) => state);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: { players: match.players },
  });
  const onBack = () => {
    router.push(`/dashboard/games/${gameId}`);
  };
  const onSubmit = (data: formSchemaType) => {
    setIsSubmitting(true);
    setPlayers(data.players);
    setIsOpen(true);
    onBack();
  };
  const { update, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="players"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="hidden">Players</FormLabel>
                    <FormDescription className="hidden">
                      Select the players for the match
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-[65dvh] pt-0 sm:h-[75dvh] sm:p-6">
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
                                        ? append({ ...player, team: null })
                                        : remove(
                                            field.value.findIndex(
                                              (i) => i.id === player.id,
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
                                        src={player.imageUrl}
                                        alt={player.name}
                                      />
                                      <AvatarFallback className="bg-slate-300">
                                        <User />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold sm:text-lg">
                                      {player.name}
                                    </span>
                                  </div>
                                  {field.value.findIndex(
                                    (i) => i.id === player.id,
                                  ) > -1 && (
                                    <div className="flex gap-1 sm:gap-2">
                                      {Array.from({ length: 6 }).map(
                                        (_, index) => (
                                          <Button
                                            key={index}
                                            className="size-8 rounded-sm text-xs sm:size-10"
                                            variant={
                                              field.value.find(
                                                (i) => i.id === player.id,
                                              )?.team ===
                                              index + 1
                                                ? "default"
                                                : "secondary"
                                            }
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const foundPlayer =
                                                field.value.find(
                                                  (i) => i.id === player.id,
                                                );
                                              if (foundPlayer) {
                                                if (
                                                  foundPlayer.team ===
                                                  index + 1
                                                ) {
                                                  foundPlayer.team = null;
                                                } else {
                                                  foundPlayer.team = index + 1;
                                                }

                                                update(
                                                  field.value.findIndex(
                                                    (i) => i.id === player.id,
                                                  ),
                                                  foundPlayer,
                                                );
                                              }
                                            }}
                                          >
                                            {index + 1}
                                          </Button>
                                        ),
                                      )}
                                    </div>
                                  )}
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

            <CardFooter className="gap-2 pt-2">
              <Button type="reset" variant="secondary" onClick={() => onBack()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </div>
    </div>
  );
}
