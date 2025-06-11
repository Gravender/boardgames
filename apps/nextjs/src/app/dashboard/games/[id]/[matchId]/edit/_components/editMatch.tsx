"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, Trash, Trash2, User, X } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import type { UseFormReturn } from "@board-games/ui/form";
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
  CardFooter,
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
  DialogTrigger,
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

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const playerSchema = insertPlayerSchema
  .pick({ name: true, id: true })
  .required({ name: true, id: true })
  .extend({
    imageUrl: z.string().or(fileSchema).optional(),
    matches: z.number(),
    teamId: z.number().nullable(),
  });
const matchSchema = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true })
  .extend({
    players: z
      .array(playerSchema.extend({ playerId: z.number().optional() }))
      .refine((players) => players.length > 0, {
        message: "You must add at least one player",
      }),
    location: z
      .object({
        id: z.number(),
        name: z.string(),
        type: z.literal("original").or(z.literal("shared")),
        isDefault: z.boolean(),
      })
      .nullable(),
    teams: z.array(
      z.object({
        id: z.number(),
        teamId: z.number().optional(),
        name: z.string(),
      }),
    ),
  });
type addedPlayers = {
  id: number;
  name: string;
  imageUrl: string;
  matches: number;
  isUser: boolean;
}[];
type addedTeams = {
  id: number;
  name: string;
}[];
type getMatch = NonNullable<RouterOutputs["match"]["getMatch"]>;
type getGamePlayers = RouterOutputs["player"]["getPlayersByGame"];
export function EditMatchForm({
  match,
  players,
}: {
  match: getMatch;
  players: getGamePlayers;
}) {
  const trpc = useTRPC();
  const { data: locations } = useSuspenseQuery(
    trpc.location.getLocations.queryOptions(),
  );
  const { startUpload } = useUploadThing("imageUploader");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [addedPlayers, setAddedPlayers] = useState<addedPlayers>([]);
  const [addedTeams, setAddedTeams] = useState<addedTeams>([]);

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const form = useForm({
    schema: matchSchema,
    defaultValues: {
      name: match.name,
      date: match.date,
      players: mapPlayers(match.players, players),
      location:
        locations.find(
          (location) =>
            location.id === match.location?.id && location.type === "original",
        ) ?? null,
      teams: match.teams.map((team) => ({ ...team, teamId: team.id })),
    },
  });
  const editMatch = useMutation(
    trpc.match.editMatch.mutationOptions({
      onSuccess: async (result) => {
        if (result !== null) {
          toast.success("Match updated successfully.");
          await Promise.all([
            queryClient.invalidateQueries(
              trpc.player.getPlayersByGame.queryFilter({
                game: { id: result.gameId },
              }),
            ),
            queryClient.invalidateQueries(
              trpc.game.getGame.queryOptions({ id: result.gameId }),
            ),
            queryClient.invalidateQueries(
              trpc.match.getMatch.queryOptions({ id: result.id }),
            ),
          ]);
          // If the match is original and was updated, redirect to the updated match
          if (result.updatedScore) {
            router.push(`/dashboard/games/${result.gameId}/${result.id}`);
          } else {
            router.back();
          }
        } else {
          toast.error("There was an error updating the match.");
        }
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
  const onSubmit = async (values: z.infer<typeof matchSchema>) => {
    setIsSubmitting(true);
    const playersToRemove = match.players.filter(
      (player) =>
        values.players.findIndex(
          (p) => p.playerId !== undefined && p.playerId === player.playerId,
        ) === -1,
    );
    const playersToAdd = values.players.filter(
      (player) =>
        player.playerId === undefined &&
        match.players.findIndex((p) => p.playerId === player.playerId) === -1,
    );
    const newPlayers = values.players.filter((player) => player.matches === -1);
    const updatedPlayers = values.players.filter((player) => {
      const foundPlayer = match.players.find(
        (p) => p.playerId === player.playerId,
      );
      return foundPlayer && foundPlayer.teamId !== player.teamId;
    });
    const editedTeams = values.teams
      .map((team) => {
        if (
          team.teamId !== undefined &&
          match.teams.find((t) => t.id === team.teamId)?.name !== team.name
        ) {
          return {
            id: team.teamId,
            name: team.name,
          };
        }
        return null;
      })
      .filter((team) => team !== null);
    try {
      const newPlayersWithImage = await Promise.all(
        newPlayers.map(async (player) => {
          let imageId: number | null = null;
          if (!player.imageUrl || typeof player.imageUrl === "string")
            return {
              id: -1,
              name: player.name,
              imageId: null,
              teamId: player.teamId,
            };
          const imageFile = player.imageUrl;

          const uploadResult = await startUpload([imageFile], {
            usageType: "player",
          });
          if (!uploadResult) {
            throw new Error("Image upload failed");
          }
          imageId = uploadResult[0] ? uploadResult[0].serverData.imageId : null;

          return {
            id: -1,
            name: player.name,
            imageId: imageId,
            teamId: player.teamId,
          };
        }),
      );
      editMatch.mutate({
        type: "original",
        match: {
          id: match.id,
          scoresheetId: match.scoresheet.id,
          name: values.name === match.name ? undefined : values.name,
          date:
            values.date.getTime() === match.date.getTime()
              ? undefined
              : values.date,
          location:
            values.location?.id === match.location?.id &&
            values.location?.type === "original"
              ? undefined
              : values.location,
        },
        addPlayers: playersToAdd.map((player) => ({
          id: player.id,
          teamId: player.teamId,
        })),
        removePlayers: playersToRemove.map((player) => ({
          id: player.playerId,
        })),
        newPlayers: newPlayersWithImage.map((player) => ({
          name: player.name,
          imageId: player.imageId,
          teamId: player.teamId,
        })),
        updatedPlayers: updatedPlayers.map((player) => ({
          id: player.id,
          teamId: player.teamId,
        })),
        addedTeams: addedTeams.map((team) => ({
          id: team.id,
          name: team.name,
        })),
        editedTeams: editedTeams,
      });
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast.error("Error", {
        description: "There was a problem uploading your Image.",
      });
      throw new Error("There was a problem uploading your Image.");
    }
  };
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Edit {match.name}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CardContent className="flex flex-col gap-2">
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
            <div className="flex w-full items-end justify-between gap-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="hidden">Date</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-[240px] pl-3 text-left font-normal text-muted-foreground"
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
              <AddPlayersDialog
                form={form}
                gamePlayers={players.map((player) => ({
                  id: player.id,
                  name: player.name,
                  isUser: player.isUser,
                  image: player.image,
                  matches: Number(player.matches),
                }))}
                addedPlayers={addedPlayers}
                setAddedPlayers={setAddedPlayers}
                matchPlayers={match.players}
                teams={match.teams}
                addedTeams={addedTeams}
                setAddedTeams={setAddedTeams}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="hidden">
                    Location: - (Optional)
                  </FormLabel>
                  {!showAddLocation ? (
                    <div className="flex w-full gap-2">
                      <Select
                        onValueChange={(value) => {
                          if (value === "add-new") {
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
                                  <span className="font-semibold">
                                    (Default)
                                  </span>
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
          </CardContent>

          <CardFooter className="justify-end gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => {
                router.back();
              }}
            >
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
    </Card>
  );
}

const AddPlayersDialog = ({
  form,
  gamePlayers,
  addedPlayers,
  setAddedPlayers,
  matchPlayers,
  teams,
  addedTeams,
  setAddedTeams,
}: {
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  matchPlayers: getMatch["players"];
  gamePlayers: getGamePlayers;
  teams: getMatch["teams"];
  addedPlayers: addedPlayers;
  setAddedPlayers: Dispatch<SetStateAction<addedPlayers>>;
  addedTeams: addedTeams;
  setAddedTeams: Dispatch<SetStateAction<addedTeams>>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-[600px] sm:p-6">
        <PlayersContent
          setOpen={setIsOpen}
          form={form}
          gamePlayers={gamePlayers}
          addedPlayers={addedPlayers}
          setAddedPlayers={setAddedPlayers}
          matchPlayers={matchPlayers}
          teams={teams}
          addedTeams={addedTeams}
          setAddedTeams={setAddedTeams}
        />
      </DialogContent>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="w-full">
          {`${form.getValues("players").length} Players`}
        </Button>
      </DialogTrigger>
    </Dialog>
  );
};
const mapPlayers = (
  players: getMatch["players"],
  gamePlayers: getGamePlayers,
) => {
  return players.map((player) => ({
    id: player.playerId,
    name: player.name,
    imageUrl: player.image?.url ?? "",
    matches: Number(
      gamePlayers.find((p) => p.id === player.playerId)?.matches ?? 0,
    ),
    playerId: player.playerId,
    teamId: player.teamId,
  }));
};
const PlayersContent = ({
  setOpen,
  form,
  gamePlayers,
  addedPlayers,
  setAddedPlayers,
  matchPlayers,
  teams,
  addedTeams,
  setAddedTeams,
}: {
  setOpen: (isOpen: boolean) => void;
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  gamePlayers: getGamePlayers;
  addedPlayers: addedPlayers;
  setAddedPlayers: Dispatch<SetStateAction<addedPlayers>>;
  matchPlayers: getMatch["players"];
  teams: NonNullable<RouterOutputs["match"]["getMatch"]>["teams"];
  addedTeams: addedTeams;
  setAddedTeams: Dispatch<SetStateAction<addedTeams>>;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const { update } = useFieldArray({
    control: form.control,
    name: "players",
  });

  if (showAddPlayer) {
    return (
      <PlayerContent
        setShowAddPlayer={setShowAddPlayer}
        form={form}
        addedPlayers={addedPlayers}
        setAddedPlayers={setAddedPlayers}
      />
    );
  }
  if (showTeamModal) {
    return (
      <ManageTeamContent
        form={form}
        teams={teams}
        setShowTeamModal={setShowTeamModal}
        addedTeams={addedTeams}
        setAddedTeams={setAddedTeams}
      />
    );
  }
  const formPlayers = form.watch("players");
  const formTeams = form.watch("teams");
  const combinedPlayers = [...gamePlayers, ...addedPlayers]
    .filter((player) =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .toSorted((a, b) => {
      const foundA = formPlayers.find((i) =>
        i.playerId !== undefined ? i.playerId === a.id : i.id === a.id,
      );
      const foundB = formPlayers.find((i) =>
        i.playerId !== undefined ? i.playerId === b.id : i.id === b.id,
      );
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
    });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Players</DialogTitle>
        <DialogDescription>Edit players to your match</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => setShowAddPlayer(true)}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 px-2">
        <Label>
          {`${formPlayers.length} player${formPlayers.length !== 1 ? "s" : ""} Selected`}
        </Label>
        <Button variant="outline" onClick={() => setShowTeamModal(true)}>
          Edit Teams
        </Button>
      </div>
      <FormField
        control={form.control}
        name="players"
        render={({ field }) => {
          const updateTeam = (
            player: z.infer<typeof matchSchema>["players"][number],
            teamId: number | null,
          ) => {
            const foundPlayerIndex = formPlayers.findIndex((i) =>
              i.playerId !== undefined
                ? i.playerId === player.id
                : i.id === player.id,
            );
            if (foundPlayerIndex > -1) {
              update(foundPlayerIndex, {
                ...player,
                teamId: teamId,
              });
            }
          };
          const updatePlayer = (
            player: (typeof combinedPlayers)[number],
            checked: boolean,
          ) => {
            if (checked) {
              field.onChange([...field.value, player]);
            } else {
              const filteredPlayers = formPlayers.filter((p) =>
                p.playerId ? p.playerId !== player.id : p.id !== player.id,
              );
              field.onChange(filteredPlayers);
            }
          };
          return (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="hidden">Players</FormLabel>
                <FormDescription className="hidden">
                  Select the players for the match
                </FormDescription>
              </div>
              <ScrollArea>
                <div className="flex max-h-96 flex-col gap-2">
                  {combinedPlayers.map((player) => {
                    const foundPlayer = formPlayers.find((i) =>
                      i.playerId !== undefined
                        ? i.playerId === player.id
                        : i.id === player.id,
                    );
                    return (
                      <FormItem
                        key={player.id}
                        className={cn(
                          "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-2",
                          foundPlayer !== undefined
                            ? "bg-violet-400/50"
                            : "bg-border",
                        )}
                      >
                        <FormControl>
                          <Checkbox
                            className="hidden"
                            checked={foundPlayer !== undefined}
                            onCheckedChange={(checked) => {
                              updatePlayer(player, !!checked);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="flex w-full items-center justify-between gap-1 text-sm font-normal sm:gap-2">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Avatar>
                              <AvatarImage
                                className="object-cover"
                                src={
                                  "image" in player
                                    ? (player.image?.url ?? "")
                                    : player.imageUrl
                                }
                                alt={player.name}
                              />
                              <AvatarFallback className="bg-slate-300">
                                <User />
                              </AvatarFallback>
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
                          {formTeams.length > 0 && foundPlayer && (
                            <Select
                              value={
                                foundPlayer.teamId !== null
                                  ? foundPlayer.teamId.toString()
                                  : "no-team"
                              }
                              onValueChange={(value) => {
                                if (value === "no-team") {
                                  updateTeam(foundPlayer, null);
                                  return;
                                }
                                const parsedValue = Number.parseInt(value);
                                const foundTeam = formTeams.find((t) =>
                                  t.teamId !== undefined
                                    ? t.teamId === parsedValue
                                    : t.id === parsedValue,
                                );
                                if (!isNaN(parsedValue) && foundTeam) {
                                  updateTeam(foundPlayer, parsedValue);
                                  return;
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue placeholder="No team" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-team">No team</SelectItem>
                                {formTeams.map((team) => (
                                  <SelectItem
                                    key={team.teamId ?? team.id}
                                    value={
                                      team.teamId !== undefined
                                        ? team.teamId.toString()
                                        : team.id.toString()
                                    }
                                  >
                                    {`${team.name}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {formPlayers.findIndex((i) => i.id === player.id) >
                            -1 && (
                            <Badge className="hidden sm:block">Selected</Badge>
                          )}
                        </div>
                        {player.matches < 0 && (
                          <div className="flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              type="button"
                              onClick={() => {
                                const index = addedPlayers.findIndex(
                                  (p) => p.id === player.id,
                                );
                                if (index > -1) {
                                  setAddedPlayers(
                                    addedPlayers.filter(
                                      (p) => p.id !== player.id,
                                    ),
                                  );
                                  field.onChange(
                                    formPlayers.filter((value) =>
                                      value.playerId
                                        ? value.playerId !== player.id
                                        : value.id !== player.id,
                                    ),
                                  );
                                }
                              }}
                            >
                              <Trash />
                            </Button>
                          </div>
                        )}
                      </FormItem>
                    );
                  })}
                </div>
              </ScrollArea>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            form.setValue("players", mapPlayers(matchPlayers, gamePlayers));
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            setOpen(false);
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
};

const ManageTeamContent = ({
  form,
  teams,
  setShowTeamModal,
  addedTeams,
  setAddedTeams,
}: {
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  teams: getMatch["teams"];
  setShowTeamModal: Dispatch<SetStateAction<boolean>>;
  addedTeams: addedTeams;
  setAddedTeams: Dispatch<SetStateAction<addedTeams>>;
}) => {
  const [newTeam, setNewTeam] = useState("");
  const formTeams = form.watch("teams");
  const { append, remove } = useFieldArray({
    control: form.control,
    name: "teams",
  });
  const updatePlayers = () => {
    let teamRemoved = false;
    const mappedPlayers = form.getValues("players").map((player) => {
      const foundTeam = formTeams.find(
        (t) => (t.teamId ?? t.id) === player.teamId,
      );
      if (player.teamId === null || foundTeam !== undefined) {
        return player;
      }
      teamRemoved = true;
      return {
        ...player,
        teamId: null,
      };
    });
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (teamRemoved) {
      form.setValue("players", mappedPlayers);
    }
  };
  const cancelTeams = () => {
    form.setValue(
      "teams",
      teams.map((team) => ({ ...team, teamId: team.id })),
    );
    setShowTeamModal(false);
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Teams</DialogTitle>
      </DialogHeader>
      <ScrollArea>
        <div className="flex max-h-96 flex-col gap-2 p-2">
          {formTeams.map((team) => {
            const foundIndex = formTeams.findIndex((t) =>
              team.teamId === undefined
                ? t.id === team.id
                : t.teamId === team.teamId,
            );
            if (foundIndex === -1) {
              return null;
            }
            return (
              <FormField
                key={team.id}
                control={form.control}
                name={`teams.${foundIndex}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Team Name</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input placeholder="Team name" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            remove(foundIndex);
                            if (team.teamId === undefined) {
                              setAddedTeams(
                                addedTeams.filter((t) => t.id !== team.id),
                              );
                            }
                          }}
                          className="h-10 w-10"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove team</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
          <div className="flex items-center gap-2">
            <Input
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  const lowestId =
                    addedTeams.reduce(
                      (acc, curr) => (curr.id < acc ? curr.id : acc),
                      -1,
                    ) - 2;
                  append(
                    {
                      id: lowestId,
                      teamId: undefined,
                      name: newTeam,
                    },
                    {
                      shouldFocus: false,
                    },
                  );
                  setAddedTeams([
                    ...addedTeams,
                    {
                      id: lowestId,
                      name: newTeam,
                    },
                  ]);
                  setNewTeam("");
                }
              }}
              placeholder={"Add new team"}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => {
                const lowestId =
                  addedTeams.reduce(
                    (acc, curr) => (curr.id < acc ? curr.id : acc),
                    -1,
                  ) - 2;
                append({
                  id: lowestId,
                  teamId: undefined,
                  name: newTeam,
                });
                setAddedTeams([
                  ...addedTeams,
                  {
                    id: lowestId,
                    name: newTeam,
                  },
                ]);
                setNewTeam("");
              }}
              disabled={newTeam === ""}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add team</span>
            </Button>
          </div>
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
    </>
  );
};

const PlayerContent = ({
  form,
  addedPlayers,
  setAddedPlayers,
  setShowAddPlayer,
}: {
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  addedPlayers: addedPlayers;
  setAddedPlayers: Dispatch<SetStateAction<addedPlayers>>;
  setShowAddPlayer: Dispatch<SetStateAction<boolean>>;
}) => {
  const { append } = useFieldArray({
    name: "players",
    control: form.control,
  });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ preview: string; file: File } | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
    };
  }, [image]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add New Player</DialogTitle>
        <DialogDescription>
          Create a new player to add to your match.
        </DialogDescription>
      </DialogHeader>
      <div className="flex w-full items-center gap-2">
        <Label htmlFor="player-name">Name:</Label>
        <Input
          placeholder="Player name"
          value={name}
          id="player-name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div
        className={cn(
          "flex items-center space-x-4",
          error && "text-destructive",
        )}
      >
        <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
          {image ? (
            <Image
              src={image.preview}
              alt="Player image"
              className="aspect-square h-full w-full rounded-sm object-cover"
              fill
            />
          ) : (
            <User className="h-full w-full items-center justify-center rounded-full bg-muted p-2" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            accept="image/*"
            id="player-image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const fileTypes = ["image/jpeg", "image/png"];
                const maxFileSize = 4 * 1024 * 1024; // 4MB in bytes
                if (!fileTypes.includes(file.type)) {
                  setError("Only .jpg and .png formats are supported.");
                  return;
                }
                if (file.size > maxFileSize) {
                  setError("Max image size is 4MB.");
                  return;
                }
                setError(null);
                const url = URL.createObjectURL(file);
                setImage({ preview: url, file: file });
              }
            }}
          />
          <p
            className={cn(
              "text-sm text-muted-foreground",
              error && "text-destructive",
            )}
          >
            Upload an image (max 4MB).
          </p>
        </div>
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setShowAddPlayer(false);
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            const lowestId =
              addedPlayers.reduce(
                (acc, curr) => (curr.id < acc ? curr.id : acc),
                -1,
              ) - 2;
            append({
              id: lowestId,
              name: name,
              imageUrl: image?.file ?? null,
              matches: 0,
              teamId: null,
            });
            setAddedPlayers([
              ...addedPlayers,
              {
                id: lowestId,
                name: name,
                imageUrl: image?.preview ?? "",
                matches: 0,
                isUser: false,
              },
            ]);

            setShowAddPlayer(false);
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
};
