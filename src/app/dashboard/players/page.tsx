"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { format } from "date-fns/format";
import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { api } from "~/trpc/server";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard");
  const players = await api.player.getPlayers();
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex flex-col gap-2 max-w-4xl w-full">
        {players.map((player) => {
          return (
            <div
              key={player.id}
              className="flex items-center gap-2 justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <Avatar className="shadow">
                  <AvatarImage src={player.imageUrl ?? ""} alt={player.name} />
                  <AvatarFallback className="bg-slate-300">
                    <User />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 p-2">
                  <span className="text-base">{player.name}</span>
                  {player.gameName && player.gameId && (
                    <span>Games: {player.gameName}</span>
                  )}
                  {player.lastPlayed && (
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Last Played:</span>
                      <span className="text-muted-foreground">
                        {format(player.lastPlayed, "d MMM yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none h-10 w-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
                {player.matches}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
