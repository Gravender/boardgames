import { Suspense } from "react";

import { prefetch, trpc } from "~/trpc/server";
import { PlayersTable } from "./_components/players";

export function generateMetadata() {
  return {
    title: "Players",
    icons: [{ rel: "icon", url: "/users.ico" }],
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  void prefetch(trpc.player.getPlayers.queryOptions());
  const addPlayer = (await searchParams).add === "true";
  return (
    <div className="flex w-full items-center justify-center">
      <Suspense>
        <PlayersTable defaultIsOpen={addPlayer} />
      </Suspense>
    </div>
  );
}
