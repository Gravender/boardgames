import React from "react";
import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { format } from "date-fns";

import type { RouterOutputs } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Text } from "~/components/ui/text";
import { Dices } from "~/lib/icons/Dices";
import { api } from "~/utils/api";

function GamesCard({
  game,
}: {
  game: RouterOutputs["game"]["getGames"][number];
}) {
  const playtimeText = () => {
    const playtime = game.playtime || {};
    if (playtime.min && playtime.max) {
      return `${playtime.min} - ${playtime.max}`;
    }
    if (playtime.min || playtime.max) {
      return `${playtime.min ?? playtime.max}`;
    }
    return null;
  };
  const playerText = () => {
    const players = game.players || {};
    if (players.min && players.max) {
      return `${players.min} - ${players.max}`;
    }
    if (players.min || players.max) {
      return `${players.min ?? players.max}`;
    }
    return null;
  };
  const lastPlayed = format(game.lastPlayed, "d MMM yyyy") || "";
  const yearPublished = game.yearPublished || "";
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
              <Button size="icon">
                <Text>5</Text>
              </Button>
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

function GamesTable({ games }: { games: RouterOutputs["game"]["getGames"] }) {
  return (
    <View>
      <View style={{ width: "100%", height: "100%" }}>
        <FlashList
          data={games}
          estimatedItemSize={12}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => <GamesCard key={item.id} game={item} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

export default function Index() {
  const { user } = useUser();
  const utils = api.useUtils();

  const gamesQuery = api.game.getGames.useQuery();

  return (
    <SafeAreaView className="bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text className="text-xl font-semibold">Games</Text>
              <Text className="text-xs text-muted-foreground">
                {gamesQuery.data?.length} Games
              </Text>
            </View>
          ),
        }}
      />
      <View className="h-full w-full p-4">
        <View>
          <SignedIn>
            <GamesTable games={gamesQuery.data ?? []} />
          </SignedIn>
          <SignedOut>
            <Link href="/(auth)/sign-in">
              <Text>Sign in</Text>
            </Link>
            <Link href="/(auth)/sign-up">
              <Text>Sign up</Text>
            </Link>
          </SignedOut>
        </View>
      </View>
    </SafeAreaView>
  );
}
