import { redirect } from "next/navigation";

import { caller, HydrateClient } from "~/trpc/server";
import { EditGameForm } from "~/components/game/edit/edit-game-form";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await caller.game.getEditGame({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <EditGameForm data={game} />
      </div>
    </HydrateClient>
  );
}
