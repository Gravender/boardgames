import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Clock, Gamepad2, Medal, Trophy } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Card, CardContent } from "@board-games/ui/card";

import { PlayerImage } from "~/components/player-image";
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
  const player = await caller.sharing.getSharedPlayer({
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
  const player = await caller.sharing.getSharedPlayer({
    id: Number(playerId),
  });

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full max-w-5xl flex-col items-center p-2 pt-0">
        <div className="w-full space-y-6">
          {/* Player Header */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6 md:text-left">
                <PlayerImage
                  className="size-24 md:size-32"
                  image={player.image}
                  alt={player.name}
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center">
                    <h1 className="truncate text-2xl font-bold md:text-3xl">
                      {player.name}
                    </h1>
                  </div>

                  <p className="text-muted-foreground mb-4 text-sm md:text-base">
                    Joined {format(player.createdAt, "MMMM d, yyyy")}
                  </p>

                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="flex flex-col items-center md:items-start">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-xl font-bold">
                          {Math.round(player.stats.winRate * 100)}%
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">Win Rate</p>
                    </div>

                    <div className="flex flex-col items-center md:items-start">
                      <div className="flex items-center gap-1">
                        <Gamepad2 className="h-4 w-4 text-blue-500" />
                        <span className="text-xl font-bold">
                          {player.stats.plays}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Games Played
                      </p>
                    </div>

                    <div className="flex flex-col items-center md:items-start">
                      <div className="flex items-center gap-1">
                        <Medal className="h-4 w-4 text-amber-500" />
                        <span className="text-xl font-bold">
                          {player.stats.wins}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">Victories</p>
                    </div>

                    <div className="flex flex-col items-center md:items-start">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="text-xl font-bold">
                          {formatDuration(player.stats.playtime)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Total Play Time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <PlayerTabs player={player} />
        </div>
      </div>
    </div>
  );
}
