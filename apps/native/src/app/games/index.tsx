import React from "react";
import { Platform, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { Link, Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { AddGame } from "~/components/AddGame";
import { GamesCard } from "~/components/GameCard";
import { Text } from "~/components/ui/text";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

function GamesTable({ games }: { games: RouterOutputs["game"]["getGames"] }) {
  return (
    <View style={{ width: "100%", height: "100%" }}>
      <View style={{ width: "100%", height: "90%" }}>
        <FlashList
          data={games}
          estimatedItemSize={12}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => <GamesCard key={item.id} game={item} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <View className="flex w-full flex-row justify-end pb-4 pr-6">
        <AddGame portalHost={CUSTOM_PORTAL_HOST_NAME} />
      </View>
    </View>
  );
}
const CUSTOM_PORTAL_HOST_NAME = "modal-AddMatch";
const WindowOverlay =
  Platform.OS === "ios" ? FullWindowOverlay : React.Fragment;

export default function Index() {
  const gamesQuery = useQuery(trpc.game.getGames.queryOptions());
  const { data: session } = authClient.useSession();

  return (
    <View className="bg-background">
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
          {session !== null ? (
            <GamesTable games={gamesQuery.data ?? []} />
          ) : (
            <View>
              <Link href="/(auth)/sign-in">
                <Text>Sign in</Text>
              </Link>
              <Link href="/(auth)/sign-up">
                <Text>Sign up</Text>
              </Link>
            </View>
          )}
        </View>
      </View>
      <WindowOverlay>
        <PortalHost name={CUSTOM_PORTAL_HOST_NAME} />
      </WindowOverlay>
    </View>
  );
}
