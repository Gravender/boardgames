import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { caller } from "~/trpc/server";
import { PlayerTabs } from "./_components/player-tabs";

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  // fetch data
  if (isNaN(Number(id))) return { title: "Player" };
  const player = await caller.player.getPlayer({
    id: Number(id),
  });
  if (!player.image?.url)
    return {
      title: `${player.name}'s Stats`,
      description: `${player.name} Board Game Stats`,

      icons: [{ rel: "icon", url: "/user.ico" }],
    };
  return {
    title: `${player.name}'s Stats`,
    description: `${player.name} Board Game Stats`,
    icons: [{ rel: "icon", url: "/user.ico" }],
    openGraph: {
      images: [player.image.url],
    },
  };
}

export default async function Page({ params }: Props) {
  const slugs = await params;
  const playerId = slugs.id;
  if (isNaN(Number(playerId))) redirect("/dashboard/players");
  const player = await caller.player.getPlayer({
    id: Number(playerId),
  });

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full max-w-5xl flex-col items-center p-2 pt-0">
        <PlayerTabs player={player} />
      </div>
    </div>
  );
}
