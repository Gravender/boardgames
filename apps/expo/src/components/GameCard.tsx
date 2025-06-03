import React from "react";
import { Image, View } from "react-native";
import { Link } from "expo-router";
import { format } from "date-fns";

import type { RouterOutputs } from "~/utils/api";
import { GamesDropDown } from "~/components/gamesDropDown";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Text } from "~/components/ui/text";
import { Dices } from "~/lib/icons/Dices";

export function GamesCard({
  game,
}: {
  game: RouterOutputs["game"]["getGames"][number];
}) {
  const playtimeText = () => {
    const playtime = game.playtime;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (playtime?.min && playtime?.max) {
      return `${playtime.min} - ${playtime.max}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (playtime?.min || playtime?.max) {
      return `${playtime.min ?? playtime.max}`;
    }
    return null;
  };
  const playerText = () => {
    const players = game.players;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (players?.min && players?.max) {
      return `${players.min} - ${players.max}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (players?.min || players?.max) {
      return `${players.min ?? players.max}`;
    }
    return null;
  };

  const lastPlayed =
    game.lastPlayed.date !== null
      ? format(game.lastPlayed.date, "d MMM yyyy")
      : "";
  const yearPublished = game.yearPublished ?? "";
  return (
    <Card>
      <CardContent className="flex flex-row items-center gap-2 p-2 pt-2">
        <View className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden">
          {game.image ? (
            <Image
              source={{ uri: game.image }}
              className="h-[4.5rem] w-[4.5rem] rounded-md"
              resizeMode="cover"
            />
          ) : (
            <Dices
              className="h-full w-full items-center justify-center rounded-md bg-muted p-2 text-foreground"
              size={60}
              strokeWidth={1.5}
            />
          )}
        </View>
        <View className="flex flex-grow flex-col items-start">
          <View className="flex w-full max-w-80 flex-row items-center justify-between">
            <Link href={`/games/${game.id}`}>
              <View className="flex flex-col items-start">
                <Text className="text-md text-left font-semibold">
                  {game.name}
                </Text>
                <View className="flex flex-row items-center gap-1">
                  <Text>Last Played:</Text>
                  <Text className="text-muted-foreground">{lastPlayed}</Text>
                </View>
              </View>
            </Link>
            <View className="flex flex-row items-center gap-2">
              <Button variant="outline" size="icon">
                <Text>{game.games}</Text>
              </Button>
              <GamesDropDown data={game} />
            </View>
          </View>
          <View className="mb-2 flex w-full max-w-80 flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-1">
              <Text className="text-sm">Players:</Text>
              <Text className="text-sm text-muted-foreground">
                {playerText()}
              </Text>
            </View>
            <Separator orientation="vertical" className="h-4" />
            <View className="flex flex-row items-center gap-1">
              <Text className="text-sm">Playtime:</Text>
              <Text className="text-sm text-muted-foreground">
                {playtimeText()}
              </Text>
            </View>
            <Separator orientation="vertical" className="h-4" />
            <View className="flex min-w-20 flex-row items-center gap-1">
              <Text className="text-sm">Year:</Text>
              <Text className="text-sm text-muted-foreground">
                {yearPublished}
              </Text>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
