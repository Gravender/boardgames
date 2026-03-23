import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { PlayerInsightsShell } from "~/components/player/insights/player-insights-shell";
import { caller, HydrateClient } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  if (isNaN(Number(id))) return { title: "Player" };
  try {
    const header = await caller.newPlayer.getPlayerHeader({
      id: Number(id),
      type: "original",
    });
    const imageUrl =
      header.image?.type === "file" ? header.image.url : undefined;
    const base = {
      title: `${header.name}'s Stats`,
      description: `Stats and trends for ${header.name}`,
      icons: [{ rel: "icon", url: "/user.ico" }],
    };
    if (!imageUrl) return base;
    return {
      ...base,
      openGraph: { images: [imageUrl] },
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return { title: "Player" };
    }
    return { title: "Player" };
  }
}

export default async function Page({ params }: Props) {
  const id = (await params).id;
  if (isNaN(Number(id))) redirect("/dashboard/players");

  const playerInput = { id: Number(id), type: "original" as const };

  try {
    await caller.newPlayer.getPlayerHeader(playerInput);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      redirect("/dashboard/players");
    }
    throw error;
  }

  return (
    <HydrateClient>
      <div className="flex w-full justify-center">
        <PlayerInsightsShell playerInput={playerInput} />
      </div>
    </HydrateClient>
  );
}
