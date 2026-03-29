"use client";

import { CardHeader, CardTitle } from "@board-games/ui/card";
import { TableCell, TableRow } from "@board-games/ui/table";

import { MatchesList } from "~/components/game/matches";
import {
  type LocationDetailInput,
  useLocationDetailAndMatches,
} from "~/hooks/queries/location/matches";

export function LocationMatchesSection({
  input,
}: {
  input: LocationDetailInput;
}) {
  const { location, matches } = useLocationDetailAndMatches(input);

  if (location === null) {
    return null;
  }

  return (
    <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader>
        <CardTitle
          suppressHydrationWarning
        >{`Matches at ${location.name}`}</CardTitle>
      </CardHeader>
      <MatchesList matches={matches} />
    </div>
  );
}

export function LocationMatchesSkeleton() {
  return (
    <TableRow className="bg-card text-card-foreground flex w-full rounded-lg border shadow-sm">
      <TableCell className="flex w-full items-center font-medium">
        <div className="flex w-full items-center gap-3 font-medium">
          <div className="bg-card-foreground relative flex h-12 w-12 shrink-0 animate-pulse overflow-hidden rounded" />
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-md bg-card-foreground h-3 w-36 animate-pulse rounded-lg text-left font-semibold" />
              <div className="bg-card-foreground/50 flex h-2 min-w-20 animate-pulse items-center gap-1 rounded-lg"></div>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="flex w-24 items-center justify-center">
        <div className="bg-card-foreground/50 text-destructive-foreground inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-sm p-2 font-semibold" />
      </TableCell>
      <TableCell className="flex w-24 items-center justify-center"></TableCell>
    </TableRow>
  );
}
