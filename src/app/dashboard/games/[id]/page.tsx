import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";

import { Matches } from "./_components/matches";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  // fetch data
  if (isNaN(Number(id))) return { title: "Games" };
  const game = await api.game.getGame({ id: Number(id) });
  if (!game) return { title: "Games" };
  if (!game.imageUrl)
    return { title: game.name, description: `${game.name} Match Tracker` };
  return {
    title: game.name,
    description: `${game.name} Match Tracker`,
    openGraph: {
      images: [game.imageUrl],
    },
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await api.game.getGame({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Matches
          matches={game.matches}
          gameName={game.name}
          imageUrl={game.imageUrl}
          gameId={game.id}
        />
      </div>
    </HydrateClient>
  );
}
