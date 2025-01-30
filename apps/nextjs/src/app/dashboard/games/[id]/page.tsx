import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { Matches, MatchSkeleton } from "./_components/matches";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await api.game.getGameMetaData({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
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
  void api.game.getGame.prefetch({ id: Number(id) });
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MatchSkeleton key={i} />
                ))}
              </div>
            </div>
          }
        >
          <Matches gameId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
