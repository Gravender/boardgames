"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
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
  User,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { RouterOutputs } from "@board-games/api";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
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
} from "@board-games/ui/form";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { Separator } from "@board-games/ui/separator";

import { useTRPC } from "~/trpc/react";
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
  .superRefine((values, ctx) => {
    if (!values.scoresheets.some((scoresheet) => scoresheet.accept === true)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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

  const { data: usersGames } = useSuspenseQuery(
    trpc.sharing.getUserGamesForLinking.queryOptions(),
  );
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

  const form = useForm<FormValues>({
    resolver: zodResolver(gamesFormSchema),
    defaultValues: {
      playerOption: "new",
      existingPlayerId: null,
      games: player.games.map((pGame) => {
        if (pGame.type === "request") {
          return {
            type: "request",
            sharedId: pGame.shareId,
            gameOption: "new",
            existingGameId: null,
            accept: true,
            matches: pGame.matches.map((pMatch) => {
              return {
                sharedId: pMatch.shareId,
                accept: true,
              };
            }),
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (pGame.type === "shared") {
          return {
            type: "shared",
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
      games: data.games,
    });
  };

  const handlePlayerSelect = (playerId: number) => {
    form.setValue("existingPlayerId", playerId);
    setPlayerSearchOpen(false);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Player: {player.item.name}{" "}
                  {foundPlayer && (
                    <span className="text-xs text-green-600">
                      (Exact match Found)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Shared by {player.item.createdBy.name ?? "Unknown"}
                </CardDescription>
              </div>
              <Badge
                variant={player.permission === "edit" ? "default" : "secondary"}
              >
                {player.permission === "edit" ? "Edit Access" : "View Only"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 shadow">
                <AvatarImage
                  className="object-cover"
                  src={player.item.image?.url ?? ""}
                  alt={player.item.name}
                />
                <AvatarFallback className="bg-slate-300">
                  <User />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{player.item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {player.games.length} games, {player.players.length} other
                  players
                </p>
              </div>
            </div>
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
                        onValueChange={field.onChange}
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
                            <p className="text-sm text-muted-foreground">
                              Add {player.item.name} as a new player in your
                              collection
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
                            <p className="mb-2 text-sm text-muted-foreground">
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
                                                      value={fPlayer.name}
                                                      onSelect={() =>
                                                        handlePlayerSelect(
                                                          fPlayer.id,
                                                        )
                                                      }
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6 shadow">
                                                          <AvatarImage
                                                            className="object-cover"
                                                            src={
                                                              fPlayer.image
                                                                ?.url ?? ""
                                                            }
                                                            alt={fPlayer.name}
                                                          />
                                                          <AvatarFallback className="bg-slate-300">
                                                            <User />
                                                          </AvatarFallback>
                                                        </Avatar>
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
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button">
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
