import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";

import { EditGameForm } from "./_components/editGameForm";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await api.game.getEditGame({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <EditGameForm data={game} />
      </div>
    </HydrateClient>
  );
}
