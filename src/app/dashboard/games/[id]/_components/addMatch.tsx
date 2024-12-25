"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { useAddMatchStore } from "~/providers/add-match-provider";
import { matchSchema, playersSchema } from "~/stores/add-match-store";
import { api, type RouterOutputs } from "~/trpc/react";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;

export function AddMatchDialog({
  gameId,
  gameName,
  matches,
}: {
  gameId: Game["id"];
  gameName: Game["name"];
  matches: number;
}) {
  const { isOpen, setIsOpen } = useAddMatchStore((state) => state);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <Content gameId={gameId} gameName={gameName} matches={matches} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end p-4">
          <Button
            variant="default"
            className="rounded-full"
            size="icon"
            type="button"
            onClick={() => setIsOpen(true)}
          >
            <Plus />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
const formSchema = matchSchema.extend({ players: playersSchema });
type formSchemaType = z.infer<typeof formSchema>;
function Content({
  matches,
  gameId,
  gameName,
}: {
  gameId: Game["id"];
  gameName: Game["name"];
  matches: number;
}) {
  const { isOpen, match, setMatch, reset } = useAddMatchStore((state) => state);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingPlayers, setIsGettingPlayers] = useState(false);
  const utils = api.useUtils();
  const router = useRouter();
  router.prefetch(`/dashboard/games/${gameId}/add/players`);
  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: match.name !== "" ? match.name : `${gameName} #${matches + 1}`,
      date: match.name !== "" ? match.date : new Date(),
      players: match.players,
    },
  });
  const createMatch = api.match.createMatch.useMutation({
    onSuccess: async (match) => {
      reset();
      await utils.player.getPlayersByGame.invalidate({ game: { id: gameId } });
      await utils.game.getGame.invalidate({ id: gameId });
      await utils.dashboard.invalidate();
      router.push(`/dashboard/games/${gameId}/${match.id}`);
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    return () => {
      if (!isOpen) {
        reset();
      }
    };
  });

  const onSubmit = async (values: formSchemaType) => {
    setIsSubmitting(true);
    createMatch.mutate({
      gameId: gameId,
      name: values.name,
      date: values.date,
      players: values.players,
    });
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Match</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Name</FormLabel>
                <FormControl>
                  <Input placeholder="Match name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                        type="button"
                      >
                        {field.value ? (
                          isSameDay(field.value, new Date()) ? (
                            <span>Today</span>
                          ) : (
                            format(field.value, "PPP")
                          )
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="players"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="hidden">Players</FormLabel>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isGettingPlayers}
                  onClick={() => {
                    setIsGettingPlayers(true);
                    setMatch({
                      name: form.getValues("name"),
                      date: form.getValues("date"),
                    });
                    router.push(`/dashboard/games/${gameId}/add/players`);
                  }}
                >
                  {isGettingPlayers ? (
                    <>
                      <Spinner />
                      <span>Navigating...</span>
                    </>
                  ) : (
                    `${form.getValues("players").length} Players`
                  )}
                </Button>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => {
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isGettingPlayers}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  <span>Submitting...</span>
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
