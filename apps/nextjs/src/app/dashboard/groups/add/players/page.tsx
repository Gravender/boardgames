"use server";

import { HydrateClient } from "~/trpc/server";
import { PlayersTable } from "~/app/dashboard/players/_components/players";

export default async function Page() {
  return (
    <HydrateClient>
      <PlayersTable />
    </HydrateClient>
  );
}
