"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Dices,
  Loader2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { RouterOutputs } from "@board-games/api";
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

type Match = Extract<
  RouterOutputs["sharing"]["getShareRequest"],
  { itemType: "match" }
>;
export default function MatchRequestPage({
  match,
  requestId,
}: {
  match: Match;
  requestId: number;
}) {
  const trpc = useTRPC();

  const { data: usersGames } = useSuspenseQuery(
    trpc.sharing.getUserGamesForLinking.queryOptions(),
  );
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [gameSearchOpen, setGameSearchOpen] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState("");
  const [players, setPlayers] = useState<
    { sharedId: number; accept: boolean; linkedId: number | null }[]
  >([]);

  const childScoresheets = useMemo(() => {
    return match.childItems.filter((item) => item.itemType === "scoresheet");
  }, [match.childItems]);
  const childPlayers = useMemo(() => {
    return match.childItems.filter((item) => item.itemType === "player");
  }, [match.childItems]);
  const gameChildItem = useMemo(() => {
    return match.childItems.find((item) => item.itemType === "game");
  }, [match.childItems]);
  const filteredGames = useMemo(() => {
    return usersGames.filter((game) =>
      game.name.toLowerCase().includes(gameSearchQuery.toLowerCase()),
    );
  }, [usersGames, gameSearchQuery]);
  const foundGame = useMemo(() => {
    return usersGames.find(
      (g) => g.name.toLowerCase() === match.item.game.name.toLowerCase(),
    );
  }, [match.item.game.name, usersGames]);

  const potentialMatches = useMemo(() => {
    if (!match.sharedGame) {
      return [];
    }
    const sharedMatches = match.sharedGame.matches.filter((m) =>
      isSameDay(match.item.date, m.match.date),
    );
    const linkedMatches = match.sharedGame.linkedGame?.matches.filter((m) =>
      isSameDay(match.item.date, m.date),
    );
    if (linkedMatches) {
      return [
        ...sharedMatches.map((sMatch) => ({
          type: "shared" as const,
          ...sMatch,
        })),
        ...linkedMatches.map((lMatch) => ({
          type: "linked" as const,
          ...lMatch,
        })),
      ];
    }
    return sharedMatches.map((sMatch) => ({
      type: "shared" as const,
      ...sMatch,
    }));
  }, [match.item.date, match.sharedGame]);

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
    .superRefine((values, ctx) => {
      if (
        !values.scoresheets.some((scoresheet) => scoresheet.accept === true)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You must accept at least one scoresheet",
          path: ["scoresheets"],
        });
      }
    });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gameOption: "new",
      existingGameId: null,
      scoresheets: childScoresheets.map((scoresheet) => ({
        sharedId: scoresheet.shareId,
        accept: true,
      })),
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    console.log(data);
  };
  const handleGameSelect = (gameId: number) => {
    form.setValue("existingGameId", gameId);
    setGameSearchOpen(false);
  };
  console.log(match);
  if ("sharedGame" in match) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded shadow">
                  {match.item.game.image?.url ? (
                    <Image
                      fill
                      src={match.item.game.image.url}
                      alt={`${match.item.game.name} game image`}
                      className="aspect-square h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                  )}
                </div>
                {match.item.name}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(match.item.date, "d MMM yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(match.item.duration)}
                </span>
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Badge
                variant={match.permission === "edit" ? "default" : "secondary"}
              >
                {match.permission === "edit" ? "Edit Access" : "View Only"}
              </Badge>
              {potentialMatches.length > 0 && (
                <span className="font-medium text-green-600">
                  (Possible Match Found)
                </span>
              )}
            </div>
          </div>
          {match.item.comment && (
            <div className="mt-2">
              <span className="text-sm font-semibold">Comment:</span>
              <p className="text-sm text-muted-foreground">
                {match.item.comment}
              </p>
            </div>
          )}
          {match.item.matchPlayers.length > 0 && (
            <div>
              <span className="text-sm font-semibold">Players:</span>
              <p className="text-sm text-muted-foreground">
                {match.item.matchPlayers
                  .map((player) => player.player.name)
                  .join(", ")}
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {potentialMatches.length > 0 && (
            <Accordion type="multiple" className="w-full">
              <AccordionItem value={`match-${match.item.id}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full">
                    <div className="text-left">
                      <span className="text-lg font-semibold">
                        Possible Matches from shared or linked game on same
                        Date:
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {potentialMatches.map((potentialMatch) => {
                    if (potentialMatch.type === "shared") {
                      return (
                        <div
                          key={potentialMatch.id}
                          className="flex items-center justify-between space-x-2"
                        >
                          <Label
                            htmlFor={`match-${match.item.id}-link-${potentialMatch.id}`}
                          >
                            <div>
                              <p>{potentialMatch.match.name}</p>
                              <ul className="text-xs text-muted-foreground">
                                <li>
                                  Date: {format(match.item.date, "d MMM yyyy")}
                                </li>
                                {potentialMatch.match.location && (
                                  <li>
                                    {`Location: ${potentialMatch.match.location.name}`}
                                  </li>
                                )}
                                {potentialMatch.match.matchPlayers.length >
                                  0 && (
                                  <li className="flex flex-row gap-2">
                                    <span className="font-semibold">
                                      Winners:
                                    </span>
                                    <span className="flex max-w-28 flex-wrap">
                                      {potentialMatch.match.matchPlayers
                                        .filter((mPlayer) => mPlayer.winner)
                                        .map((player) => player.player.name)
                                        .join(", ")}
                                    </span>
                                  </li>
                                )}
                              </ul>
                            </div>
                          </Label>
                          {
                            //TODO add tool tip for this button
                          }
                          <Button
                            type="button"
                            variant="outline"
                            value={potentialMatch.id.toString()}
                            id={`match-${match.item.id}-link-${potentialMatch.id}`}
                            onClick={() => console.log(1)}
                          >
                            Same Match (Reject Share Match)
                          </Button>
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={potentialMatch.id}
                          className="flex items-center justify-between space-x-2"
                        >
                          <Label
                            htmlFor={`match-${match.item.id}-link-${potentialMatch.id}`}
                          >
                            <div>
                              <p>{potentialMatch.name}</p>
                              <ul className="text-xs text-muted-foreground">
                                <li>
                                  Date: {format(match.item.date, "d MMM yyyy")}
                                </li>
                                {potentialMatch.location && (
                                  <li>
                                    {`Location: ${potentialMatch.location.name}`}
                                  </li>
                                )}
                                {potentialMatch.matchPlayers.length > 0 && (
                                  <li className="flex flex-row gap-2">
                                    <span className="font-semibold">
                                      Winners:
                                    </span>
                                    <span className="flex max-w-28 flex-wrap">
                                      {potentialMatch.matchPlayers
                                        .filter((mPlayer) => mPlayer.winner)
                                        .map((player) => player.player.name)
                                        .join(", ")}
                                    </span>
                                  </li>
                                )}
                              </ul>
                            </div>
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            value={potentialMatch.id.toString()}
                            id={`match-${match.item.id}-link-${potentialMatch.id}`}
                            onClick={() => console.log(2)}
                          >
                            Same Match (Reject Share Match)
                          </Button>
                        </div>
                      );
                    }
                  })}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          {childPlayers.length > 0 && (
            <>
              <ChildPlayersRequest
                childPlayers={childPlayers}
                players={players}
                setPlayers={setPlayers}
              />
            </>
          )}
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
    );
  } else if (gameChildItem) {
    const filteredMatches =
      usersGames
        .find((g) => g.id === form.getValues("existingGameId"))
        ?.matches.filter((m) => isSameDay(match.item.date, m.date)) ?? [];
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded shadow">
                      {match.item.game.image?.url ? (
                        <Image
                          fill
                          src={match.item.game.image.url}
                          alt={`${match.item.game.name} game image`}
                          className="aspect-square h-full w-full rounded-md object-cover"
                        />
                      ) : (
                        <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                      )}
                    </div>
                    {match.item.name}
                  </CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(match.item.date, "d MMM yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(match.item.duration)}
                    </span>
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    match.permission === "edit" ? "default" : "secondary"
                  }
                >
                  {match.permission === "edit" ? "Edit Access" : "View Only"}
                </Badge>
              </div>
              {match.item.comment && (
                <div className="mt-2">
                  <span className="text-sm font-semibold">Comment:</span>
                  <p className="text-sm text-muted-foreground">
                    {match.item.comment}
                  </p>
                </div>
              )}
              {match.item.matchPlayers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">Winners:</span>
                  <p className="text-sm text-muted-foreground">
                    {match.item.matchPlayers
                      .filter((mPlayer) => mPlayer.winner)
                      .map((player) => player.player.name)
                      .join(", ")}
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Game:</h3>
                <div>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{match.item.game.name}</h4>
                      {match.item.game.yearPublished && (
                        <span className="mr-2">
                          ({match.item.game.yearPublished})
                        </span>
                      )}
                      {match.item.game.playersMin &&
                        match.item.game.playersMax && (
                          <span className="mr-2">
                            {match.item.game.playersMin ===
                            match.item.game.playersMax
                              ? `${match.item.game.playersMin} players`
                              : `${match.item.game.playersMin}-${match.item.game.playersMax} players`}
                          </span>
                        )}
                      {match.item.game.playtimeMin &&
                        match.item.game.playtimeMax && (
                          <span>
                            {match.item.game.playtimeMin ===
                            match.item.game.playtimeMax
                              ? `${match.item.game.playtimeMin} min`
                              : `${match.item.game.playtimeMin}-${match.item.game.playtimeMax} min`}
                          </span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Badge
                        variant={
                          gameChildItem.permission === "edit"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {gameChildItem.permission === "edit"
                          ? "Edit Access"
                          : "View Only"}
                      </Badge>
                      {filteredMatches.length > 0 && (
                        <span className="flex max-w-10 flex-row flex-wrap font-medium text-green-600 sm:max-w-40">
                          (Possible Match Found)
                        </span>
                      )}
                    </div>
                  </div>
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
                                <Label
                                  htmlFor="new-game"
                                  className="font-medium"
                                >
                                  Create as a new game
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Add {match.item.game.name} as a new game in
                                  your collection{" "}
                                  {foundGame
                                    ? "(Possible Duplicate Found)"
                                    : ""}
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
                                <p className="mb-2 text-sm text-muted-foreground">
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
                                                  onValueChange={
                                                    setGameSearchQuery
                                                  }
                                                />
                                                <CommandEmpty>
                                                  No games found.
                                                </CommandEmpty>
                                                <CommandList>
                                                  <CommandGroup>
                                                    {filteredGames.map(
                                                      (fGame) => (
                                                        <CommandItem
                                                          key={fGame.id}
                                                          value={fGame.name}
                                                          onSelect={() =>
                                                            handleGameSelect(
                                                              fGame.id,
                                                            )
                                                          }
                                                        >
                                                          <Check
                                                            className={`mr-2 h-4 w-4 ${
                                                              field.value ===
                                                              fGame.id
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            }`}
                                                          />
                                                          <div>
                                                            <p>
                                                              {fGame.name}
                                                              {fGame.name.toLowerCase() ===
                                                              match.item.game.name.toLowerCase()
                                                                ? " (Possible Duplicate Found)"
                                                                : ""}
                                                            </p>
                                                            {(fGame.yearPublished ??
                                                              fGame.playersMin) && (
                                                              <p className="text-xs text-muted-foreground">
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
              </div>
              {filteredMatches.length > 0 && (
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value={`match-${match.item.id}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex w-full">
                        <div className="text-left">
                          <span className="text-lg font-semibold">
                            Possible Matches from shared or linked game on same
                            Date
                          </span>
                          {filteredMatches.length > 0 && (
                            <span className="flex max-w-10 flex-row flex-wrap font-medium text-green-600 sm:max-w-40">
                              (Possible Match Found)
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {filteredMatches.map((potentialMatch) => {
                        return (
                          <div
                            key={potentialMatch.id}
                            className="flex items-center justify-between space-x-2"
                          >
                            <Label
                              htmlFor={`match-${match.item.id}-link-${potentialMatch.id}`}
                            >
                              <div>
                                <p>{potentialMatch.name}</p>
                                <ul className="text-xs text-muted-foreground">
                                  <li className="flex flex-row gap-2">
                                    <span className="font-semibold">Date:</span>
                                    <span>
                                      {format(match.item.date, "d MMM yyyy")}
                                    </span>
                                  </li>
                                  {potentialMatch.location && (
                                    <li className="flex flex-row gap-2">
                                      <span className="font-semibold">
                                        Location:
                                      </span>
                                      <span>
                                        {potentialMatch.location.name}
                                      </span>
                                    </li>
                                  )}
                                  {potentialMatch.matchPlayers.length > 0 && (
                                    <li className="flex flex-row gap-2">
                                      <span className="font-semibold">
                                        Winners:
                                      </span>
                                      <span className="flex max-w-28 flex-wrap">
                                        {potentialMatch.matchPlayers
                                          .filter((mPlayer) => mPlayer.winner)
                                          .map((player) => player.player.name)
                                          .join(", ")}
                                      </span>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              value={potentialMatch.id.toString()}
                              id={`match-${match.item.id}-link-${potentialMatch.id}`}
                              onClick={() => console.log(2)}
                              className="flex h-14 max-w-20 flex-row flex-wrap text-wrap sm:h-10 sm:max-w-32"
                            >
                              Same Match
                            </Button>
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {childScoresheets.length > 0 && (
                <>
                  {filteredMatches.length === 0 && <Separator />}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Scoresheets</h3>
                      <p className="text-sm text-muted-foreground">
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
  } else {
    return <div>Not implemented</div>;
  }
}
