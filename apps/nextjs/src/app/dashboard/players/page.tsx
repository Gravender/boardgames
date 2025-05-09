import { Suspense } from "react";

import { prefetch, trpc } from "~/trpc/server";
import { PlayersTable } from "./_components/players";

export function generateMetadata() {
  return {
    title: "Players",
    icons: [{ rel: "icon", url: "/users.ico" }],
  };
}

export default function Page({
  searchParams,
}: {
  searchParams: { add?: string };
}) {
  void prefetch(trpc.player.getPlayers.queryOptions());
  const addPlayer = searchParams.add === "true";
  return (
    <div className="flex w-full items-center justify-center">
      <Suspense>
        <PlayersTable defaultIsOpen={addPlayer} />
      </Suspense>
    </div>
  );
}
