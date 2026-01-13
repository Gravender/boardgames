"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";

import { isSameLocation } from "@board-games/shared";
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@board-games/ui/field";
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
import { Skeleton } from "@board-games/ui/skeleton";

import type { GameInput, MatchInput } from "../types/input";
import type { LocationType, PlayerType, TeamType } from "./schema";
import { InputFieldSkeleton } from "~/components/input-field-skeleton";
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useAddLocationMutation } from "~/hooks/mutations/location/add";
import { useGameRoles } from "~/hooks/queries/game/roles";
import { useSuspenseLocations } from "~/hooks/queries/locations";
import { formatMatchLink } from "~/utils/linkFormatting";
import { AddPlayerForm } from "../add/add-player-form";
import { CustomPlayerSelect } from "../add/player-selector";
import { useEditMatchMutation } from "../hooks/edit";
import { useSuspensePlayers } from "../hooks/players";
import { useMatch, usePlayersAndTeams } from "../hooks/suspenseQueries";
import { editOriginalMatchSchema } from "./schema";

export function EditOriginalMatchForm(input: {
  game: GameInput;
  match: Extract<MatchInput, { type: "original" }>;
}) {
  const { locations } = useSuspenseLocations();
  const { editMatchMutation } = useEditMatchMutation(input.match);
  const { match } = useMatch(input.match);
  const { gameRoles } = useGameRoles(input.game);
  const { teams, players } = usePlayersAndTeams(input.match);
  const { playersForMatch } = useSuspensePlayers();
  const router = useRouter();
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const { createLocationMutation } = useAddLocationMutation();
  const matchDefaultValues: {
    name: string;
    date: Date;
    location: LocationType;
    teams: TeamType[];
    players: PlayerType[];
  } = {
    name: match.name,
    date: match.date,
    location: match.location
      ? { id: match.location.id, type: "original" }
      : null,
    players: players.map((player) => ({
      id: player.playerId,
      name: player.name,
      image: player.image,
      type: "original",
      teamId: player.teamId ?? null,
      roles: player.roles,
    })),
    teams: teams.map((team) => {
      const teamPlayers = players.filter((player) => player.teamId === team.id);
      const roleCount: {
        id: number;
        name: string;
        description: string | null;
        count: number;
      }[] = [];
      teamPlayers.forEach((player) => {
        player.roles.forEach((role) => {
          const existingRole = roleCount.find((r) => r.id === role.id);
          if (existingRole) {
            existingRole.count++;
          } else {
            roleCount.push({
              id: role.id,
              name: role.name,
              description: role.description,
              count: 1,
            });
          }
        });
      });
      const teamRoles = roleCount
        .filter((role) => role.count === teamPlayers.length)
        .map((r) => {
          return {
            id: r.id,
            type: "original" as const,
            name: r.name,
            description: r.description,
          };
        });

      return {
        id: team.id,
        name: team.name,
        roles: teamRoles,
      };
    }),
  };
  const form = useAppForm({
    formId: "edit-original-match-form",
    defaultValues: matchDefaultValues,
    validators: {
      onSubmit: editOriginalMatchSchema,
    },
    onSubmit: ({ value }) => {
      const matchNameChanged = value.name !== match.name;
      const matchDateChanged = !isSameDay(value.date, match.date);
      const checkLocationChanged = () => {
        if (value.location === null || match.location === null) {
          return value.location !== match.location;
        }
        return !isSameLocation(value.location, match.location);
      };
      const matchLocationChanged = checkLocationChanged();
      return editMatchMutation.mutate(
        {
          type: "original",
          match: {
            id: match.id,
            name: matchNameChanged ? value.name : undefined,
            date: matchDateChanged ? value.date : undefined,
            location: matchLocationChanged ? value.location : undefined,
          },
          teams: value.teams,
          players: value.players.map((p) => ({
            ...p,
            teamId: p.teamId ?? null,
          })),
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
    },
  });
  return (
    <>
      <form
        key="original-match-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="flex w-full items-center justify-center space-y-4"
      >
        <form.Subscribe
          selector={(state) => ({
            selectedPlayers: state.values.players,
            teams: state.values.teams,
            date: state.values.date,
            name: state.values.name,
          })}
        >
          {({ selectedPlayers, teams, name, date }) => {
            return (
              <>
                <Card className="w-full max-w-xl">
                  <CardHeader>
                    <CardTitle>Edit {match.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form.Field name="name">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Match Name
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="Match Name"
                              autoComplete="off"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                    <FieldGroup className="grid w-full grid-cols-2 gap-2">
                      <form.Field name="date">
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel
                                htmlFor={field.name}
                                className="sr-only"
                              >
                                Date
                              </FieldLabel>

                              <Popover modal={true}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className="text-muted-foreground w-full pl-3 text-left font-normal"
                                    type="button"
                                  >
                                    {isSameDay(
                                      field.state.value,
                                      new Date(),
                                    ) ? (
                                      <span>Today</span>
                                    ) : (
                                      format(field.state.value, "PPP")
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={field.state.value}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.handleChange(date);
                                      }
                                    }}
                                    disabled={(date) =>
                                      date > new Date() ||
                                      date < new Date("1900-01-01")
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.Field>
                      <form.Field name="players">
                        {(field) => {
                          const isInvalid = !field.state.meta.isValid;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel className="sr-only">
                                Players
                              </FieldLabel>
                              <Button
                                className="w-full"
                                variant="outline"
                                type="button"
                                onClick={() => {
                                  setShowPlayerDialog(true);
                                }}
                              >
                                {`${selectedPlayers.length} Players`}
                              </Button>
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </form.Field>
                    </FieldGroup>
                    <form.Field name="location">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        const selectValue =
                          field.state.value === null
                            ? "null"
                            : field.state.value.type === "original"
                              ? `original-${field.state.value.id}`
                              : `shared-${field.state.value.sharedId}`;
                        const foundLocation = locations.find((location) => {
                          if (location.type === "original") {
                            return (
                              location.id === Number(selectValue.split("-")[1])
                            );
                          }
                          return (
                            location.sharedId ===
                            Number(selectValue.split("-")[1])
                          );
                        });
                        if (!foundLocation && field.state.value !== null) {
                          console.error("Location not found.");
                          return null;
                        }
                        return (
                          <Field
                            data-invalid={isInvalid}
                            className="flex w-full"
                          >
                            <FieldLabel
                              className="sr-only"
                              htmlFor={field.name}
                            >
                              Location
                            </FieldLabel>

                            {!showAddLocation ? (
                              <div className="flex w-full gap-2">
                                <Select
                                  name={field.name}
                                  value={selectValue}
                                  onValueChange={(value) => {
                                    if (value === "add-new") {
                                      field.handleChange(null);
                                      setShowAddLocation(true);
                                      return;
                                    }
                                    if (value === "null") {
                                      field.handleChange(null);
                                      return;
                                    }
                                    const [type, id] = value.split("-");
                                    const idToNumber = Number(id);
                                    if (isNaN(idToNumber)) {
                                      return;
                                    }
                                    if (type === "original") {
                                      field.handleChange({
                                        id: idToNumber,
                                        type: "original" as const,
                                      });
                                    }
                                    if (type === "shared") {
                                      field.handleChange({
                                        sharedId: idToNumber,
                                        type: "shared" as const,
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger
                                    aria-invalid={isInvalid}
                                    className="w-full min-w-[120px]"
                                  >
                                    <SelectValue>
                                      {foundLocation ? (
                                        <div className="flex items-center gap-2">
                                          <span>Location:</span>
                                          <span>{foundLocation.name}</span>
                                          {foundLocation.isDefault && (
                                            <span className="font-semibold">
                                              (Default)
                                            </span>
                                          )}
                                          {foundLocation.type === "shared" && (
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
                                  <SelectContent position="item-aligned">
                                    <SelectItem
                                      value="null"
                                      className="sr-only"
                                    >
                                      No location
                                    </SelectItem>
                                    {locations.map((location) => {
                                      const locationValue =
                                        location.type === "original"
                                          ? `original-${location.id}`
                                          : `shared-${location.sharedId}`;
                                      return (
                                        <SelectItem
                                          key={locationValue}
                                          value={locationValue}
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
                                      );
                                    })}
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
                                  aria-label="Clear location"
                                  onClick={() => {
                                    field.handleChange(null);
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
                                  onChange={(e) =>
                                    setNewLocation(e.target.value)
                                  }
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (newLocation.trim().length > 0) {
                                      createLocationMutation.mutate(
                                        {
                                          name: newLocation,
                                        },
                                        {
                                          onSuccess: (data) => {
                                            field.handleChange({
                                              id: data.id,
                                              type: "original" as const,
                                            });
                                            setNewLocation("");
                                            setShowAddLocation(false);
                                          },
                                        },
                                      );
                                    }
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
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        router.back();
                      }}
                    >
                      Cancel
                    </Button>
                    <form.AppForm>
                      <form.Subscribe selector={(state) => state.isSubmitting}>
                        {(isSubmitting) => (
                          <Button
                            type="submit"
                            disabled={isSubmitting || !form.state.isDirty}
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
                        )}
                      </form.Subscribe>
                    </form.AppForm>
                  </CardFooter>
                </Card>
                <Dialog
                  open={showPlayerDialog}
                  onOpenChange={setShowPlayerDialog}
                >
                  <DialogContent className="max-w-4xl">
                    <CustomPlayerSelect
                      form={form}
                      fields={{
                        players: "players",
                        teams: "teams",
                      }}
                      title={name}
                      description={format(date, "PPP")}
                      gameRoles={gameRoles}
                      teams={teams}
                      selectedPlayers={selectedPlayers}
                      playersForMatch={playersForMatch}
                      onBack={() => setShowPlayerDialog(false)}
                      onCancel={() => setShowPlayerDialog(false)}
                      onAddPlayer={() => setShowAddPlayerDialog(true)}
                    />
                  </DialogContent>
                </Dialog>
              </>
            );
          }}
        </form.Subscribe>
      </form>
      <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
        <DialogContent className="max-w-4xl">
          <AddPlayerForm
            description="Add a player to your match"
            onReset={() => setShowAddPlayerDialog(false)}
            onPlayerAdded={(player) => {
              setShowAddPlayerDialog(false);

              form.setFieldValue("players", [
                ...form.state.values.players,
                {
                  ...player,
                  type: "original" as const,
                  roles: [],
                  teamId: null,
                },
              ]);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
export function EditOriginalMatchSkeleton() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <InputFieldSkeleton />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-20" />
          <div className="flex w-full gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </CardFooter>
    </Card>
  );
}
