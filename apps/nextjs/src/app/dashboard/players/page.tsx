import { Suspense } from "react";

import { prefetch, trpc } from "~/trpc/server";
import { PlayersTable } from "./_components/players";

export function generateMetadata() {
  return {
    title: "Players",
    icons: [{ rel: "icon", url: "/users.ico" }],
  };
}

export default function Page() {
  void prefetch(trpc.player.getPlayers.queryOptions());
  return (
    <div className="flex w-full items-center justify-center">
      <Suspense>
        <PlayersTable />
      </Suspense>
    </div>
  );
}
