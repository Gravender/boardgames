"use client";

import { useRouter } from "next/navigation";
import { isSameDay } from "date-fns";
import { X } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Skeleton } from "@board-games/ui/skeleton";

import type { GameInput, MatchInput } from "../types/input";
import { InputFieldSkeleton } from "~/components/input-field-skeleton";
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useEditMatchMutation } from "~/hooks/mutations/match/edit";
import { useSuspenseSharedLocationsFromSharedMatch } from "~/hooks/queries/locations";
import { useMatch } from "~/hooks/queries/match/match";
import { editSharedMatchSchema } from "./schema";

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
      const matchDateChanged = !isSameDay(value.date, match.date);
      const matchLocationChanged =
        value.location === null && match.location !== null
          ? true
          : value.location !== null && match.location === null
            ? true
            : value.location?.sharedId !== match.location?.sharedId;
      editMatchMutation.mutate({
        type: "shared",
        match: {
          sharedMatchId: match.id,
          name: matchNameChanged ? value.name : undefined,
          date: matchDateChanged ? value.date : undefined,
          location: matchLocationChanged ? value.location : undefined,
        },
      });
    },
  });
  if (match.permissions === "view") {
    return (
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Don't have permission to edit this match</CardTitle>
        </CardHeader>
      </Card>
    );
  }
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
          <form.AppField name="name">
            {(field) => (
              <field.TextField label="Match Name" placeholder="Match Name" />
            )}
          </form.AppField>
          <form.AppField name="date">
            {(field) => <field.DateField />}
          </form.AppField>
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
                console.error("Location not found.");
                return null;
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
                      aria-label="Clear location"
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
                    "Submit"
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
