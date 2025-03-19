"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import { Spinner } from "~/components/spinner";
import { useAddMatchStore } from "~/providers/add-match-provider";
import {
  locationSchema,
  matchSchema,
  playersSchema,
} from "~/stores/add-match-store";
import { useTRPC } from "~/trpc/react";

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
  const trpc = useTRPC();
  const { isOpen, setIsOpen } = useAddMatchStore((state) => state);
  const { data: defaultLocation } = useQuery(
    trpc.location.getDefaultLocation.queryOptions(),
  );
  const { data: scoreSheets } = useQuery(
    trpc.game.getGameScoresheets.queryOptions({ gameId: gameId }),
  );
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <Content
          gameId={gameId}
          gameName={gameName}
          matches={matches}
          defaultLocation={defaultLocation ?? null}
          scoresheets={scoreSheets ?? []}
        />
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
const formSchema = matchSchema.extend({
  players: playersSchema,
  location: locationSchema,
  scoresheetId: z.number(),
});
type formSchemaType = z.infer<typeof formSchema>;
function Content({
  matches,
  gameId,
  gameName,
  defaultLocation,
  scoresheets,
}: {
  gameId: Game["id"];
  gameName: Game["name"];
  matches: number;
  defaultLocation: RouterOutputs["location"]["getDefaultLocation"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
}) {
  const trpc = useTRPC();
  const { isOpen, match, setMatch, setLocation, setScoresheetId, reset } =
    useAddMatchStore((state) => state);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingPlayers, setIsGettingPlayers] = useState(false);
  const [isGettingLocations, setIsGettingLocations] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: match.name || `${gameName} #${matches + 1}`,
      date: match.date,
      players: match.players,
      location: match.location === undefined ? defaultLocation : match.location,
      scoresheetId:
        match.scoresheetId === -1
          ? (scoresheets.find((scoresheet) => scoresheet.type === "Default")
              ?.id ?? 0)
          : match.scoresheetId,
    },
  });
  const createMatch = useMutation(
    trpc.match.createMatch.mutationOptions({
      onSuccess: async (match) => {
        reset();
        setIsSubmitting(false);
        router.push(`/dashboard/games/${gameId}/${match.id}`);
        await queryClient.invalidateQueries(
          trpc.player.getPlayersByGame.queryFilter({ game: { id: gameId } }),
        );
        await queryClient.invalidateQueries(
          trpc.player.getPlayers.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: gameId }),
        );
        await queryClient.invalidateQueries(trpc.dashboard.pathFilter());
      },
    }),
  );

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const onSubmit = (values: formSchemaType) => {
    setIsSubmitting(true);
    const teams = values.players.reduce<
      Record<string, { name: string; players: { id: number }[] }>
    >((acc, player) => {
      if (player.team === null) {
        const noTeam = acc["No Team"];
        if (noTeam) {
          noTeam.players.push({ id: player.id });
        } else {
          acc["No Team"] = {
            name: "No Team" as const,
            players: [{ id: player.id }],
          };
        }
      } else {
        const team = acc[player.team];
        if (team) {
          team.players.push({ id: player.id });
        } else {
          acc[player.team] = {
            name: player.team.toString(),
            players: [{ id: player.id }],
          };
        }
      }
      return acc;
    }, {});
    createMatch.mutate({
      gameId: gameId,
      name: values.name,
      date: values.date,
      teams: Object.values(teams),
      scoresheetId: values.scoresheetId,
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
          <div className="grid w-full grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel className="hidden">Date</FormLabel>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="w-full pl-3 text-left font-normal text-muted-foreground"
                          type="button"
                        >
                          {isSameDay(field.value, new Date()) ? (
                            <span>Today</span>
                          ) : (
                            format(field.value, "PPP")
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
                <FormItem className="col-span-1">
                  <FormLabel className="hidden">Players</FormLabel>
                  <Button
                    className="w-full"
                    variant="outline"
                    type="button"
                    disabled={isGettingPlayers || isGettingLocations}
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
                      `${field.value.length} Players`
                    )}
                  </Button>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="hidden">Location: - (Optional)</FormLabel>
                <div className="flex w-full gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="flex-grow"
                    disabled={isGettingPlayers || isGettingLocations}
                    onClick={() => {
                      setIsGettingLocations(true);
                      setMatch({
                        name: form.getValues("name"),
                        date: form.getValues("date"),
                      });
                      router.push(`/dashboard/games/${gameId}/add/location`);
                    }}
                  >
                    {isGettingLocations ? (
                      <>
                        <Spinner />
                        <span>Navigating...</span>
                      </>
                    ) : field.value ? (
                      `Location: ${field.value.name}`
                    ) : (
                      "Location: - (Optional)"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size={"icon"}
                    type="button"
                    className="rounded-full"
                    onClick={() => {
                      field.onChange(null);
                      setLocation(null);
                    }}
                  >
                    <X />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scoresheetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoresheet:</FormLabel>
                <Select
                  onValueChange={(e) => {
                    field.onChange(e);
                    setScoresheetId(Number(e));
                  }}
                  defaultValue={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a verified email to display" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {scoresheets.map((scoresheet) => {
                      return (
                        <SelectItem value={scoresheet.id.toString()}>
                          {scoresheet.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
