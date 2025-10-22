"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Loader2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  useForm,
} from "@board-games/ui/form";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { Separator } from "@board-games/ui/separator";

import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";
import ChildLocationsRequest from "./child-locations-request";
import ChildMatchesRequest from "./child-match-request";
import ChildPlayersRequest from "./child-players-request";

type Game = Extract<
  RouterOutputs["sharing"]["getShareRequest"],
  { itemType: "game" }
>;
const formSchema = z
  .object({
    gameOption: z.enum(["new", "existing"]),
    existingGameId: z.number().optional().nullable(),

    scoresheets: z.array(
      z.object({
        sharedId: z.number(),
        accept: z.boolean(),
      }),
    ),
  })
  .check((ctx) => {
    if (
      !ctx.value.scoresheets.some((scoresheet) => scoresheet.accept === true)
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "You must accept at least one scoresheet",
        path: ["scoresheets"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;
export default function GameRequestPage({
  game,
  requestId,
}: {
  game: Game;
  requestId: number;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: usersGames } = useSuspenseQuery(
    trpc.sharing.getUserGamesForLinking.queryOptions(),
  );
  const router = useRouter();
  const acceptGameRequestMutation = useMutation(
    trpc.sharing.acceptGameShareRequest.mutationOptions({
      onSuccess: async (response) => {
        setSubmitting(false);
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.sharing.getIncomingShareRequests.queryOptions(),
          ),
          queryClient.invalidateQueries(
            trpc.sharing.getOutgoingShareRequests.queryOptions(),
          ),
        ]);
        router.push(`/dashboard/games/shared/${response.id}`);
      },
    }),
  );

  const [submitting, setSubmitting] = useState(false);

  const [gameSearchOpen, setGameSearchOpen] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState("");
  const [players, setPlayers] = useState<
    { sharedId: number; accept: boolean; linkedId: number | null }[]
  >([]);
  const [matches, setMatches] = useState<
    { sharedId: number; accept: boolean }[]
  >([]);
  const [locations, setLocations] = useState<
    { sharedId: number; accept: boolean; linkedId: number | null }[]
  >([]);

  const childLocations = useMemo(() => {
    return game.childItems.filter((item) => item.itemType === "location");
  }, [game.childItems]);

  const childMatches = useMemo(() => {
    return game.childItems.filter((item) => item.itemType === "match");
  }, [game.childItems]);

  const childPlayers = useMemo(() => {
    return game.childItems.filter((item) => item.itemType === "player");
  }, [game.childItems]);

  const childScoresheets = useMemo(() => {
    return game.childItems.filter((item) => item.itemType === "scoresheet");
  }, [game.childItems]);

  const filteredGames = useMemo(() => {
    return usersGames.filter((game) =>
      game.name.toLowerCase().includes(gameSearchQuery.toLowerCase()),
    );
  }, [usersGames, gameSearchQuery]);

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      gameOption: "new",
      existingGameId: null,
      scoresheets: childScoresheets.map((scoresheet) => ({
        sharedId: scoresheet.shareId,
        accept: true,
      })),
    },
  });
  const onSubmit = (data: FormValues) => {
    setSubmitting(true);
    acceptGameRequestMutation.mutate({
      requestId: requestId,
      linkedGameId:
        data.gameOption === "existing"
          ? (data.existingGameId ?? undefined)
          : undefined,
      scoresheets: data.scoresheets.map((scoresheet) => ({
        sharedId: scoresheet.sharedId,
        accept: scoresheet.accept,
      })),
      locations: locations.map((location) => ({
        sharedId: location.sharedId,
        accept: location.accept,
        linkedId: location.linkedId ?? undefined,
      })),
      matches: matches.map((match) => ({
        sharedId: match.sharedId,
        accept: match.accept,
      })),
      players: players.map((player) => ({
        sharedId: player.sharedId,
        accept: player.accept,
        linkedId: player.linkedId ?? undefined,
      })),
    });
  };

  const handleGameSelect = (gameId: number) => {
    form.setValue("existingGameId", gameId);
    setGameSearchOpen(false);
  };
  const sharedPlayers = useMemo(() => {
    return players.reduce((acc, curr) => {
      if (curr.linkedId) return acc + 1;
      return acc;
    }, 0);
  }, [players]);
  const acceptedPlayers = useMemo(() => {
    return players.reduce((acc, curr) => {
      if (curr.accept) return acc + 1;
      return acc;
    }, 0);
  }, [players]);
  const acceptedLocations = useMemo(() => {
    return locations.reduce((acc, curr) => {
      if (curr.accept) return acc + 1;
      return acc;
    }, 0);
  }, [locations]);
  const acceptedMatches = useMemo(() => {
    return matches.reduce((acc, curr) => {
      if (curr.accept) return acc + 1;
      return acc;
    }, 0);
  }, [matches]);

  const foundGame = useMemo(() => {
    return usersGames.find(
      (g) => g.name.toLowerCase() === game.item.name.toLowerCase(),
    );
  }, [game.item.name, usersGames]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GameImage
                  image={game.item.image}
                  alt={`${game.item.name} game image`}
                  containerClassName="h-20 w-20 rounded"
                />
                <div>
                  <CardTitle>
                    {game.item.name}{" "}
                    {game.item.yearPublished && (
                      <span className="mr-2">({game.item.yearPublished})</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex gap-2">
                      {game.item.playersMin && game.item.playersMax && (
                        <span className="mr-2">
                          {game.item.playersMin === game.item.playersMax
                            ? `Players: ${game.item.playersMin}`
                            : `Players: ${game.item.playersMin}-${game.item.playersMax}`}
                        </span>
                      )}
                      {game.item.playtimeMin && game.item.playtimeMax && (
                        <span>
                          {game.item.playtimeMin === game.item.playtimeMax
                            ? `Playtime: ${game.item.playtimeMin} min`
                            : `Playtime: ${game.item.playtimeMin}-${game.item.playtimeMax} min`}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {childMatches.length} shared matches,{" "}
                      {childPlayers.length} shared players
                    </p>
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={game.permission === "edit" ? "default" : "secondary"}
              >
                {game.permission === "edit" ? "Edit Access" : "View Only"}
              </Badge>
            </div>
            {game.item.description && (
              <p className="text-muted-foreground mt-2 text-sm">
                {game.item.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Game Linking Options</h3>

              <FormField
                control={form.control}
                name="gameOption"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          if (value === "new") {
                            form.setValue("existingGameId", null);
                          }
                          field.onChange(value);
                        }}
                        className="space-y-4"
                      >
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem
                            value="new"
                            id="new-game"
                            className="mt-1"
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor="new-game" className="font-medium">
                              Create as a new game
                            </Label>
                            <p className="text-muted-foreground text-sm">
                              Add {game.item.name} as a new game in your
                              collection{" "}
                              {foundGame ? "(Possible Duplicate Found)" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <RadioGroupItem
                            value="existing"
                            id="existing-game"
                            className="mt-1"
                          />
                          <div className="grid w-full gap-1.5">
                            <Label
                              htmlFor="existing-game"
                              className="font-medium"
                            >
                              Link to an existing game
                            </Label>
                            <p className="text-muted-foreground mb-2 text-sm">
                              Connect this shared game to a game you already
                              have in your collection
                            </p>

                            {field.value === "existing" && (
                              <FormField
                                control={form.control}
                                name="existingGameId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Popover
                                        open={gameSearchOpen}
                                        onOpenChange={setGameSearchOpen}
                                      >
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={gameSearchOpen}
                                            className="justify-between"
                                          >
                                            {field.value
                                              ? usersGames.find(
                                                  (game) =>
                                                    game.id === field.value,
                                                )?.name
                                              : "Select a game..."}
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                          <Command>
                                            <CommandInput
                                              placeholder="Search games..."
                                              value={gameSearchQuery}
                                              onValueChange={setGameSearchQuery}
                                            />
                                            <CommandEmpty>
                                              No games found.
                                            </CommandEmpty>
                                            <CommandList>
                                              <CommandGroup>
                                                {filteredGames.map((fGame) => (
                                                  <CommandItem
                                                    key={fGame.id}
                                                    value={fGame.id.toString()}
                                                    onSelect={() =>
                                                      handleGameSelect(fGame.id)
                                                    }
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <GameImage
                                                        image={fGame.image}
                                                        alt={`${fGame.name} game image`}
                                                        containerClassName="h-6 w-6 rounded"
                                                      />
                                                      <div>
                                                        <p>
                                                          {fGame.name}
                                                          {fGame.name.toLowerCase() ===
                                                          game.item.name.toLowerCase()
                                                            ? " (Possible Duplicate Found)"
                                                            : ""}
                                                        </p>
                                                        {(fGame.yearPublished ??
                                                          fGame.playersMin) && (
                                                          <p className="text-muted-foreground text-xs">
                                                            {
                                                              fGame.yearPublished
                                                            }
                                                            {fGame.playersMin &&
                                                              fGame.playersMax && (
                                                                <span className="ml-2">
                                                                  {fGame.playersMin ===
                                                                  fGame.playersMax
                                                                    ? `${fGame.playersMin} players`
                                                                    : `${fGame.playersMin}-${fGame.playersMax} players`}
                                                                </span>
                                                              )}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <Check
                                                      className={`mr-auto h-4 w-4 ${
                                                        field.value === fGame.id
                                                          ? "opacity-100"
                                                          : "opacity-0"
                                                      }`}
                                                    />
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {childScoresheets.length > 0 && (
              <>
                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Scoresheets</h3>
                    <p className="text-muted-foreground text-sm">
                      {form.getValues("scoresheets").reduce((acc, curr) => {
                        if (curr.accept) return acc + 1;
                        return acc;
                      }, 0)}{" "}
                      of {childScoresheets.length} selected
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="scoresheets"
                    render={() => (
                      <FormItem>
                        <div className="space-y-4">
                          {childScoresheets.map((scoresheetItem) => {
                            const scoresheet = scoresheetItem.item;

                            return (
                              <div
                                key={scoresheet.id}
                                className="flex items-center justify-between rounded-md border p-3"
                              >
                                <div>
                                  <p className="font-medium">
                                    {scoresheet.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant={
                                      scoresheetItem.permission === "edit"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {scoresheetItem.permission === "edit"
                                      ? "Edit Access"
                                      : "View Only"}
                                  </Badge>
                                  <FormField
                                    control={form.control}
                                    name={`scoresheets.${form.getValues("scoresheets").findIndex((sItem) => sItem.sharedId === scoresheetItem.shareId)}.accept`}
                                    render={({ field }) => (
                                      <FormItem className="flex items-center space-x-2">
                                        <FormControl>
                                          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                                            <Button
                                              type="button"
                                              variant={
                                                field.value
                                                  ? "default"
                                                  : "outline"
                                              }
                                              size="sm"
                                              className="w-24"
                                              onClick={() =>
                                                field.onChange(true)
                                              }
                                            >
                                              <ThumbsUp className="mr-2 h-4 w-4" />
                                              Accept
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={
                                                field.value
                                                  ? "outline"
                                                  : "default"
                                              }
                                              size="sm"
                                              className="w-24"
                                              onClick={() =>
                                                field.onChange(false)
                                              }
                                            >
                                              <ThumbsDown className="mr-2 h-4 w-4" />
                                              Reject
                                            </Button>
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {childLocations.length > 0 && (
              <>
                <Separator />

                <ChildLocationsRequest
                  childLocations={childLocations}
                  locations={locations}
                  setLocations={setLocations}
                />
              </>
            )}

            {childMatches.length > 0 && (
              <>
                <Separator />

                <ChildMatchesRequest
                  childMatches={childMatches}
                  matches={matches}
                  setMatches={setMatches}
                  gameMatches={
                    usersGames.find(
                      (g) => g.id === form.getValues("existingGameId"),
                    )?.matches ?? []
                  }
                />
              </>
            )}

            {childPlayers.length > 0 && (
              <>
                <Separator />

                <ChildPlayersRequest
                  childPlayers={childPlayers}
                  players={players}
                  setPlayers={setPlayers}
                />
              </>
            )}

            <div className="rounded-md bg-blue-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-blue-700">
                Summary of items to be added:
              </h4>
              <ul className="ml-5 list-disc space-y-1 text-sm text-blue-600">
                <li>
                  1 Game: {game.item.name}
                  {form.getValues("gameOption") === "existing" &&
                    form.getValues("existingGameId") && (
                      <span>
                        {" "}
                        (linked to{" "}
                        {
                          usersGames.find(
                            (g) => g.id === form.getValues("existingGameId"),
                          )?.name
                        }
                        )
                      </span>
                    )}
                </li>
                {childMatches.length > 0 && acceptedMatches > 0 && (
                  <li>
                    {acceptedMatches} Match
                    {acceptedMatches !== 1 ? "es" : ""}
                    {form.getValues("gameOption") === "existing" &&
                      form.getValues("existingGameId") && (
                        <span>
                          {" "}
                          (
                          {matches.reduce((acc, curr) => {
                            if (curr.sharedId) return acc + 1;
                            return acc;
                          }, 0)}{" "}
                          linked)
                        </span>
                      )}
                  </li>
                )}
                {childScoresheets.length > 0 &&
                  form.getValues("scoresheets").reduce((acc, curr) => {
                    if (curr.accept) return acc + 1;
                    return acc;
                  }, 0) > 0 && (
                    <li>
                      {form.getValues("scoresheets").reduce((acc, curr) => {
                        if (curr.accept) return acc + 1;
                        return acc;
                      }, 0)}{" "}
                      Scoresheet
                      {form.getValues("scoresheets").reduce((acc, curr) => {
                        if (curr.accept) return acc + 1;
                        return acc;
                      }, 0) !== 1
                        ? "s"
                        : ""}
                    </li>
                  )}
                {childPlayers.length > 0 && acceptedPlayers > 0 && (
                  <li>
                    {acceptedPlayers} Player
                    {acceptedPlayers !== 1 ? "s" : ""}
                    <span> ({sharedPlayers} linked)</span>
                  </li>
                )}
                {childLocations.length > 0 && acceptedLocations > 0 && (
                  <li>
                    {acceptedLocations} Location
                    {acceptedLocations !== 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(`/dashboard/share-requests`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Accept & Link"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
