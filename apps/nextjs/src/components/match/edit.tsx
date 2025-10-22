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

import type { Player, Team } from "~/components/match/players/selector";
import type { GameInput, MatchInput } from "~/components/match/types/input";
import { AddPlayersDialogForm } from "~/components/match/players/selector";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";
import { formatMatchLink } from "~/utils/linkFormatting";
import { useGetPlayersByGame } from "../player/hooks/players";
import { useEditMatchMutation } from "./hooks/edit";
import { useMatch, usePlayersAndTeams } from "./hooks/suspenseQueries";

export function EditMatchForm(input: { game: GameInput; match: MatchInput }) {
  const trpc = useTRPC();
  const { data: locations } = useSuspenseQuery(
    trpc.location.getLocations.queryOptions(),
  );
  const { match } = useMatch(input.match);
  //TODO update to use input.game
  const { gamePlayers } = useGetPlayersByGame(
    input.game.type === "original" ? input.game.id : input.game.sharedGameId,
    input.game.type,
  );
  const { players: matchPlayers, teams } = usePlayersAndTeams(input.match);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const form = useForm({
    schema: editMatchSchema,
    defaultValues: {
      name: match.name,
      date: match.date,
      players: mapPlayers(matchPlayers, gamePlayers),
      location:
        locations.find(
          (location) =>
            location.id === match.location?.id && location.type === "original",
        ) ?? null,
      teams: mapTeams(teams, matchPlayers),
    },
  });
  const { editMatchMutation } = useEditMatchMutation(input.match);
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
  const onSubmit = (values: z.infer<typeof editMatchSchema>) => {
    setIsSubmitting(true);
    posthog.capture("edit match begin", {
      matchId: match.id,
      game: match.game,
    });
    const playersToRemove = matchPlayers.filter(
      (player) =>
        values.players.findIndex(
          (p) => p.id === player.playerId && p.type === player.type,
        ) === -1,
    );
    const playersToAdd = values.players.filter(
      (player) =>
        matchPlayers.findIndex(
          (p) => p.playerId === player.id && p.type === player.type,
        ) === -1,
    );
    const updatedPlayers = values.players.filter((player) => {
      const foundPlayer = matchPlayers.find(
        (p) => p.playerId === player.id && p.type === player.type,
      );
      if (!foundPlayer) return false;
      const teamChanged = foundPlayer.teamId !== player.teamId;
      const originalRoles = foundPlayer.roles;
      const updatedRoleIds = [...player.roles].sort();
      const rolesChanged =
        originalRoles.length !== updatedRoleIds.length ||
        !originalRoles.every((role) =>
          updatedRoleIds.find((r) => r.id === role.id && r.type === role.type),
        );

      return teamChanged || rolesChanged;
    });
    const editedTeams = values.teams
      .map((team) => {
        const foundTeam = teams.find((t) => t.id === team.id);
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
        if (!teams.find((t) => t.id === team.id)) {
          return {
            id: team.id,
            name: team.name,
          };
        }
        return null;
      })
      .filter((team) => team !== null);
    editMatchMutation.mutate(
      {
        type: "original",
        match: {
          id: match.id,
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
      },
      {
        onSuccess: (result) => {
          if (result.type === "original") {
            if (result.updatedScore) {
              const url = formatMatchLink({
                matchId: result.matchId,
                gameId: result.game.id,
                type: "original",
                finished: false,
              });
              router.push(url);
            } else {
              router.back();
            }
          }
        },
      },
    );
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
                              className="text-muted-foreground w-[240px] pl-3 text-left font-normal"
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
        game={input.game}
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
  game: GameInput;
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
  players: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["players"],
  gamePlayers: RouterOutputs["player"]["getPlayersByGame"],
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
    roles: player.roles.map((role) => {
      return { id: role.id, type: role.type };
    }),
  }));
};
const mapTeams = (
  teams: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["teams"],
  players: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["players"],
) => {
  return teams.map((team) => {
    const teamPlayers = players.filter((player) => player.teamId === team.id);
    const roleCounts: {
      id: number;
      type: "original" | "shared" | "linked";
      name: string;
      description: string | null;
      count: number;
    }[] = [];
    const totalPlayers = teamPlayers.length;

    for (const player of teamPlayers) {
      for (const role of player.roles) {
        const existingRole = roleCounts.find(
          (r) => r.id === role.id && r.type === role.type,
        );
        if (existingRole) {
          existingRole.count++;
        } else {
          roleCounts.push({
            id: role.id,
            type: role.type,
            name: role.name,
            description: role.description,
            count: 1,
          });
        }
      }
    }

    const sharedRoles = roleCounts.filter(
      (roleCount) => roleCount.count === totalPlayers,
    );

    return {
      id: team.id,
      teamId: team.id,
      name: team.name,
      roles: sharedRoles.map((r) => ({
        id: r.id,
        type: r.type,
      })),
    };
  });
};
