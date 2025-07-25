"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { insertPlayerSchema } from "@board-games/db/zodSchema";
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
  useForm,
} from "@board-games/ui/form";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useAddGroupStore } from "~/providers/add-group-provider";

const playersSchema = z
  .array(
    insertPlayerSchema
      .pick({ name: true, id: true })
      .required({ name: true, id: true })
      .extend({
        imageUrl: z.string().nullable(),
        matches: z.number(),
        team: z.number().nullable(),
      }),
  )
  .refine((players) => players.length > 0, {
    message: "You must add at least one player",
  });
const formSchema = z.object({
  players: playersSchema,
});
type formSchemaType = z.infer<typeof formSchema>;
export default function SelectPlayersForm({
  players,
}: {
  players: RouterOutputs["player"]["getPlayers"];
}) {
  const router = useRouter();

  const { group, setPlayers, setIsOpen } = useAddGroupStore((state) => state);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    schema: formSchema,
    defaultValues: { players: group.players },
  });
  const onBack = () => {
    router.push(`/dashboard/groups`);
  };
  const onSubmit = (data: formSchemaType) => {
    setIsSubmitting(true);
    setPlayers(data.players);
    setIsOpen(true);
    onBack();
  };

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
                  <ScrollArea className="h-[65dvh] p-6 pt-0 sm:h-[75dvh]">
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

                                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-background">
                                    {player.matches}
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

            <CardFooter className="gap-2">
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
