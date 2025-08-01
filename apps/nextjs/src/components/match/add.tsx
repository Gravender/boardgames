"use client";

import type { Dispatch, SetStateAction } from "react";
import type { z } from "zod/v4";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import type { RouterOutputs } from "@board-games/api";
import type { UseFormReturn } from "@board-games/ui/form";
import { addMatchSchema } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
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
  useForm,
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
import { toast } from "@board-games/ui/toast";

import type { Player, Team } from "~/components/match/players/selector";
import { AddPlayersDialogForm } from "~/components/match/players/selector";
import { Spinner } from "~/components/spinner";
import { useInvalidateGame, useInvalidateGames } from "~/hooks/invalidate/game";
import { useInvalidateLocations } from "~/hooks/invalidate/location";
import {
  useInvalidatePlayer,
  useInvalidatePlayers,
} from "~/hooks/invalidate/player";
import { useTRPC } from "~/trpc/react";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;

export function AddMatchDialog({
  gameId,
  gameType,
  gameName,
  matches,
}: {
  gameId: Game["id"];
  gameType: "shared" | "original";
  gameName: Game["name"];
  matches: number;
}) {
  const trpc = useTRPC();
  const [isOpen, setIsOpen] = useState(false);
  const { data: locations } = useSuspenseQuery(
    trpc.location.getLocations.queryOptions(),
  );
  const { data: scoreSheets } = useSuspenseQuery(
    trpc.game.getGameScoresheets.queryOptions({
      gameId: gameId,
      type: gameType,
    }),
  );
  const { data: players } = useSuspenseQuery(
    trpc.player.getPlayersByGame.queryOptions({ id: gameId, type: gameType }),
  );
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="gap-2 p-4 sm:max-w-[800px] sm:gap-4 sm:p-6">
        <Content
          gameId={gameId}
          gameType={gameType}
          gameName={gameName}
          matches={matches}
          locations={locations}
          scoresheets={scoreSheets}
          gamePlayers={players}
          setIsOpen={setIsOpen}
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

function Content({
  matches,
  gameId,
  gameType,
  gameName,
  locations,
  scoresheets,
  gamePlayers,
  setIsOpen,
}: {
  gameId: Game["id"];
  gameType: "original" | "shared";
  gameName: Game["name"];
  matches: number;
  locations: RouterOutputs["location"]["getLocations"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
  gamePlayers: RouterOutputs["player"]["getPlayersByGame"];
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [isPlayers, setIsPlayers] = useState(false);
  const currentUser = gamePlayers.find((player) => player.isUser);
  const form = useForm({
    schema: addMatchSchema.refine(
      (s) =>
        scoresheets.find(
          (scoresheet) =>
            scoresheet.id === s.scoresheet.id &&
            scoresheet.scoresheetType === s.scoresheet.scoresheetType,
        ) !== undefined,
      { message: "Must select a scoresheet", path: ["scoresheet"] },
    ),
    defaultValues: {
      name: `${gameName} #${matches + 1}`,
      date: new Date(),
      players: currentUser
        ? [
            {
              id: currentUser.id,
              type: currentUser.type,
              imageUrl: currentUser.image?.url ?? "",
              name: currentUser.name,
              matches: currentUser.matches,
              teamId: null,
              roles: [],
            },
          ]
        : [],
      location: locations.find((location) => location.isDefault),
      scoresheet:
        scoresheets.find(
          (scoresheet) =>
            scoresheet.type === "Default" &&
            scoresheet.scoresheetType === "original",
        ) ??
        scoresheets.find(
          (scoresheet) =>
            scoresheet.type === "Default" &&
            scoresheet.scoresheetType === "shared",
        ) ??
        scoresheets.find((scoresheet) => scoresheet.type === "Default") ??
        scoresheets[0] ??
        undefined,
      teams: [],
    },
  });
  const setPlayersAndTeams = (players: Player[], teams: Team[]) => {
    form.setValue("players", players);
    form.setValue("teams", teams);
    setIsPlayers(false);
  };

  return (
    <>
      {isPlayers ? (
        <AddPlayersDialogForm
          game={{
            id: gameId,
            type: gameType,
          }}
          players={form.getValues("players")}
          teams={form.getValues("teams")}
          setPlayersAndTeams={setPlayersAndTeams}
          cancel={() => setIsPlayers(false)}
        />
      ) : (
        <AddMatchForm
          gameId={gameId}
          gameType={gameType}
          form={form}
          locations={locations}
          scoresheets={scoresheets}
          setIsOpen={setIsOpen}
          setIsPlayers={setIsPlayers}
        />
      )}
    </>
  );
}

const AddMatchForm = ({
  gameId,
  gameType,
  locations,
  scoresheets,
  form,
  setIsOpen,
  setIsPlayers,
}: {
  gameId: Game["id"];
  gameType: "original" | "shared";
  locations: RouterOutputs["location"]["getLocations"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
  form: UseFormReturn<z.infer<typeof addMatchSchema>>;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  setIsPlayers: Dispatch<SetStateAction<boolean>>;
}) => {
  const trpc = useTRPC();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");

  const router = useRouter();
  const invalidatePlayers = useInvalidatePlayers();
  const invalidateLocations = useInvalidateLocations();
  const invalidateGames = useInvalidateGames();
  const invalidateGame = useInvalidateGame();
  const invalidatePlayer = useInvalidatePlayer();
  const posthog = usePostHog();

  const createMatch = useMutation(
    trpc.match.createMatch.mutationOptions({
      onSuccess: async (response) => {
        const playersToInvalidate = response.players.flatMap((p) => {
          return invalidatePlayer(p.playerId);
        });
        await Promise.all([
          ...invalidateGames(),
          ...invalidateGame(response.match.gameId, "original"),
          ...invalidatePlayers(),
          ...playersToInvalidate,
        ]);
        router.push(
          `/dashboard/games/${response.match.gameId}/${response.match.id}`,
        );
        setIsSubmitting(false);
      },
      onError: (error) => {
        posthog.capture("match create error", { error, gameId, gameType });
        toast.error("Error", {
          description: "There was a problem adding your match.",
        });

        throw new Error("There was a problem adding your match.");
      },
    }),
  );

  const createLocation = useMutation(
    trpc.location.create.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([invalidateLocations()]);
        setNewLocation("");
        setShowAddLocation(false);
        form.setValue("location", {
          id: result.id,
          type: "original",
          name: result.name,
          isDefault: result.isDefault,
        });
      },
    }),
  );

  const onSubmit = (values: z.infer<typeof addMatchSchema>) => {
    setIsSubmitting(true);
    posthog.capture("add match begin", {
      gameId: gameId,
    });
    const mappedTeams = values.players.reduce<
      Record<
        string,
        {
          name: string;
          players: {
            type: "original" | "shared";
            id: number;
            roles: number[];
          }[];
        }
      >
    >((acc, player) => {
      if (player.teamId === null) {
        const noTeam = acc["No Team"];
        if (noTeam) {
          noTeam.players.push({
            type: player.type,
            id: player.id,
            roles: player.roles,
          });
        } else {
          acc["No Team"] = {
            name: "No Team" as const,
            players: [
              { type: player.type, id: player.id, roles: player.roles },
            ],
          };
        }
      } else {
        const foundTeam = values.teams.find((t) => t.id === player.teamId);
        if (!foundTeam) {
          return acc;
        }
        const team = acc[foundTeam.name];
        if (team) {
          team.players.push({
            type: player.type,
            id: player.id,
            roles: player.roles,
          });
        } else {
          acc[foundTeam.name] = {
            name: foundTeam.name,
            players: [
              { type: player.type, id: player.id, roles: player.roles },
            ],
          };
        }
      }
      return acc;
    }, {});
    createMatch.mutate({
      game: {
        id: gameId,
        type: gameType,
      },
      name: values.name,
      date: values.date,
      teams: Object.values(mappedTeams),
      scoresheet: values.scoresheet,
      location: values.location
        ? {
            id: values.location.id,
            type: values.location.type,
          }
        : null,
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
                    disabled={createLocation.isPending}
                    onClick={() => {
                      setIsPlayers(true);
                    }}
                  >
                    {`${field.value.length} Players`}
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
                {!showAddLocation ? (
                  <div className="flex w-full gap-2">
                    <Select
                      onValueChange={(value) => {
                        if (value === "add-new") {
                          field.onChange(null);
                          setShowAddLocation(true);
                          return;
                        }

                        if (value === "none") {
                          field.onChange(null);
                          return;
                        }
                        const [locationId, locationType] = value.split("-");
                        const selectedLocation = locations.find(
                          (loc) =>
                            loc.id === Number(locationId) &&
                            loc.type === locationType,
                        );
                        field.onChange(
                          selectedLocation
                            ? {
                                id: selectedLocation.id,
                                name: selectedLocation.name,
                                type: selectedLocation.type,
                                isDefault: selectedLocation.isDefault,
                              }
                            : null,
                        );
                      }}
                      value={
                        field.value
                          ? `${field.value.id}-${field.value.type}`
                          : "none"
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Location: - (Optional)">
                            {field.value ? (
                              <div className="flex items-center gap-2">
                                <span>Location:</span>
                                <span>{field.value.name}</span>
                                {field.value.isDefault && (
                                  <span className="font-semibold">
                                    (Default)
                                  </span>
                                )}
                                {field.value.type === "shared" && (
                                  <span className="text-blue-500 dark:text-blue-400">
                                    (Shared)
                                  </span>
                                )}
                              </div>
                            ) : (
                              "Location: - (Optional)"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none" className="hidden">
                          No location
                        </SelectItem>
                        {locations.filter(Boolean).map((location) => (
                          <SelectItem
                            key={`${location.id}-${location.type}`}
                            value={`${location.id}-${location.type}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{location.name}</span>
                              {location.isDefault && (
                                <span className="font-semibold">(Default)</span>
                              )}
                              {location.type === "shared" && (
                                <span className="text-blue-500 dark:text-blue-400">
                                  (Shared)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="add-new" className="text-primary">
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Add new location
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size={"icon"}
                      type="button"
                      className="rounded-full"
                      onClick={() => {
                        field.onChange(null);
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New location name"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        createLocation.mutate({
                          name: newLocation,
                        });
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddLocation(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scoresheet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scoresheet:</FormLabel>
                <Select
                  onValueChange={(e) => {
                    const [id, type] = e.split("-");
                    field.onChange({
                      id: Number(id),
                      scoresheetType: type as "original" | "shared",
                    });
                  }}
                  defaultValue={`${field.value.id}-${field.value.scoresheetType}`}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scoresheet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {scoresheets.map((scoresheet) => {
                      return (
                        <SelectItem
                          key={`${scoresheet.id}-${scoresheet.scoresheetType}`}
                          value={`${scoresheet.id}-${scoresheet.scoresheetType}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{scoresheet.name}</span>
                            {scoresheet.scoresheetType === "shared" && (
                              <Badge
                                variant="outline"
                                className="bg-blue-500 text-white"
                              >
                                Shared
                              </Badge>
                            )}
                          </div>
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
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createLocation.isPending}
            >
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
};
