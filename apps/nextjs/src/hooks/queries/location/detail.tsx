import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

import type { LocationDetailInput } from "./types";

export function useLocationDetailQuery(input: LocationDetailInput) {
  const trpc = useTRPC();
  const { data: location } = useSuspenseQuery(
    trpc.location.getLocation.queryOptions(input),
  );
  return { location };
}
