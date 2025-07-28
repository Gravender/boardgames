"use client";

import type { Dispatch, SetStateAction } from "react";
import type { z } from "zod/v4";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import type { RouterOutputs } from "@board-games/api";
import type { UseFormReturn } from "@board-games/ui/form";
import { editMatchSchema } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Dialog, DialogContent } from "@board-games/ui/dialog";
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

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const invalidatePlayers = useInvalidatePlayers();
  const invalidateLocations = useInvalidateLocations();
  const invalidateGames = useInvalidateGames();
  const invalidateGame = useInvalidateGame();
  const invalidatePlayer = useInvalidatePlayer();
  const posthog = usePostHog();

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const form = useForm({
    schema: editMatchSchema,
    defaultValues: {
      name: match.name,
      date: match.date,
      players: mapPlayers(match.players, players),
      location:
        locations.find(
          (location) =>
            location.id === match.location?.id && location.type === "original",
        ) ?? null,
      teams: mapTeams(match.teams, match.players),
    },
  });
  const editMatch = useMutation(
    trpc.match.editMatch.mutationOptions({
      onSuccess: async (result) => {
        if (result !== null) {
          toast.success("Match updated successfully.");

          await Promise.all([
            ...invalidateGames(),
            ...invalidateGame(result.match.gameId, "original"),
            ...invalidatePlayers(),
            queryClient.invalidateQueries(
              trpc.match.getMatch.queryOptions({ id: result.match.id }),
            ),
          ]);
          if (result.players !== undefined && result.players.length > 0) {
            const playersToInvalidate = result.players.flatMap((p) => {
              return invalidatePlayer(p);
            });
            await Promise.all(playersToInvalidate);
          }

          // If the match is original and was updated, redirect to the updated match
          if (result.match.updatedScore) {
            router.push(
              `/dashboard/games/${result.match.gameId}/${result.match.id}`,
            );
          } else {
            router.back();
          }
        } else {
          toast.error("There was an error updating the match.");
        }
      },
      onError: (error) => {
        posthog.capture("match edit error", {
          error,
          matchId: match.id,
          game: match.game,
        });
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
  const onSubmit = (values: z.infer<typeof editMatchSchema>) => {
    setIsSubmitting(true);
    posthog.capture("edit match begin", {
      matchId: match.id,
      game: match.game,
    });
    const playersToRemove = match.players.filter(
      (player) =>
        values.players.findIndex(
          (p) => p.id === player.playerId && p.type === player.type,
        ) === -1,
    );
    const playersToAdd = values.players.filter(
      (player) =>
        match.players.findIndex(
          (p) => p.playerId === player.id && p.type === player.type,
        ) === -1,
    );
    const updatedPlayers = values.players.filter((player) => {
      const foundPlayer = match.players.find(
        (p) => p.playerId === player.id && p.type === player.type,
      );
      if (!foundPlayer) return false;
      const teamChanged = foundPlayer.teamId !== player.teamId;
      const originalRoleIds = foundPlayer.roles.map((role) => role.id).sort();
      const updatedRoleIds = [...player.roles].sort();
      const rolesChanged =
        originalRoleIds.length !== updatedRoleIds.length ||
        !originalRoleIds.every((id, idx) => id === updatedRoleIds[idx]);

      return teamChanged || rolesChanged;
    });
    const editedTeams = values.teams
      .map((team) => {
        const foundTeam = match.teams.find((t) => t.id === team.id);
        if (foundTeam && foundTeam.name !== team.name) {
          return {
            id: team.id,
            name: team.name,
          };
        }
        return null;
      })
      .filter((team) => team !== null);
    const addedTeams = values.teams
      .map((team) => {
        if (!match.teams.find((t) => t.id === team.id)) {
          return {
            id: team.id,
            name: team.name,
          };
        }
        return null;
      })
      .filter((team) => team !== null);
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
      addPlayers: playersToAdd,
      removePlayers: playersToRemove.map((player) => ({
        id: player.playerId,
      })),
      updatedPlayers: updatedPlayers,
      addedTeams: addedTeams,
      editedTeams: editedTeams,
    });
  };
  return (
    <>
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
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={() => setIsOpen(true)}
                >
                  {`${form.getValues("players").length} Players`}
                </Button>
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
                            <SelectItem
                              value="add-new"
                              className="text-primary"
                            >
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
              <Button
                type="button"
                onClick={() => {
                  console.log(form.formState.errors);
                  console.log(form.getValues());
                }}
              >
                Error
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
      <AddPlayersDialog
        form={form}
        game={match.game}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </>
  );
}

const AddPlayersDialog = ({
  form,
  game,
  isOpen,
  setIsOpen,
}: {
  form: UseFormReturn<z.infer<typeof editMatchSchema>>;
  game: {
    id: number;
    type: "original" | "shared";
  };
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const setPlayersAndTeams = (players: Player[], teams: Team[]) => {
    form.setValue("players", players);
    form.setValue("teams", teams);
    setIsOpen(false);
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-[600px] sm:p-6">
        <AddPlayersDialogForm
          game={game}
          players={form.getValues("players")}
          teams={form.getValues("teams")}
          setPlayersAndTeams={setPlayersAndTeams}
          cancel={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
const mapPlayers = (
  players: getMatch["players"],
  gamePlayers: getGamePlayers,
) => {
  return players.map((player) => ({
    id: player.playerId,
    type: player.type,
    name: player.name,
    imageUrl: player.image?.url ?? "",
    matches: Number(
      gamePlayers.find((p) => p.id === player.playerId)?.matches ?? 0,
    ),
    playerId: player.playerId,
    teamId: player.teamId,
    roles: player.roles.map((role) => role.id),
  }));
};
const mapTeams = (teams: getMatch["teams"], players: getMatch["players"]) => {
  return teams.map((team) => {
    const teamPlayers = players.filter((player) => player.teamId === team.id);
    const roleCounts: Record<number, number> = {};
    const totalPlayers = teamPlayers.length;

    for (const player of teamPlayers) {
      for (const role of player.roles) {
        roleCounts[role.id] = (roleCounts[role.id] ?? 0) + 1;
      }
    }

    const sharedRoleIds = Object.entries(roleCounts)
      .filter(([_, count]) => count === totalPlayers)
      .map(([roleId]) => Number(roleId));

    const allRoles = teamPlayers.flatMap((p) => p.roles);
    const teamRoles = allRoles.filter(
      (role, idx, arr) =>
        sharedRoleIds.includes(role.id) &&
        arr.findIndex((r) => r.id === role.id) === idx,
    );
    return {
      id: team.id,
      teamId: team.id,
      name: team.name,
      roles: teamRoles.map((role) => role.id),
    };
  });
};
