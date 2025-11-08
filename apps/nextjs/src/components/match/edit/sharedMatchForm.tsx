"use client";

import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
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
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useSuspenseSharedLocationsFromSharedMatch } from "~/hooks/queries/locations";
import { useEditMatchMutation } from "../hooks/edit";
import { useMatch } from "../hooks/suspenseQueries";
import { editSharedMatchSchema } from "./schema";
import { InputFieldSkeleton } from "~/components/input-field-skeleton";

export function EditSharedMatchForm(input: {
  game: GameInput;
  match: Extract<MatchInput, { type: "shared" }>;
}) {
  const { sharedLocations } = useSuspenseSharedLocationsFromSharedMatch(
    input.match.sharedMatchId,
  );
  const { editMatchMutation } = useEditMatchMutation(input.match);
  const { match } = useMatch(input.match);
  const router = useRouter();
  const matchDefaultValues: {
    name: string;
    date: Date;
    location: {
      type: "shared";
      sharedId: number;
    } | null;
  } = {
    name: match.name,
    date: match.date,
    location:
      match.location?.type === "linked"
        ? {
            sharedId: match.location.sharedId,
            type: "shared",
          }
        : match.location,
  };
  const form = useAppForm({
    formId: "edit-shared-match-form",
    defaultValues: matchDefaultValues,
    validators: {
      onSubmit: editSharedMatchSchema,
    },
    onSubmit: ({ value }) => {
      const matchNameChanged = value.name !== match.name;
      const matchDateChanged = isSameDay(value.date, match.date);
      const matchLocationChanged =
        value.location?.sharedId !== match.location?.sharedId;
      editMatchMutation.mutate({
        type: "shared",
        match: {
          sharedMatchId: match.id,
          name: matchNameChanged ? undefined : value.name,
          date: matchDateChanged ? undefined : value.date,
          location: matchLocationChanged ? undefined : value.location,
        },
      });
    },
  });
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Edit {match.name}</CardTitle>
      </CardHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-4"
      >
        <CardContent>
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
          <form.Field name="location">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const selectValue =
                field.state.value === null
                  ? "null"
                  : `shared-${field.state.value.sharedId}`;
              const foundLocation = sharedLocations.find((location) => {
                return location.sharedId === Number(selectValue.split("-")[1]);
              });
              if (!foundLocation && field.state.value !== null) {
                field.handleChange(null);
              }
              return (
                <Field data-invalid={isInvalid} className="flex w-full">
                  <FieldLabel className="sr-only" htmlFor={field.name}>
                    Location
                  </FieldLabel>

                  <div className="flex w-full gap-2">
                    <Select
                      name={field.name}
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value === "null") {
                          field.handleChange(null);
                          return;
                        }
                        const [type, id] = value.split("-");
                        const idToNumber = Number(id);
                        if (isNaN(idToNumber)) {
                          return;
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
                        {sharedLocations.map((location) => {
                          const locationValue = `shared-${location.sharedId}`;
                          return (
                            <SelectItem
                              key={locationValue}
                              value={locationValue}
                            >
                              <div className="flex items-center gap-2">
                                <span>{location.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size={"icon"}
                      type="button"
                      className="rounded-full"
                      onClick={() => {
                        field.handleChange(null);
                      }}
                    >
                      <X />
                    </Button>
                  </div>

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
        </CardFooter>
      </form>
    </Card>
  );
}
export function EditSharedMatchSkeleton() {
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
