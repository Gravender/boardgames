"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, User, Users, X } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import type { UseFieldArrayAppend } from "@board-games/ui/form";
import {
  insertMatchSchema,
  insertPlayerSchema,
} from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

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
  const [isOpen, setIsOpen] = useState(false);
  const { data: locations } = useSuspenseQuery(
    trpc.location.getLocations.queryOptions(),
  );
  const { data: scoreSheets } = useSuspenseQuery(
    trpc.game.getGameScoresheets.queryOptions({ gameId: gameId }),
  );
  const { data: players } = useSuspenseQuery(
    trpc.player.getPlayersByGame.queryOptions({ game: { id: gameId } }),
  );
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-[800px] sm:p-6">
        <Content
          gameId={gameId}
          gameName={gameName}
          matches={matches}
          locations={locations}
          scoresheets={scoreSheets}
          players={players}
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
const matchSchema = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true });
const locationSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    type: z.literal("original").or(z.literal("shared")),
    isDefault: z.boolean(),
  })
  .nullish();
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
type matchPlayers = z.infer<typeof playersSchema>;
function Content({
  matches,
  gameId,
  gameName,
  locations,
  scoresheets,
  players,
  setIsOpen,
}: {
  gameId: Game["id"];
  gameName: Game["name"];
  matches: number;
  locations: RouterOutputs["location"]["getLocations"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
  players: RouterOutputs["player"]["getPlayersByGame"];
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [isPlayers, setIsPlayers] = useState(false);
  const [matchPlayers, setMatchPlayers] = useState<matchPlayers>([]);
  return (
    <>
      {isPlayers ? (
        <AddPlayersForm
          gameId={gameId}
          matchPlayers={matchPlayers}
          setMatchPlayers={setMatchPlayers}
          players={players}
          setIsPlayers={setIsPlayers}
        />
      ) : (
        <AddMatchForm
          gameId={gameId}
          gameName={gameName}
          matches={matches}
          locations={locations}
          scoresheets={scoresheets}
          matchPlayers={matchPlayers}
          setIsOpen={setIsOpen}
          setIsPlayers={setIsPlayers}
        />
      )}
    </>
  );
}

const AddMatchForm = ({
  gameId,
  gameName,
  matches,
  locations,
  scoresheets,
  matchPlayers,
  setIsOpen,
  setIsPlayers,
}: {
  gameId: Game["id"];
  gameName: Game["name"];
  matches: number;
  locations: RouterOutputs["location"]["getLocations"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
  matchPlayers: matchPlayers;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  setIsPlayers: Dispatch<SetStateAction<boolean>>;
}) => {
  const formSchema = matchSchema.extend({
    players: playersSchema,
    location: locationSchema,
    scoresheet: z
      .object({
        id: z.number(),
        scoresheetType: z.literal("original").or(z.literal("shared")),
      })
      .refine(
        (s) =>
          scoresheets.find(
            (scoresheet) =>
              scoresheet.id === s.id &&
              scoresheet.scoresheetType === s.scoresheetType,
          ) !== undefined,
        { message: "Must select a scoresheet" },
      ),
  });
  type formSchemaType = z.infer<typeof formSchema>;

  const trpc = useTRPC();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");

  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      name: `${gameName} #${matches + 1}`,
      date: new Date(),
      players: matchPlayers,
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
    },
  });
  const createMatch = useMutation(
    trpc.match.createMatch.mutationOptions({
      onSuccess: (response) => {
        void Promise.all([
          queryClient.invalidateQueries(
            trpc.player.getPlayersByGame.queryFilter({ game: { id: gameId } }),
          ),
          queryClient.invalidateQueries(trpc.player.getPlayers.queryOptions()),
          queryClient.invalidateQueries(
            trpc.game.getGame.queryOptions({ id: gameId }),
          ),
          queryClient.invalidateQueries(trpc.dashboard.pathFilter()),
        ]);
        router.push(`/dashboard/games/${gameId}/${response.id}`);
        setIsSubmitting(false);
      },
    }),
  );

  const createLocation = useMutation(
    trpc.location.create.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries(
          trpc.location.getLocations.queryOptions(),
        );
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

const AddPlayersFormSchema = z.object({
  players: playersSchema,
});
type addPlayersFormType = z.infer<typeof AddPlayersFormSchema>;
const AddPlayersForm = ({
  gameId,
  matchPlayers,
  setMatchPlayers,
  players,
  setIsPlayers,
}: {
  gameId: number;
  matchPlayers: matchPlayers;
  setMatchPlayers: Dispatch<SetStateAction<matchPlayers>>;
  players: NonNullable<RouterOutputs["player"]["getPlayersByGame"]>;
  setIsPlayers: Dispatch<SetStateAction<boolean>>;
}) => {
  const trpc = useTRPC();
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroups, setShowGroups] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [teamCount, setTeamCount] = useState(
    matchPlayers.reduce((acc, player) => {
      if (player.team !== null) {
        return Math.max(acc, player.team);
      }
      return acc;
    }, 0),
  );

  const { data: groups } = useQuery(trpc.group.getGroups.queryOptions());

  const currentUser = players.find((player) => player.isUser);
  const form = useForm({
    schema: AddPlayersFormSchema,
    defaultValues: {
      players:
        matchPlayers.length > 0
          ? matchPlayers
          : currentUser
            ? [
                {
                  id: currentUser.id,
                  imageUrl: currentUser.image?.url ?? "",
                  name: currentUser.name,
                  matches: currentUser.matches,
                  team: null,
                },
              ]
            : [],
    },
  });
  const { append, remove, update } = useFieldArray({
    control: form.control,
    name: "players",
  });
  const onSubmit = (data: addPlayersFormType) => {
    setMatchPlayers(data.players);
    setIsPlayers(false);
  };

  const handleAddGroup = (
    group: NonNullable<RouterOutputs["group"]["getGroups"]>[number],
  ) => {
    group.players.forEach((player) => {
      const playerExists = players.find((p) => p.id === player.id);
      if (playerExists) {
        const playerSelected = form
          .getValues("players")
          .find((p) => p.id === player.id);
        if (!playerSelected) {
          append({
            id: player.id,
            imageUrl: playerExists.image?.url ?? "",
            name: playerExists.name,
            matches: playerExists.matches,
            team: null,
          });
        }
      }
    });
    setShowGroups(false);
  };

  if (showAddPlayer) {
    return (
      <AddPlayerForm
        gameId={gameId}
        addMatchPlayer={append}
        setIsAddPlayer={setShowAddPlayer}
      />
    );
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Players</DialogTitle>
        <DialogDescription>Add players to your match</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => setShowGroups(!showGroups)}>
          <Users className="h-4 w-4" />
          Groups
        </Button>
        <Button variant="outline" onClick={() => setShowAddPlayer(true)}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="players"
            render={() => (
              <FormItem>
                {showGroups && groups ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Select a Group</h3>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {groups
                          .filter((group) =>
                            group.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                          )
                          .map((group) => (
                            <Card
                              key={group.id}
                              className="cursor-pointer hover:bg-accent/50"
                              onClick={() => handleAddGroup(group)}
                            >
                              <CardHeader className="p-3">
                                <CardTitle className="text-base">
                                  {group.name}
                                </CardTitle>
                                <CardDescription>
                                  {group.players.length} player
                                  {group.players.length !== 1 ? "s" : ""}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <div className="flex flex-wrap gap-1">
                                  {group.players.slice(0, 5).map((player) => (
                                    <Badge key={player.id} variant="secondary">
                                      {player.name}
                                    </Badge>
                                  ))}
                                  {group.players.length > 5 && (
                                    <Badge variant="secondary">
                                      +{group.players.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 px-2">
                      <FormLabel>
                        {`${form.getValues("players").length} player${form.getValues("players").length !== 1 ? "s" : ""} Selected`}
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Teams:</span>
                        <Select
                          value={teamCount.toString()}
                          onValueChange={(value) => {
                            setTeamCount(Number.parseInt(value));
                            if (value === "0") {
                              const currentPlayers = form.getValues("players");
                              const newPlayers = currentPlayers.map(
                                (player) => {
                                  return {
                                    ...player,
                                    team: null,
                                  };
                                },
                              );
                              form.setValue("players", newPlayers);
                            } else {
                              const currentPlayers = form.getValues("players");
                              const newPlayers = currentPlayers.map(
                                (player) => {
                                  if (
                                    player.team !== null &&
                                    player.team > Number.parseInt(value)
                                  ) {
                                    return {
                                      ...player,
                                      team: null,
                                    };
                                  }
                                  return player;
                                },
                              );
                              form.setValue("players", newPlayers);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <ScrollArea className="sm:p-1">
                      <div className="grid max-h-[25rem] gap-2 rounded-lg sm:max-h-[40rem]">
                        {players
                          .filter((player) =>
                            player.name
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                          )
                          .toSorted((a, b) => {
                            const foundA = form
                              .getValues("players")
                              .find((i) => i.id === a.id);
                            const foundB = form
                              .getValues("players")
                              .find((i) => i.id === b.id);
                            if (foundA && foundB) {
                              return 0;
                            }
                            if (foundA) {
                              return -1;
                            }
                            if (foundB) {
                              return 1;
                            }
                            if (a.matches === b.matches) {
                              return a.name.localeCompare(b.name);
                            }
                            return b.matches - a.matches;
                          })
                          .map((player) => (
                            <FormField
                              key={player.id}
                              control={form.control}
                              name="players"
                              render={({ field }) => {
                                const foundPlayer = field.value.find(
                                  (i) => i.id === player.id,
                                );
                                return (
                                  <FormItem
                                    key={player.id}
                                    className={cn(
                                      "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-1 sm:p-2",
                                      foundPlayer
                                        ? "bg-violet-400/50"
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
                                            ? append({
                                                id: player.id,
                                                imageUrl:
                                                  player.image?.url ?? "",
                                                name: player.name,
                                                matches: player.matches,
                                                team: null,
                                              })
                                            : remove(
                                                field.value.findIndex(
                                                  (i) => i.id === player.id,
                                                ),
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="flex w-full items-center justify-between gap-1 text-sm font-normal sm:gap-2">
                                      <div className="flex items-center gap-1 sm:gap-2">
                                        <Avatar className="h-8 w-8">
                                          {player.image?.url ? (
                                            <AvatarImage
                                              src={player.image.url}
                                              alt={player.name}
                                            />
                                          ) : (
                                            <AvatarFallback>
                                              {player.name
                                                .substring(0, 2)
                                                .toUpperCase()}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div>
                                          <div className="text-sm font-medium">
                                            {player.name}
                                            {player.isUser && (
                                              <Badge
                                                variant="outline"
                                                className="ml-2 text-xs"
                                              >
                                                You
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {player.matches} matches
                                          </div>
                                        </div>
                                      </div>
                                    </FormLabel>
                                    <div className="flex items-center gap-2">
                                      {teamCount > 0 && foundPlayer && (
                                        <Select
                                          value={
                                            foundPlayer.team
                                              ? foundPlayer.team.toString()
                                              : "0"
                                          }
                                          onValueChange={(value) => {
                                            if (value === "0") {
                                              update(
                                                field.value.findIndex(
                                                  (i) => i.id === player.id,
                                                ),
                                                { ...foundPlayer, team: null },
                                              );
                                              return;
                                            }

                                            if (Number.parseInt(value) > 0) {
                                              update(
                                                field.value.findIndex(
                                                  (i) => i.id === player.id,
                                                ),
                                                {
                                                  ...foundPlayer,
                                                  team: Number.parseInt(value),
                                                },
                                              );
                                              return;
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="h-8 w-[90px]">
                                            <SelectValue placeholder="No team" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">
                                              No team
                                            </SelectItem>
                                            {Array.from({
                                              length: teamCount,
                                            }).map((_, i) => (
                                              <SelectItem
                                                key={i + 1}
                                                value={(i + 1).toString()}
                                              >
                                                Team {i + 1}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                      {field.value.findIndex(
                                        (i) => i.id === player.id,
                                      ) > -1 && <Badge>Selected</Badge>}
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => setIsPlayers(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
const addPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema,
});
const AddPlayerForm = ({
  gameId,
  addMatchPlayer,
  setIsAddPlayer,
}: {
  gameId: number;
  addMatchPlayer: UseFieldArrayAppend<addPlayersFormType, "players">;
  setIsAddPlayer: Dispatch<SetStateAction<boolean>>;
}) => {
  const trpc = useTRPC();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  const queryClient = useQueryClient();

  const form = useForm({
    schema: addPlayerSchema,
    defaultValues: {
      name: "",
      imageUrl: null,
    },
  });
  const createPlayer = useMutation(
    trpc.player.create.mutationOptions({
      onSuccess: (player) => {
        setIsUploading(false);
        addMatchPlayer({
          id: player.id,
          imageUrl: player.image?.url ?? "",
          name: player.name,
          matches: 0,
          team: null,
        });
        void Promise.all([
          queryClient.invalidateQueries(
            trpc.player.getPlayersByGame.queryFilter({
              game: { id: gameId },
            }),
          ),
          queryClient.invalidateQueries(trpc.player.getPlayers.queryOptions()),
          queryClient.invalidateQueries(
            trpc.dashboard.getPlayers.queryOptions(),
          ),
        ]);
        setIsAddPlayer(false);
        toast("Player created successfully!");
      },
    }),
  );
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function onSubmit(values: z.infer<typeof addPlayerSchema>) {
    setIsUploading(true);
    if (!values.imageUrl) {
      createPlayer.mutate({
        name: values.name,
        imageId: null,
      });
      return;
    }

    try {
      const imageFile = values.imageUrl;

      const uploadResult = await startUpload([imageFile], {
        usageType: "player",
      });
      if (!uploadResult) {
        throw new Error("Image upload failed");
      }

      const imageId = uploadResult[0]
        ? uploadResult[0].serverData.imageId
        : null;

      createPlayer.mutate({
        name: values.name,
        imageId: imageId,
      });
      form.reset();
      setImagePreview(null); // Clear the image preview
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast.error("Error", {
        description: "There was a problem uploading your Image.",
      });
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Player</DialogTitle>
        <DialogDescription>
          Create a new player to add to your match.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Player Name</FormLabel>
                <FormControl>
                  <Input placeholder="Player name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-4">
                    <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Player image"
                          className="aspect-square h-full w-full rounded-sm object-cover"
                          fill
                        />
                      ) : (
                        <User className="h-full w-full items-center justify-center rounded-full bg-muted p-2" />
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        field.onChange(file);
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setImagePreview(url);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription>Upload an image (max 4MB).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => setIsAddPlayer(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Spinner />
                  <span>Uploading...</span>
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
