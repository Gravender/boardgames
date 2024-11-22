"use server";

import { Dices } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import { api } from "~/trpc/server";

export async function Games() {
  const games = await api.game.getGames();

  return (
    <div className="w-full max-w-xs">
      {games ? (
        <div>
          {games.map((game) => (
            <div key={game.id}>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={game.gameImg ? game.gameImg : ""}
                    alt="Game image"
                  />
                  <AvatarFallback>
                    <Dices className="h-full w-full p-2" />
                  </AvatarFallback>
                </Avatar>

                <p>{game.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>You have no games yet.</p>
      )}
    </div>
  );
}
