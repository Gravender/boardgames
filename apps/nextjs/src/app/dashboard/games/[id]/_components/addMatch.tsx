"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Search,
  SquarePen,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import type { UseFieldArrayAppend, UseFormReturn } from "@board-games/ui/form";
import {
  insertMatchSchema,
  insertPlayerSchema,
} from "@board-games/db/zodSchema";
import { fileSchema } from "@board-games/shared";
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
import { Label } from "@board-games/ui/label";
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

import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useInvalidateGame, useInvalidateGames } from "~/hooks/invalidate/game";
import { useInvalidateLocations } from "~/hooks/invalidate/location";
import {
  useInvalidatePlayer,
  useInvalidatePlayers,
} from "~/hooks/invalidate/player";
import { useFilteredRoles } from "~/hooks/use-filtered-roles";
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
  const { data: roles } = useSuspenseQuery(
    trpc.game.getGameRoles.queryOptions({ gameId: gameId }),
  );
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-4 sm:max-w-[800px] sm:p-6">
        <Content
          gameId={gameId}
          gameName={gameName}
          matches={matches}
          locations={locations}
          scoresheets={scoreSheets}
          players={players}
          roles={roles}
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
const roleSchema = z.array(z.number());
const playersSchema = z
  .array(
    insertPlayerSchema
      .pick({ name: true, id: true })
      .required({ name: true, id: true })
      .extend({
        imageUrl: z.string().nullable(),
        matches: z.number(),
        team: z.number().nullable(),
        roles: roleSchema,
      }),
  )
  .refine((players) => players.length > 0, {
    message: "You must add at least one player",
  });
