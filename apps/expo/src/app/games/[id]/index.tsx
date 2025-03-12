import React from "react";
import { Platform, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { AddGame } from "~/components/AddGame";
import { MatchCard } from "~/components/MatchCard";
import { Text } from "~/components/ui/text";
import { trpc } from "~/utils/api";

function MatchesTable({
  gameId,
  imageUrl,
  matches,
}: {
  gameId: NonNullable<RouterOutputs["game"]["getGame"]>["id"];
  imageUrl: NonNullable<RouterOutputs["game"]["getGame"]>["imageUrl"];
  matches: NonNullable<RouterOutputs["game"]["getGame"]>["matches"];
}) {
  return (
    <View style={{ width: "100%", height: "100%" }}>
      <View style={{ width: "100%", height: "90%" }}>
        <FlashList
          data={matches}
          estimatedItemSize={12}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <MatchCard
              gameId={gameId}
              imageUrl={imageUrl}
              key={item.id}
              match={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <View className="flex w-full flex-row justify-end pb-4 pr-6">
        <AddGame portalHost={CUSTOM_PORTAL_HOST_NAME} />
      </View>
    </View>
  );
}
const CUSTOM_PORTAL_HOST_NAME = "modal-AddGame";
const WindowOverlay =
  Platform.OS === "ios" ? FullWindowOverlay : React.Fragment;

export default function GameScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const gameId = Number(id);
  const { data } = useQuery(trpc.game.getGame.queryOptions({ id: gameId }));
  if (isNaN(gameId)) {
    return <Redirect href="/games" />;
  }

  return (
    <View>
      {/* Changes page title visible on the header */}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text className="text-xl font-semibold">
                {data?.name} Matches
              </Text>
              <Text className="text-xs text-muted-foreground">
                {data?.matches.length} Matches Played
              </Text>
            </View>
          ),
        }}
      />
      <View className="h-full w-full p-4">
        <MatchesTable
          gameId={gameId}
          imageUrl={data?.imageUrl}
          matches={data?.matches ?? []}
        />
      </View>
      <WindowOverlay>
        <PortalHost name={CUSTOM_PORTAL_HOST_NAME} />
      </WindowOverlay>
    </View>
  );
}
