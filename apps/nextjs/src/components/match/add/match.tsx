import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
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

import type {
  LocationType,
  PlayerType,
  ScoresheetType,
  TeamType,
} from "./schema";
import { Spinner } from "~/components/spinner";
import { withForm } from "~/hooks/form";
import { useAddLocationMutation } from "~/hooks/mutations/location/add";

type ScoreSheets = RouterOutputs["newGame"]["gameScoresheets"];
type Locations = RouterOutputs["location"]["getLocations"];
export const defaultValues = {
  name: "",
  date: new Date(),
  location: null as LocationType,
  scoresheet: {
    id: 0,
    type: "original" as const,
  } as ScoresheetType,
  players: [] as PlayerType[],
  teams: [] as TeamType[],
};
export const MatchForm = withForm({
  defaultValues: defaultValues,
  props: {
    numberOfPlayers: 2,
    scoresheets: [] as ScoreSheets,
    locations: [] as Locations,
    description: "Add a new match to your collection.",
    closeDialog: () => {
      /* empty */
    },
    openPlayerForm: () => {
      /* empty */
    },
  },
  render: function Render({
    form,
    openPlayerForm,
    numberOfPlayers,
    scoresheets,
    locations,
    description,
    closeDialog,
  }) {
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [newLocation, setNewLocation] = useState("");
    const { createLocationMutation } = useAddLocationMutation();
    return (
      <>
        <DialogHeader>
          <DialogTitle>Add Match</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Match Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Match Name"
                  autoComplete="off"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <FieldGroup className="grid w-full grid-cols-2 gap-2">
          <form.Field name="date">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name} className="sr-only">
                    Date
                  </FieldLabel>

                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="text-muted-foreground w-full pl-3 text-left font-normal"
                        type="button"
                      >
                        {isSameDay(field.state.value, new Date()) ? (
                          <span>Today</span>
                        ) : (
                          format(field.state.value, "PPP")
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.state.value}
                        onSelect={(date) => {
                          if (date) {
                            field.handleChange(date);
                          }
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.Field name="players">
            {(field) => {
              const isInvalid = !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="sr-only">Players</FieldLabel>
                  <Button
                    className="w-full"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      openPlayerForm();
                    }}
                  >
                    {`${numberOfPlayers} Players`}
                  </Button>
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        <FieldGroup>
          <form.Field name="location">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const selectValue =
                field.state.value === null
                  ? "null"
                  : field.state.value.type === "original"
                    ? `original-${field.state.value.id}`
                    : `shared-${field.state.value.sharedId}`;
              const foundLocation = locations.find((location) => {
                if (location.type === "original") {
                  return location.id === Number(selectValue.split("-")[1]);
                }
                return location.sharedId === Number(selectValue.split("-")[1]);
              });
              if (!foundLocation && field.state.value !== null) {
                throw new Error("Location not found.");
              }
              return (
                <Field data-invalid={isInvalid} className="flex w-full">
                  <FieldLabel className="sr-only" htmlFor={field.name}>
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
                          <SelectItem value="null" className="sr-only">
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
                        onChange={(e) => setNewLocation(e.target.value)}
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
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.Field name="scoresheet">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const selectValue =
                field.state.value.type === "original"
                  ? `original-${field.state.value.id}`
                  : `shared-${field.state.value.sharedId}`;
              return (
                <Field orientation="vertical" data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Scoresheet:</FieldLabel>
                  <Select
                    name={field.name}
                    value={selectValue}
                    onValueChange={(e) => {
                      const [type, id] = e.split("-");
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
                      className="min-w-[120px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="item-aligned">
                      {scoresheets.map((sheet) => {
                        const sheetId =
                          sheet.type === "original"
                            ? `original-${sheet.id}`
                            : `shared-${sheet.sharedId}`;
                        return (
                          <SelectItem key={sheetId} value={sheetId}>
                            <div className="flex items-center gap-2">
                              <span>{sheet.name}</span>
                              {sheet.type === "shared" && (
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
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              closeDialog();
            }}
          >
            Cancel
          </Button>
          <form.AppForm>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    "Start Match"
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form.AppForm>
        </DialogFooter>
      </>
    );
  },
});
