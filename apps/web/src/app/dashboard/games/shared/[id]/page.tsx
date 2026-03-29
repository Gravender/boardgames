import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { ErrorBoundary } from "react-error-boundary";

import GameDetail from "~/components/game/detail";
import { GameNotFound } from "~/components/game/not-found";
import { caller, HydrateClient } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  try {
    const game = await caller.game.getGame({
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
        <ErrorBoundary
          fallback={
            <GameNotFound
              title="Shared Game Not Found"
              description="This shared game doesn't exist or is no longer shared with you."
              errorCode="SHARED_GAME_404"
            />
          }
        >
          <GameDetail game={{ sharedGameId: Number(id), type: "shared" }} />
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