const formSchema = matchSchema.extend({
  players: playersSchema,
  location: locationSchema,
  scoresheet: z.object({
    id: z.number(),
    scoresheetType: z.literal("original").or(z.literal("shared")),
  }),
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      roles: z.array(z.number()),
    }),
  ),
});
function Content({
  matches,
  gameId,
  gameName,
  locations,
  scoresheets,
  players,
  roles,
  setIsOpen,
}: {
  gameId: Game["id"];
  gameName: Game["name"];
  matches: number;
  locations: RouterOutputs["location"]["getLocations"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
  players: RouterOutputs["player"]["getPlayersByGame"];
  roles: RouterOutputs["game"]["getGameRoles"];
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [isPlayers, setIsPlayers] = useState(false);
  const currentUser = players.find((player) => player.isUser);
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      name: `${gameName} #${matches + 1}`,
      date: new Date(),
      players: currentUser
        ? [
            {
              id: currentUser.id,
              imageUrl: currentUser.image?.url ?? "",
              name: currentUser.name,
              matches: currentUser.matches,
              team: null,
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

  return (
    <>
      {isPlayers ? (
        <AddPlayersForm
          parentForm={form}
          players={players}
          roles={roles}
          setIsPlayers={setIsPlayers}
        />
      ) : (
        <AddMatchForm
          gameId={gameId}
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
  locations,
  scoresheets,
  form,
  setIsOpen,
  setIsPlayers,
}: {
  gameId: Game["id"];
  locations: RouterOutputs["location"]["getLocations"];
  scoresheets: RouterOutputs["game"]["getGameScoresheets"];
  form: UseFormReturn<z.infer<typeof formSchema>>;
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
          ...invalidateGame(gameId),
          ...invalidatePlayers(),
          ...playersToInvalidate,
        ]);
        router.push(`/dashboard/games/${gameId}/${response.match.id}`);
        setIsSubmitting(false);
      },
      onError: (error) => {
        posthog.capture("game create error", { error });
        toast.error("Error", {
          description: "There was a problem adding your game.",
        });

        throw new Error("There was a problem adding your game.");
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    posthog.capture("add match begin", {
      gameId: gameId,
    });
    const mappedTeams = values.players.reduce<
      Record<
        string,
        { name: string; players: { id: number; roles: number[] }[] }
      >
    >((acc, player) => {
      if (player.team === null) {
        const noTeam = acc["No Team"];
        if (noTeam) {
          noTeam.players.push({ id: player.id, roles: player.roles });
        } else {
          acc["No Team"] = {
            name: "No Team" as const,
            players: [{ id: player.id, roles: player.roles }],
          };
        }
      } else {
        const foundTeam = values.teams.find((t) => t.id === player.team);
        if (!foundTeam) {
          return acc;
        }
        const team = acc[foundTeam.name];
        if (team) {
          team.players.push({ id: player.id, roles: player.roles });
        } else {
          acc[foundTeam.name] = {
            name: foundTeam.name,
            players: [{ id: player.id, roles: player.roles }],
          };
        }
      }
      return acc;
    }, {});
    createMatch.mutate({
      gameId: gameId,
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

const AddPlayersFormSchema = z.object({
  players: playersSchema,
  teams: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      roles: z.array(z.number()),
    }),
  ),
});
type addPlayersFormType = z.infer<typeof AddPlayersFormSchema>;
const AddPlayersForm = ({
  parentForm,
  players,
  roles,
  setIsPlayers,
}: {
  parentForm: UseFormReturn<z.infer<typeof formSchema>>;
  players: NonNullable<RouterOutputs["player"]["getPlayersByGame"]>;
  roles: NonNullable<RouterOutputs["game"]["getGameRoles"]>;
  setIsPlayers: Dispatch<SetStateAction<boolean>>;
}) => {
  const trpc = useTRPC();
  const [searchTerm, setSearchTerm] = useState("");
  const [showGroups, setShowGroups] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState<number | null>(null);

  const { data: groups } = useQuery(trpc.group.getGroups.queryOptions());

  const currentUser = players.find((player) => player.isUser);
  const form = useForm({
    schema: AddPlayersFormSchema,
    defaultValues: {
      players:
        parentForm.getValues("players").length > 0
          ? parentForm.getValues("players")
          : currentUser
            ? [
                {
                  id: currentUser.id,
                  imageUrl: currentUser.image?.url ?? "",
                  name: currentUser.name,
                  matches: currentUser.matches,
                  team: null,
                  roles: [],
                },
              ]
            : [],
      teams: parentForm.getValues("teams"),
    },
  });
  const { append, remove, update } = useFieldArray({
    control: form.control,
    name: "players",
  });
  const onSubmit = (data: addPlayersFormType) => {
    parentForm.setValue("players", data.players);
    parentForm.setValue("teams", data.teams);
    setIsPlayers(false);
  };
  const onShowTeamModal = () => {
    setShowTeamModal(true);
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
            roles: [],
          });
        }
      }
    });
    setShowGroups(false);
  };
  const formTeams = form.watch("teams");
  const formPlayers = form.watch("players");

  if (showAddPlayer) {
    return (
      <AddPlayerForm
        addMatchPlayer={append}
        setIsAddPlayer={setShowAddPlayer}
      />
    );
  }
  if (showTeamModal) {
    return (
      <ManageTeamContent
        form={form}
        roles={roles}
        setShowTeamModal={setShowTeamModal}
      />
    );
  }
  if (showRoleModal) {
    const foundPlayer = formPlayers.find((p) => p.id === showRoleModal);
    const playerIndex = formPlayers.findIndex((p) => p.id === showRoleModal);
    if (foundPlayer && playerIndex > -1) {
      const foundTeam = formTeams.find((t) => t.id === foundPlayer.team);
      return (
        <ManagePlayerRoles
          player={foundPlayer}
          teamRoles={foundTeam?.roles ?? []}
          roles={roles}
          onClose={() => setShowRoleModal(null)}
          onSave={(roles) => {
            update(playerIndex, {
              ...foundPlayer,
              roles,
            });
            setShowRoleModal(null);
          }}
        />
      );
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Players</DialogTitle>
        <DialogDescription>Add players to your match</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-2 xs:flex-row">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <div className="flex w-full items-center justify-between gap-2 xs:w-auto xs:justify-start">
          <Button variant="outline" onClick={() => setShowGroups(!showGroups)}>
            <Users className="h-4 w-4" />
            Groups
          </Button>
          <Button variant="outline" onClick={() => setShowAddPlayer(true)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
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
                    <ScrollArea className="h-[70vh]">
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
                      <Button
                        variant="outline"
                        onClick={() => {
                          onShowTeamModal();
                        }}
                      >
                        Edit Teams
                      </Button>
                    </div>
                    <ScrollArea className="sm:p-1">
                      <div className="grid max-h-[65vh] gap-2 rounded-lg">
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
                          .map((player) => {
                            return (
                              <FormField
                                key={player.id}
                                control={form.control}
                                name="players"
                                render={({ field }) => {
                                  const foundPlayer = field.value.find(
                                    (i) => i.id === player.id,
                                  );
                                  const playerIndex = field.value.findIndex(
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
                                          checked={playerIndex > -1}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? append({
                                                  id: player.id,
                                                  imageUrl:
                                                    player.image?.url ?? "",
                                                  name: player.name,
                                                  matches: player.matches,
                                                  team: null,
                                                  roles: [],
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
                                          <PlayerImage
                                            className="size-8"
                                            image={player.image}
                                            alt={player.name}
                                          />
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
                                      <div className="flex flex-col items-center gap-2 xs:flex-row">
                                        {foundPlayer && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => {
                                              setShowRoleModal(foundPlayer.id);
                                            }}
                                            className="w-full xs:w-auto"
                                          >
                                            Roles ({foundPlayer.roles.length})
                                          </Button>
                                        )}
                                        {formTeams.length > 0 &&
                                          foundPlayer && (
                                            <Select
                                              value={
                                                foundPlayer.team !== null
                                                  ? foundPlayer.team.toString()
                                                  : "no-team"
                                              }
                                              onValueChange={(value) => {
                                                if (value === "no-team") {
                                                  update(
                                                    field.value.findIndex(
                                                      (i) => i.id === player.id,
                                                    ),
                                                    {
                                                      ...foundPlayer,
                                                      team: null,
                                                    },
                                                  );
                                                  return;
                                                }
                                                const parsedValue =
                                                  Number(value);
                                                const foundTeam =
                                                  formTeams.find(
                                                    (t) => t.id === parsedValue,
                                                  );
                                                if (
                                                  !isNaN(parsedValue) &&
                                                  foundTeam
                                                ) {
                                                  const playerRoles =
                                                    Array.from(
                                                      new Set([
                                                        ...foundPlayer.roles,
                                                        ...foundTeam.roles,
                                                      ]),
                                                    );
                                                  update(
                                                    field.value.findIndex(
                                                      (i) => i.id === player.id,
                                                    ),
                                                    {
                                                      ...foundPlayer,
                                                      team: parsedValue,
                                                      roles: playerRoles,
                                                    },
                                                  );
                                                  return;
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="h-8 w-32">
                                                <SelectValue placeholder="No team" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="no-team">
                                                  No team
                                                </SelectItem>
                                                {formTeams.map((team) => (
                                                  <SelectItem
                                                    key={team.id}
                                                    value={team.id.toString()}
                                                  >
                                                    {`${team.name}`}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        {formPlayers.findIndex(
                                          (i) => i.id === player.id,
                                        ) > -1 && (
                                          <Badge className="hidden sm:block">
                                            Selected
                                          </Badge>
                                        )}
                                      </div>
                                    </FormItem>
                                  );
                                }}
                              />
                            );
                          })}
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
const ManageTeamContent = ({
  form,
  roles,
  setShowTeamModal,
}: {
  form: UseFormReturn<z.infer<typeof AddPlayersFormSchema>>;
  roles: RouterOutputs["game"]["getGameRoles"];
  setShowTeamModal: Dispatch<SetStateAction<boolean>>;
}) => {
  const [newTeam, setNewTeam] = useState("");
  const [editingTeamRoles, setEditingTeamRoles] = useState(false);
  const [originalTeams] = useState(() => form.getValues("teams"));
  const [activeTeamEdit, setActiveTeamEdit] = useState<number | null>(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const formTeams = form.watch("teams");
  const formPlayers = form.watch("players");
  const { append, remove, update } = useFieldArray({
    control: form.control,
    name: "teams",
  });
  const updatePlayers = () => {
    let teamRemoved = false;
    const mappedPlayers = formPlayers.map((player) => {
      const foundTeam = formTeams.find((t) => t.id === player.team);
      if (foundTeam !== undefined) {
        return player;
      }
      teamRemoved = true;
      return {
        ...player,
        team: null,
      };
    });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (teamRemoved) {
      form.setValue("players", mappedPlayers);
    }
  };
  const cancelTeams = () => {
    form.setValue("teams", []);
    form.setValue("teams", originalTeams);
    const mappedPlayers = formPlayers.map((player) => {
      const teamStillExists = originalTeams.some((t) => t.id === player.team);
      return {
        ...player,
        team: teamStillExists ? player.team : null,
      };
    });
    form.setValue("players", mappedPlayers);
    setShowTeamModal(false);
  };

  if (editingTeamRoles && activeTeamEdit) {
    const foundTeam = formTeams.find((t) => t.id === activeTeamEdit);
    if (foundTeam) {
      const onClose = () => {
        setEditingTeamRoles(false);
        setActiveTeamEdit(null);
      };
      const onSave = (roles: number[]) => {
        const rolesToAdd = roles.filter(
          (role) => !foundTeam.roles.includes(role),
        );
        const rolesToRemove = foundTeam.roles.filter(
          (role) => !roles.includes(role),
        );
        const mappedPlayers = formPlayers.map((player) => {
          if (player.team === foundTeam.id) {
            const playerRoles = player.roles.filter(
              (role) => !rolesToRemove.includes(role),
            );
            return {
              ...player,
              roles: [...playerRoles, ...rolesToAdd],
            };
          }
          return player;
        });
        form.setValue("players", mappedPlayers);
        const teamIndex = formTeams.findIndex((t) => t.id === activeTeamEdit);
        update(teamIndex, {
          id: foundTeam.id,
          roles,
          name: foundTeam.name,
        });
        onClose();
      };
      return (
        <ManageTeamRoles
          team={foundTeam}
          roles={roles}
          onClose={onClose}
          onSave={onSave}
        />
      );
    }
  }

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>Edit Teams</DialogTitle>
      </DialogHeader>

      <div className="border-b border-gray-700 py-2 sm:p-6">
        {showAddTeam ? (
          <Card className="py-2">
            <CardContent className="flex items-center gap-3 px-2 sm:px-4">
              <Input
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    const lowestId =
                      formTeams.reduce(
                        (acc, curr) => (curr.id < acc ? curr.id : acc),
                        -1,
                      ) - 2;
                    append(
                      {
                        id: lowestId,
                        name: newTeam,
                        roles: [],
                      },
                      {
                        shouldFocus: false,
                      },
                    );
                    setNewTeam("");
                  }
                }}
                placeholder={"Add new team"}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-sm sm:text-base"
                onClick={() => {
                  const lowestId =
                    formTeams.reduce(
                      (acc, curr) => (curr.id < acc ? curr.id : acc),
                      -1,
                    ) - 2;
                  append({
                    id: lowestId,
                    name: newTeam,
                    roles: [],
                  });
                  setNewTeam("");
                  setShowAddTeam(false);
                }}
                disabled={newTeam === ""}
              >
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddTeam(false);
                  setNewTeam("");
                }}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={() => setShowAddTeam(true)}
            className="w-full border-dashed"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Team
          </Button>
        )}
      </div>
      <ScrollArea>
        <div className="flex max-h-96 flex-col gap-2">
          {formTeams.map((team) => {
            const foundIndex = formTeams.findIndex((t) => t.id === team.id);
            if (foundIndex === -1) {
              return null;
            }
            const teamPlayers = formPlayers.filter(
              (player) => player.team === team.id,
            );

            return (
              <Card key={team.id}>
                <CardContent className="flex flex-col gap-2 px-4 py-2">
                  <div className="flex flex-col gap-1">
                    {activeTeamEdit === team.id ? (
                      <FormField
                        control={form.control}
                        name={`teams.${foundIndex}.name`}
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormLabel className="sr-only">Team Name</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  className="text-base font-medium"
                                  placeholder="Team name"
                                  {...field}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => setActiveTeamEdit(null)}
                                >
                                  Save
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="flex h-10 items-center gap-2 py-2">
                        <span
                          className="cursor-pointer font-medium transition-colors hover:text-purple-300"
                          onClick={() => setActiveTeamEdit(team.id)}
                          title="Click to edit team name"
                        >
                          {team.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActiveTeamEdit(team.id)}
                        >
                          <SquarePen className="size-6" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span>{teamPlayers.length} players</span>
                      <span>{team.roles.length} team roles</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTeamRoles(true);
                        setActiveTeamEdit(team.id);
                      }}
                    >
                      {team.roles.length > 0 ? (
                        <div>
                          {`${team.roles.length} role${team.roles.length !== 1 ? "s" : ""} selected`}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          No roles selected
                        </span>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        remove(foundIndex);
                        setActiveTeamEdit(null);
                      }}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Team</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            cancelTeams();
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            updatePlayers();
            setShowTeamModal(false);
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </Form>
  );
};
const ManageTeamRoles = ({
  team,
  roles,
  onClose,
  onSave,
}: {
  team: {
    id: number;
    name: string;
    roles: number[];
  };
  roles: RouterOutputs["game"]["getGameRoles"];
  onClose: () => void;
  onSave: (roles: number[]) => void;
}) => {
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const formSchema = z.object({
    roles: roleSchema,
  });
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      roles: team.roles,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values.roles);
  };

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);

  const formRoles = form.watch("roles");
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Edit {team.name} Roles</DialogTitle>
        </DialogHeader>
        <FormField
          control={form.control}
          name={`roles`}
          render={({ field }) => (
            <div className="flex flex-col gap-2 py-2 pt-4">
              {/* Search Roles */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search roles..."
                  value={roleSearchTerm}
                  onChange={(e) => setRoleSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                  aria-label="Search roles"
                  type="search"
                />
              </div>

              {/* Roles List */}
              <ScrollArea className="h-[30vh]">
                <div className="flex flex-col gap-2">
                  {filteredRoles.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {roleSearchTerm
                        ? "No roles found matching your search"
                        : "No roles available"}
                    </p>
                  ) : (
                    filteredRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center space-x-3 rounded p-2"
                      >
                        <Checkbox
                          id={`${role.id}`}
                          checked={field.value.includes(role.id)}
                          onCheckedChange={() => {
                            const foundRoleIndex = field.value.findIndex(
                              (r) => r === role.id,
                            );
                            if (foundRoleIndex > -1) {
                              const newRoles = [
                                ...field.value.filter((r) => r !== role.id),
                              ];
                              field.onChange(newRoles);
                            } else {
                              field.onChange([...field.value, role.id]);
                            }
                          }}
                        />
                        <div className="flex-1 gap-2">
                          <Label htmlFor={`${role.id}`}>{role.name}</Label>

                          <p className="text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Selected Roles Summary */}
              {formRoles.length > 0 && (
                <div className="border-foreground-secondary flex flex-col gap-2 border-t pt-2">
                  <p className="text-xs text-foreground">Selected roles:</p>
                  <ScrollArea>
                    <div className="flex max-h-12 flex-wrap gap-2">
                      {formRoles.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        return role ? (
                          <Badge
                            key={roleId}
                            variant="secondary"
                            className="w-28 truncate text-nowrap text-xs"
                          >
                            {role.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        />
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
const ManagePlayerRoles = ({
  player,
  teamRoles,
  roles,
  onClose,
  onSave,
}: {
  player: {
    id: number;
    name: string;
    roles: number[];
  };
  teamRoles: number[];
  roles: RouterOutputs["game"]["getGameRoles"];
  onClose: () => void;
  onSave: (roles: number[]) => void;
}) => {
  const [roleSearchTerm, setRoleSearchTerm] = useState("");
  const formSchema = z.object({
    roles: roleSchema,
  });
  const form = useForm({
    schema: formSchema,
    defaultValues: {
      roles: player.roles,
    },
  });
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values.roles);
  };

  const filteredRoles = useFilteredRoles(roles, roleSearchTerm);

  const formRoles = form.watch("roles");
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogHeader>
          <DialogTitle>Edit {player.name} Roles</DialogTitle>
        </DialogHeader>
        <FormField
          control={form.control}
          name={`roles`}
          render={({ field }) => (
            <div className="flex flex-col gap-2 py-2 pt-4">
              {/* Search Roles */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search roles..."
                  value={roleSearchTerm}
                  onChange={(e) => setRoleSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                  aria-label="Search roles"
                  type="search"
                />
              </div>

              {/* Roles List */}
              <ScrollArea className="h-[30vh]">
                <div className="flex flex-col gap-2">
                  {filteredRoles.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {roleSearchTerm
                        ? "No roles found matching your search"
                        : "No roles available"}
                    </p>
                  ) : (
                    filteredRoles.map((role) => {
                      const isTeamRole =
                        teamRoles.findIndex((r) => r === role.id) > -1;
                      return (
                        <div
                          key={role.id}
                          className="flex items-center space-x-3 rounded p-2"
                        >
                          <Checkbox
                            id={`${role.id}`}
                            checked={field.value.includes(role.id)}
                            onCheckedChange={() => {
                              const foundRoleIndex = field.value.findIndex(
                                (r) => r === role.id,
                              );
                              if (foundRoleIndex > -1) {
                                const newRoles = [
                                  ...field.value.filter((r) => r !== role.id),
                                ];
                                field.onChange(newRoles);
                              } else {
                                field.onChange([...field.value, role.id]);
                              }
                            }}
                            disabled={isTeamRole}
                          />
                          <div className="flex-1 gap-2">
                            <Label htmlFor={`${role.id}`}>
                              {role.name}
                              {isTeamRole ? " (Team)" : ""}
                            </Label>

                            <p className="text-xs text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Selected Roles Summary */}
              {formRoles.length > 0 && (
                <div className="border-foreground-secondary flex flex-col gap-2 border-t pt-2">
                  <p className="text-xs text-foreground">Selected roles:</p>
                  <ScrollArea>
                    <div className="flex max-h-12 flex-wrap gap-2">
                      {formRoles.map((roleId) => {
                        const role = roles.find((r) => r.id === roleId);
                        const isTeamRole =
                          teamRoles.findIndex((r) => r === roleId) > -1;
                        return role ? (
                          <Badge
                            key={roleId}
                            variant="secondary"
                            className="w-28 truncate text-nowrap text-xs"
                          >
                            {role.name}
                            {isTeamRole ? " (Team)" : ""}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        />
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
const addPlayerSchema = insertPlayerSchema.pick({ name: true }).extend({
  imageUrl: fileSchema,
});
const AddPlayerForm = ({
  addMatchPlayer,
  setIsAddPlayer,
}: {
  addMatchPlayer: UseFieldArrayAppend<addPlayersFormType, "players">;
  setIsAddPlayer: Dispatch<SetStateAction<boolean>>;
}) => {
  const trpc = useTRPC();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  const invalidatePlayers = useInvalidatePlayers();

  const form = useForm({
    schema: addPlayerSchema,
    defaultValues: {
      name: "",
      imageUrl: null,
    },
  });
  const createPlayer = useMutation(
    trpc.player.create.mutationOptions({
      onSuccess: async (player) => {
        setIsUploading(false);
        addMatchPlayer({
          id: player.id,
          imageUrl: player.image?.url ?? "",
          name: player.name,
          matches: 0,
          team: null,
          roles: [],
        });
        await Promise.all([...invalidatePlayers()]);
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
