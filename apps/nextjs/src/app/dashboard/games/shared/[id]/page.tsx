import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import GameDetail from "~/components/game/detail";
import { caller, HydrateClient } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  try {
    const game = await caller.newGame.getGame({
      sharedGameId: Number(id),
      type: "shared",
    });
    if (!game.image?.url)
      return { title: game.name, description: `${game.name} Match Tracker` };
    return {
      title: game.name,
      description: `${game.name} Match Tracker`,
      openGraph: {
        images: [game.image.url],
      },
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return { title: "Game Not Found" };
    }
    return { title: "Games" };
  }
}
export default async function SharedGamePage({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  return (
    <HydrateClient>
      <div className="container px-3 py-1 md:px-6 md:py-2">
        <GameDetail game={{ sharedGameId: Number(id), type: "shared" }} />
      </div>
    </HydrateClient>
  );
}
