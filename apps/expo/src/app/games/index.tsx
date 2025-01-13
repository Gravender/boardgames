import { useState } from "react";
import { Button, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";

import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";

function GamesCard(props: { game: RouterOutputs["game"]["getGames"][number] }) {
  return (
    <View className="flex flex-row rounded-lg bg-muted p-4">
      <View className="flex-grow">
        <Link
          asChild
          href={{
            pathname: "/games/[id]",
            params: { id: props.game.id },
          }}
        >
          <Pressable className="">
            <Text className="text-xl font-semibold text-primary">
              {props.game.name}
            </Text>
            <Text className="mt-2 text-foreground">
              {props.game.lastPlayed.toLocaleString()}
            </Text>
          </Pressable>
        </Link>
      </View>
      <Pressable>
        <Text className="font-bold uppercase text-primary">Delete</Text>
      </Pressable>
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
      <Stack.Screen options={{ title: "Home Page" }} />
      <View className="h-full w-full bg-background p-4">
        <Text className="pb-2 text-center text-5xl font-bold text-foreground">
          Create <Text className="text-primary">T3</Text> Turbo
        </Text>

        <View>
          <SignedIn>
            {gamesQuery.data?.map((g) => <GamesCard key={g.id} game={g} />)}
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
