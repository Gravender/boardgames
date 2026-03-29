import React from "react";
import { View } from "react-native";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { MatchScoresheet } from "~/components/MatchScoresheet";
import { Text } from "~/components/ui/text";
import { trpc } from "~/utils/api";

export default function Scoresheet() {
  const { id, matchId } = useLocalSearchParams<{
    id: string;
    matchId: string;
  }>();
  const gameId = Number(id);
  const matchIdNumber = Number(matchId);
  const { data, isLoading } = useQuery(
    trpc.match.getMatch.queryOptions({
      id: matchIdNumber,
    }),
  );
  if (isNaN(matchIdNumber) || isNaN(gameId)) {
    if (isNaN(gameId)) return <Redirect href="/games" />;
    return <Redirect href={`/games/${gameId}`} />;
  }
  if (!data && !isLoading) return <Redirect href={`/games/${gameId}`} />;

  return (
    <View className="bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text className="text-xl font-semibold">
                {isLoading ? "Loading..." : data?.name}
              </Text>
            </View>
          ),
        }}
      />
      <View className="h-full w-full p-4">
        {data && <MatchScoresheet data={data} />}
      </View>
    </View>
  );
}
