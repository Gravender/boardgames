"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { compareDesc, isSameDay } from "date-fns";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import type { UseFormReturn } from "@board-games/ui/form";
import { formatDuration } from "@board-games/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@board-games/ui/accordion";
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
  useFieldArray,
  useForm,
} from "@board-games/ui/form";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import ChildLocationsRequest from "./child-locations-request";
import ChildPlayersRequest from "./child-players-request";

type Player = Extract<
  RouterOutputs["sharing"]["getShareRequest"],
  { itemType: "player" }
>;
const requesteeGameSchema = z
  .object({
    type: z.literal("request"),
    shareId: z.number(),
    gameOption: z.enum(["new", "existing"]),
    existingGameId: z.number().optional().nullable(),
    accept: z.boolean(),
    matches: z.array(
      z.object({
        sharedId: z.number(),
        accept: z.boolean(),
      }),
    ),
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
const sharedGameSchema = z.object({
  type: z.literal("shared"),
  shareId: z.number(),
  matches: z.array(
    z.object({
      sharedId: z.number(),
      accept: z.boolean(),
    }),
  ),
});
const gamesFormSchema = z.object({
  playerOption: z.enum(["new", "existing"]),
  existingPlayerId: z.number().optional().nullable(),
  games: z.array(sharedGameSchema.or(requesteeGameSchema)),
});

type FormValues = z.infer<typeof gamesFormSchema>;
export default function PlayerRequestPage({
  player,
  requestId,
}: {
  player: Player;
  requestId: number;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: usersPlayers } = useSuspenseQuery(
    trpc.sharing.getUserPlayersForLinking.queryOptions(),
  );
  const router = useRouter();
  const acceptPlayerMutation = useMutation(
    trpc.sharing.acceptPersonShareRequest.mutationOptions({
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
        router.push(`/dashboard/players/shared/${response.id}`);
      },
    }),
  );

  const [submitting, setSubmitting] = useState(false);

  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [players, setPlayers] = useState<
    { sharedId: number; accept: boolean; linkedId: number | null }[]
  >([]);
  const [locations, setLocations] = useState<
    { sharedId: number; accept: boolean; linkedId: number | null }[]
  >([]);

  const filteredPlayers = useMemo(() => {
    return usersPlayers.filter((player) =>
      player.name.toLowerCase().includes(playerSearchQuery.toLowerCase()),
    );
  }, [usersPlayers, playerSearchQuery]);
  const foundPlayer = useMemo(() => {
    return usersPlayers.find(
      (p) => p.name.toLowerCase() === player.item.name.toLowerCase(),
    );
  }, [player.item.name, usersPlayers]);

  const form = useForm({
    schema: gamesFormSchema,
    defaultValues: {
      playerOption: "new",
      existingPlayerId: null,
      games: player.games.map((pGame) => {
        if (pGame.type === "request") {
          return {
            type: "request" as const,
            shareId: pGame.shareId,
            gameOption: "new" as const,
            existingGameId: null,
            accept: true,
            matches: pGame.matches.map((pMatch) => {
              return {
                sharedId: pMatch.shareId,
                accept: true,
              };
            }),
            scoresheets: pGame.scoresheets.map((pScoresheet) => {
              return {
                sharedId: pScoresheet.shareId,
                accept: true,
              };
            }),
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (pGame.type === "shared") {
          return {
            type: "shared" as const,
            shareId: pGame.shareId,
            matches: pGame.matches.map((pMatch) => {
              return {
                sharedId: pMatch.shareId,
                accept: true,
              };
            }),
          };
        }
      }),
    },
  });

  const playerOption = form.watch("playerOption");
  const existingPlayerId = form.watch("existingPlayerId");
  const games = form.watch("games");
  const onSubmit = (data: FormValues) => {
    setSubmitting(true);
    acceptPlayerMutation.mutate({
      requestId: requestId,
      linkedPlayerId:
        data.playerOption === "existing"
          ? (data.existingPlayerId ?? undefined)
          : undefined,
      players: players.map((player) => ({
        sharedId: player.sharedId,
        accept: player.accept,
        linkedId: player.linkedId ?? undefined,
      })),
      locations: locations.map((location) => ({
        sharedId: location.sharedId,
        accept: location.accept,
        linkedId: location.linkedId ?? undefined,
      })),
      games: data.games,
    });
  };

  const handlePlayerSelect = (playerId: number) => {
    form.setValue("existingPlayerId", playerId);
    setPlayerSearchOpen(false);
  };

  const playerScoresheets = useMemo(() => {
    return games.reduce((acc, curr) => {
      if (curr.type === "request" && curr.accept) {
        return acc + curr.scoresheets.length;
      }
      return acc;
    }, 0);
  }, [games]);

  const playerMatches = useMemo(() => {
    return games.reduce((acc, curr) => {
      return acc + curr.matches.length;
    }, 0);
  }, [games]);

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
  const acceptedGames = useMemo(() => {
    return games.reduce((acc, curr) => {
      if (curr.type === "request" && curr.accept) return acc + 1;
      return acc;
    }, 0);
  }, [games]);
  const acceptedScoresheets = useMemo(() => {
    return games.reduce((acc, curr) => {
      if (curr.type === "request" && curr.accept) {
        return (
          acc +
          curr.scoresheets.reduce((acc, curr) => {
            if (curr.accept) return acc + 1;
            return acc;
          }, 0)
        );
      }
      return acc;
    }, 0);
  }, [games]);
  const acceptedMatches = useMemo(() => {
    return games.reduce((acc, curr) => {
      return (
        acc +
        curr.matches.reduce((acc, curr) => {
          if (curr.accept) return acc + 1;
          return acc;
        }, 0)
      );
    }, 0);
  }, [games]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <PlayerImage
                  className="size-20"
                  image={player.item.image}
                  alt={player.item.name}
                />
                <div>
                  <CardTitle>
                    {player.item.name}{" "}
                    {foundPlayer && (
                      <span className="text-xs text-green-600">
                        (Exact match Found)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Shared by {player.item.creator.name}
                    <p className="text-muted-foreground text-sm">
                      {player.games.length} games, {player.players.length} other
                      players
                    </p>
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={player.permission === "edit" ? "default" : "secondary"}
              >
                {player.permission === "edit" ? "Edit" : "View"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Player Linking Options</h3>

              <FormField
                control={form.control}
                name="playerOption"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          if (value === "new") {
                            form.setValue("playerOption", "new");
                          }
                          field.onChange(value);
                        }}
                        className="space-y-4"
                      >
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem
                            value="new"
                            id="new-player"
                            className="mt-1"
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor="new-player" className="font-medium">
                              Create as a new player
                            </Label>
                            <p className="text-muted-foreground text-sm">
                              Add {player.item.name} as a new player in your
                              collection
                              {foundPlayer ? "(Possible Duplicate Found)" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <RadioGroupItem
                            value="existing"
                            id="existing-player"
                            className="mt-1"
                          />
                          <div className="grid w-full gap-1.5">
                            <Label
                              htmlFor="existing-player"
                              className="font-medium"
                            >
                              Link to an existing player
                            </Label>
                            <p className="text-muted-foreground mb-2 text-sm">
                              Connect this shared player to a player you already
                              have in your collection
                            </p>

                            {field.value === "existing" && (
                              <FormField
                                control={form.control}
                                name="existingPlayerId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Popover
                                        open={playerSearchOpen}
                                        onOpenChange={setPlayerSearchOpen}
                                      >
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={playerSearchOpen}
                                            className="justify-between"
                                          >
                                            {field.value
                                              ? usersPlayers.find(
                                                  (player) =>
                                                    player.id === field.value,
                                                )?.name
                                              : "Select a player..."}
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                          <Command>
                                            <CommandInput
                                              placeholder="Search players..."
                                              value={playerSearchQuery}
                                              onValueChange={
                                                setPlayerSearchQuery
                                              }
                                            />
                                            <CommandEmpty>
                                              No players found.
                                            </CommandEmpty>
                                            <CommandList>
                                              <CommandGroup>
                                                {filteredPlayers.map(
                                                  (fPlayer) => (
                                                    <CommandItem
                                                      key={fPlayer.id}
                                                      value={fPlayer.id.toString()}
                                                      onSelect={() =>
                                                        handlePlayerSelect(
                                                          fPlayer.id,
                                                        )
                                                      }
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <PlayerImage
                                                          className="size-6"
                                                          image={fPlayer.image}
                                                          alt={fPlayer.name}
                                                        />
                                                        <div>
                                                          <p>{fPlayer.name}</p>
                                                          {fPlayer.name.toLowerCase() ===
                                                            player.item.name.toLowerCase() && (
                                                            <span className="text-xs text-green-600">
                                                              (Exact match)
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                      {field.value ===
                                                        fPlayer.id && (
                                                        <Check className="ml-auto h-4 w-4" />
                                                      )}
                                                    </CommandItem>
                                                  ),
                                                )}
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
            {player.locations.length > 0 && (
              <>
                <Separator />

                <ChildLocationsRequest
                  childLocations={player.locations}
                  locations={locations}
                  setLocations={setLocations}
                />
              </>
            )}
            {player.games.length > 0 && (
              <>
                <Separator />
                <ChildGamesRequest form={form} games={player.games} />
              </>
            )}
            {player.players.length > 0 && (
              <>
                <Separator />

                <ChildPlayersRequest
                  childPlayers={player.players}
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
                  1 Player: {player.item.name}
                  {playerOption === "existing" && existingPlayerId && (
                    <span>
                      {" "}
                      (linked to{" "}
                      {
                        usersPlayers.find((p) => p.id === existingPlayerId)
                          ?.name
                      }
                      )
                    </span>
                  )}
                </li>

                {player.players.length > 0 && acceptedPlayers > 0 && (
                  <li>
                    {acceptedPlayers} Player
                    {acceptedPlayers !== 1 ? "s" : ""}
                    <span> ({sharedPlayers} linked)</span>
                  </li>
                )}
                {player.games.length > 0 && acceptedGames && (
                  <li>
                    {acceptedGames} Game
                    {acceptedGames !== 1 ? "s" : ""}
                  </li>
                )}
                {playerScoresheets > 0 && acceptedScoresheets && (
                  <li>
                    {acceptedScoresheets} Scoresheet
                    {acceptedScoresheets !== 1 ? "s" : ""}
                  </li>
                )}
                {playerMatches > 0 && acceptedMatches && (
                  <li>
                    {acceptedMatches} Match
                    {acceptedMatches !== 1 ? "es" : ""}
                  </li>
                )}
                {player.locations.length > 0 && acceptedLocations > 0 && (
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

function ChildGamesRequest({
  games,
  form,
}: {
  games: Player["games"];
  form: UseFormReturn<FormValues>;
}) {
  const trpc = useTRPC();
  const gameDecisions = form.watch("games");
  const { data: usersGames } = useSuspenseQuery(
    trpc.sharing.getUserGamesForLinking.queryOptions(),
  );

  const potentialMatches = useMemo(() => {
    return games.reduce((acc, curr) => {
      if (curr.type === "request") {
        const foundGame = usersGames.find(
          (g) => g.name.toLowerCase() === curr.item.name.toLowerCase(),
        );
        if (foundGame) {
          return acc + 1;
        }
      }
      return acc;
    }, 0);
  }, [games, usersGames]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Games</h3>
          {potentialMatches > 0 && (
            <span className="font-medium text-green-600">
              ({potentialMatches} possible{" "}
              {potentialMatches == 1 ? "duplicate" : "duplicates"} found)
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {gameDecisions.reduce((acc, curr) => {
            if (curr.type === "request" && curr.accept) {
              return acc + 1;
            }
            return acc;
          }, 0)}{" "}
          of{" "}
          {gameDecisions.reduce((acc, curr) => {
            if (curr.type === "request") {
              return acc + 1;
            }
            return acc;
          }, 0)}{" "}
          selected
        </p>
      </div>

      <ScrollArea className="p-2">
        <Accordion type="single" collapsible className="max-h-[45rem] gap-2">
          {games.map((game) => {
            const gameIndex = gameDecisions.findIndex(
              (g) => g.shareId === game.shareId,
            );

            if (gameIndex === -1) return null;
            const gameState = gameDecisions[gameIndex];
            if (!gameState) return null;

            if (gameState.type === "request" && game.type === "request") {
              return (
                <RequestShareGame
                  key={game.shareId}
                  game={game}
                  gameState={gameState}
                  gameIndex={gameIndex}
                  games={usersGames}
                  form={form}
                />
              );
            }
            if (gameState.type === "shared" && game.type === "shared") {
              return (
                <SharedGameWithMatches
                  key={game.shareId}
                  game={game}
                  gameState={gameState}
                  gameIndex={gameIndex}
                  games={usersGames}
                  form={form}
                />
              );
            }
            return (
              <div key={game.shareId}>
                <span>
                  {gameState.type === "request" ? "request" : "shared"}
                </span>
                <span>{game.type === "request" ? "request" : "shared"}</span>
              </div>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
function RequestShareGame({
  game,
  gameState,
  gameIndex,
  games,
  form,
}: {
  game: Extract<Player["games"][number], { type: "request" }>;
  gameState: z.infer<typeof requesteeGameSchema>;
  gameIndex: number;
  games: RouterOutputs["sharing"]["getUserGamesForLinking"];
  form: UseFormReturn<FormValues>;
}) {
  const [gameSearchOpen, setGameSearchOpen] = useState(false);

  const [gameSearchQuery, setGameSearchQuery] = useState("");

  const scoresheets = form.watch(`games.${gameIndex}.scoresheets`);

  const foundGame = useMemo(() => {
    return games.find(
      (g) => g.name.toLowerCase() === game.item.name.toLowerCase(),
    );
  }, [game.item.name, games]);
  const sortedGames = useMemo(() => {
    const temp = [...games];
    temp.sort((a, b) => {
      if (a.name === b.name) return 0;
      if (foundGame?.id === a.id) return -1;
      if (foundGame?.id === b.id) return 1;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    return temp;
  }, [foundGame?.id, games]);

  return (
    <AccordionItem value={`game-${game.item.id}`} className="p-1">
      <div className="flex w-full items-center justify-between">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex w-full items-center gap-2">
            <GameImage
              image={game.item.image}
              alt={`${game.item.name} game image`}
              containerClassName="h-8 w-8 rounded"
            />
            <div className="text-left">
              <span className="font-medium">{game.item.name} </span>
              <span className="font-medium text-green-600">
                {gameState.existingGameId
                  ? "(Linked)"
                  : foundGame
                    ? " (Possible Duplicate Found)"
                    : ""}
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <div className="flex items-center gap-2">
          <Badge
            variant={game.permission === "edit" ? "default" : "secondary"}
            className="text-xs"
          >
            {game.permission === "edit" ? "Edit" : "View"}
          </Badge>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button
              type="button"
              variant={gameState.accept ? "default" : "outline"}
              size="sm"
              className="w-24"
              onClick={(e) => {
                e.stopPropagation();
                form.setValue(`games.${gameIndex}.accept`, true);
              }}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Accept
            </Button>
            <Button
              type="button"
              variant={gameState.accept ? "outline" : "default"}
              size="sm"
              className="w-24"
              onClick={(e) => {
                e.stopPropagation();
                form.setValue(`games.${gameIndex}.accept`, false);
              }}
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </div>
      <AccordionContent>
        {gameState.accept ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <Label>Link to existing game</Label>

              <RadioGroup
                value={gameState.gameOption}
                onValueChange={(value) => {
                  if (value === "new") {
                    form.setValue(`games.${gameIndex}.gameOption`, "new");
                  } else {
                    form.setValue(`games.${gameIndex}.gameOption`, "existing");
                  }
                }}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id={`game-${game.item.id}-new`} />
                  <Label htmlFor={`game-${game.item.id}-new`}>
                    Don't link (create as new game)
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem
                    value="existing"
                    id={`existing-${game.item.id}-game`}
                    className="mt-1"
                  />
                  <div className="grid w-full gap-1.5">
                    <Label
                      htmlFor={`existing-${game.item.id}-game`}
                      className="font-medium"
                    >
                      Link to an existing game
                    </Label>
                    <p className="text-muted-foreground mb-2 text-sm">
                      Connect this shared game to a game you already have.
                    </p>

                    {gameState.gameOption === "existing" && (
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
                            {gameState.existingGameId
                              ? games.find(
                                  (existingGame) =>
                                    existingGame.id ===
                                    gameState.existingGameId,
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
                            <CommandEmpty>No games found.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {sortedGames.map((existingGame) => (
                                  <CommandItem
                                    key={existingGame.id}
                                    value={existingGame.id.toString()}
                                    onSelect={() => {
                                      form.setValue(
                                        `games.${gameIndex}.existingGameId`,
                                        existingGame.id,
                                      );
                                      setGameSearchOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <GameImage
                                        image={existingGame.image}
                                        alt={`${existingGame.name} game image`}
                                        containerClassName="h-7 w-7 rounded"
                                      />
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <span>{existingGame.name}</span>

                                          {existingGame.name.toLowerCase() ===
                                          game.item.name.toLowerCase() ? (
                                            <span className="text-xs text-green-500">
                                              (Duplicate)
                                            </span>
                                          ) : (
                                            ""
                                          )}
                                        </div>
                                        {(existingGame.yearPublished ??
                                          existingGame.playersMin) && (
                                          <p className="text-muted-foreground text-xs">
                                            {existingGame.yearPublished}
                                            {existingGame.playersMin &&
                                              existingGame.playersMax && (
                                                <span className="ml-2">
                                                  {existingGame.playersMin ===
                                                  existingGame.playersMax
                                                    ? `${existingGame.playersMin} players`
                                                    : `${existingGame.playersMin}-${existingGame.playersMax} players`}
                                                </span>
                                              )}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Check
                                      className={`mr-auto h-4 w-4 ${
                                        gameState.existingGameId ===
                                        existingGame.id
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
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
            {game.matches.length > 0 && (
              <>
                <Separator />

                <MatchRequests
                  childMatches={game.matches}
                  matches={gameState.matches}
                  gameIndex={gameIndex}
                  form={form}
                  gameMatches={
                    games.find((g) => g.id === gameState.existingGameId)
                      ?.matches ?? []
                  }
                />
              </>
            )}
            {game.scoresheets.length > 0 && (
              <>
                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Scoresheets</h3>
                    <p className="text-muted-foreground text-sm">
                      {scoresheets.reduce((acc, curr) => {
                        if (curr.accept) return acc + 1;
                        return acc;
                      }, 0)}{" "}
                      of {game.scoresheets.length} selected
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name={`games.${gameIndex}.scoresheets`}
                    render={() => (
                      <FormItem>
                        <ScrollArea className="px-2">
                          <div className="grid max-h-[10rem] gap-2">
                            {game.scoresheets.map((scoresheetItem) => {
                              const scoresheet = scoresheetItem.item;

                              return (
                                <div
                                  key={scoresheetItem.shareId}
                                  className="flex items-center justify-between rounded-md border p-1"
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
                                        ? "Edit"
                                        : "View"}
                                    </Badge>
                                    <FormField
                                      control={form.control}
                                      name={`games.${gameIndex}.scoresheets.${scoresheets.findIndex((sItem) => sItem.sharedId === scoresheetItem.shareId)}.accept`}
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
                        </ScrollArea>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground py-4 text-center text-sm">
            This game will not be added to your collection.
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
function SharedGameWithMatches({
  game,
  gameState,
  gameIndex,
  games,
  form,
}: {
  game: Extract<Player["games"][number], { type: "shared" }>;
  gameState: z.infer<typeof sharedGameSchema>;
  gameIndex: number;
  games: RouterOutputs["sharing"]["getUserGamesForLinking"];
  form: UseFormReturn<FormValues>;
}) {
  return (
    <AccordionItem value={`game-${game.sharedGame.id}`} className="p-1">
      <div className="flex w-full items-center justify-between">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex w-full gap-2">
            <GameImage
              image={game.sharedGame.image}
              alt={`${game.sharedGame.name} game image`}
              containerClassName="h-8 w-8 rounded"
            />
            <div className="text-left">
              {game.sharedGame.name}
              {game.sharedGame.yearPublished && (
                <span className="mr-2">({game.sharedGame.yearPublished})</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {game.sharedGame.playersMin && game.sharedGame.playersMax && (
              <span className="mr-2">
                {game.sharedGame.playersMin === game.sharedGame.playersMax
                  ? `Players: ${game.sharedGame.playersMin}`
                  : `Players: ${game.sharedGame.playersMin}-${game.sharedGame.playersMax}`}
              </span>
            )}
            {game.sharedGame.playtimeMin && game.sharedGame.playtimeMax && (
              <span>
                {game.sharedGame.playtimeMin === game.sharedGame.playtimeMax
                  ? `Playtime: ${game.sharedGame.playtimeMin} min`
                  : `Playtime: ${game.sharedGame.playtimeMin}-${game.sharedGame.playtimeMax} min`}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {game.matches.length} shared matches,{" "}
          </p>
        </AccordionTrigger>
        <div className="flex items-center gap-2">
          <Badge
            variant={game.permission === "edit" ? "default" : "secondary"}
            className="text-xs"
          >
            {game.permission === "edit" ? "Edit" : "View"}
          </Badge>
        </div>
      </div>
      <AccordionContent>
        {game.matches.length > 0 && (
          <>
            <MatchRequests
              childMatches={game.matches}
              matches={gameState.matches}
              gameIndex={gameIndex}
              form={form}
              gameMatches={
                games.find((g) => g.id === game.sharedGame.id)?.matches ?? []
              }
            />
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
function MatchRequests({
  matches,
  childMatches,
  gameIndex,
  gameMatches,
  form,
}: {
  childMatches: Extract<
    Player["games"][number],
    { type: "request" }
  >["matches"];
  matches: z.infer<typeof requesteeGameSchema>["matches"];
  gameIndex: number;
  gameMatches: RouterOutputs["sharing"]["getUserGamesForLinking"][number]["matches"];
  form: UseFormReturn<FormValues>;
}) {
  const { update } = useFieldArray({
    control: form.control,
    name: `games.${gameIndex}.matches`,
  });
  const potentialMatches = useCallback(
    (matchDate: Date) => {
      if (gameMatches.length == 0) return [];

      // Find matches from the selected game that occurred on the same day
      return gameMatches.filter((m) => {
        return isSameDay(matchDate, m.date);
      });
    },
    [gameMatches],
  );
  const sortedMatches = useMemo(() => {
    const temp = [...childMatches];
    temp.sort((a, b) => {
      const potentialA = potentialMatches(a.item.date);
      const potentialB = potentialMatches(b.item.date);
      if (potentialA.length > 0 || potentialB.length > 0) {
        if (potentialA.length > 0 && potentialB.length > 0)
          return potentialA.length - potentialB.length;
        if (potentialA.length > 0) return -1;
        if (potentialB.length > 0) return 1;
      }
      return compareDesc(a.item.date, b.item.date);
    });
    return temp;
  }, [childMatches, potentialMatches]);
  const anyPotentialMatches = useMemo(() => {
    return sortedMatches.some((matchItem) => {
      return potentialMatches(matchItem.item.date).length > 0;
    });
  }, [sortedMatches, potentialMatches]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Matches</h3>
          {anyPotentialMatches && (
            <span className="font-medium text-green-600">
              (Possible Match's Found)
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {matches.reduce((acc, curr) => {
            if (curr.accept) return acc + 1;
            return acc;
          }, 0)}{" "}
          of {childMatches.length} selected
        </p>
      </div>
      <ScrollArea className="p-2">
        <div className="grid max-h-[20rem] gap-2">
          {sortedMatches.map((matchItem) => {
            const matchState = matches.find(
              (m) => m.sharedId === matchItem.shareId,
            );
            const matchIndex = matches.findIndex(
              (m) => m.sharedId === matchItem.shareId,
            );
            if (!matchState) return null;
            return (
              <Accordion
                key={matchItem.item.id}
                type="multiple"
                className="w-full"
              >
                <AccordionItem value={`match-${matchItem.item.id}`}>
                  <div className="flex w-full items-center justify-between pr-4">
                    <AccordionTrigger className="flex w-full items-center justify-between pr-4 hover:no-underline">
                      <div className="flex w-full flex-col">
                        <div className="flex w-full">
                          <div className="text-left">
                            <span className="font-medium">
                              {matchItem.item.name}{" "}
                            </span>
                            {potentialMatches(matchItem.item.date).length >
                              0 && (
                              <span className="font-medium text-green-600">
                                (Possible Match Found)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <FormattedDate
                            date={matchItem.item.date}
                            className="flex items-center gap-1"
                            Icon={Calendar}
                          />
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(matchItem.item.duration)}
                          </span>
                          {matchItem.item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {matchItem.item.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          matchItem.permission === "edit"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {matchItem.permission === "edit" ? "Edit" : "View"}
                      </Badge>
                      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant={matchState.accept ? "default" : "outline"}
                          size="sm"
                          className="w-24"
                          onClick={(e) => {
                            e.stopPropagation();
                            update(matchIndex, {
                              ...matchState,
                              accept: true,
                            });
                          }}
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant={matchState.accept ? "outline" : "default"}
                          size="sm"
                          className="w-24"
                          onClick={(e) => {
                            e.stopPropagation();
                            update(matchIndex, {
                              ...matchState,
                              accept: false,
                            });
                          }}
                        >
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>

                  <AccordionContent>
                    {matchState.accept ? (
                      <div className="space-y-4">
                        {potentialMatches(matchItem.item.date).length > 0 ? (
                          <div className="space-y-3">
                            <Label>Potential matches on same date:</Label>
                            {potentialMatches(matchItem.item.date).map(
                              (potentialMatch) => (
                                <div
                                  key={potentialMatch.id}
                                  className="flex items-center justify-between space-x-2"
                                >
                                  <Label
                                    htmlFor={`match-${matchItem.item.id}-link-${potentialMatch.id}`}
                                  >
                                    <div>
                                      <p>{potentialMatch.name}</p>
                                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                        <FormattedDate
                                          date={potentialMatch.date}
                                          Icon={Calendar}
                                          className="flex items-center gap-1"
                                        />
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          {formatDuration(
                                            potentialMatch.duration,
                                          )}
                                        </span>
                                        {potentialMatch.location && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {potentialMatch.location.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </Label>
                                  <Button
                                    value={potentialMatch.id.toString()}
                                    id={`match-${matchItem.item.id}-link-${potentialMatch.id}`}
                                    onClick={() =>
                                      update(matchIndex, {
                                        ...matchState,
                                        accept: false,
                                      })
                                    }
                                  >
                                    Same Match
                                  </Button>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            No matches found on{" "}
                            {new Date(matchItem.item.date).toLocaleDateString()}{" "}
                            for the selected game
                          </p>
                        )}

                        {gameMatches.length === 0 && (
                          <p className="text-muted-foreground text-sm">
                            This match will be added as a new match to your
                            collection.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground py-2 text-center text-sm">
                        This match will not be added to your collection.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
