import React from "react";
import { Image, View } from "react-native";
import { Link } from "expo-router";
import { format } from "date-fns";

import type { RouterOutputs } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { Dices } from "~/lib/icons/Dices";
import { cn } from "~/lib/utils";
import { MatchDropDown } from "./MatchDropDown";

export function MatchCard({
  gameId,
  imageUrl,
  match,
}: {
  gameId: NonNullable<RouterOutputs["game"]["getGame"]>["id"];
  imageUrl: NonNullable<RouterOutputs["game"]["getGame"]>["imageUrl"];
  match: NonNullable<RouterOutputs["game"]["getGame"]>["matches"][number];
}) {
  return (
    <Card>
      <CardContent className="flex flex-row items-center gap-2 p-2 pt-2">
        <View className="relative flex h-12 w-12 shrink-0 overflow-hidden">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              className="h-12 w-12 rounded-md"
              resizeMode="cover"
            />
          ) : (
            <Dices
              className="h-full w-full items-center justify-center rounded-md bg-muted p-2 text-foreground"
              size={40}
              strokeWidth={1.5}
            />
          )}
        </View>

        <View className="flex flex-grow flex-row items-center justify-between">
          <Link href={`/games/${gameId}/${match.id}`}>
            <View className="flex flex-col items-start">
              <Text className="text-md text-left font-semibold">
                {match.name}
              </Text>
              <View className="flex flex-row items-center gap-1">
                <Text>Play Date:</Text>
                <Text className="text-muted-foreground">
                  {format(match.date, "d MMM yyyy")}
                </Text>
              </View>
            </View>
          </Link>
          <View className="flex flex-row items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                match.finished
                  ? match.won
                    ? "bg-green-500"
                    : "bg-destructive"
                  : "bg-yellow-500",
                "w-16 text-destructive-foreground",
              )}
            >
              {!match.finished ? (
                <Text>-</Text>
              ) : match.won ? (
                <Text>Won</Text>
              ) : (
                <Text>Lost</Text>
              )}
            </Button>
            <MatchDropDown data={match} gameId={gameId} />
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
