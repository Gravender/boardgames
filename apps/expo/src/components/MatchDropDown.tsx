import type { View } from "react-native";
import * as React from "react";
import { Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Text } from "~/components/ui/text";
import { MoreVertical } from "~/lib/icons/MoreVertical";
import { trpc } from "~/utils/api";

export function MatchDropDown({
  gameId,
  data,
}: {
  gameId: NonNullable<RouterOutputs["game"]["getGame"]>["id"];
  data: NonNullable<RouterOutputs["game"]["getGame"]>["matches"][number];
}) {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  const [dropdownSide, setDropdownSide] = React.useState<"top" | "bottom">(
    "bottom",
  );
  const buttonRef = React.useRef<View>(null);

  const checkPosition = React.useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.measure((_x, _y, _width, _height, _pageX, pageY) => {
        const windowHeight = Dimensions.get("window").height;
        const threshold = windowHeight * 0.7; // 70% of screen height
        setDropdownSide(pageY > threshold ? "top" : "bottom");
      });
    }
  }, []);

  const queryClient = useQueryClient();
  const deleteGame = useMutation(
    trpc.match.deleteMatch.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: gameId }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameStats.queryOptions({ id: gameId }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameMetaData.queryOptions({ id: gameId }),
        );
        await queryClient.invalidateQueries(trpc.player.pathFilter());
        await queryClient.invalidateQueries(trpc.dashboard.pathFilter());
      },
    }),
  );
  const onDelete = () => {
    deleteGame.mutate({ id: data.id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          ref={buttonRef}
          onLayout={checkPosition}
        >
          <MoreVertical
            className="text-foreground"
            size={20}
            strokeWidth={1.5}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent insets={contentInsets} side={dropdownSide}>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Text>Edit</Text>
          </DropdownMenuItem>
          <Link
            href={{
              pathname: "/games/[id]/[matchId]/scoresheet",
              params: { id: gameId, matchId: data.id },
            }}
            asChild
          >
            <DropdownMenuItem>
              <Text>ScoreSheet</Text>
            </DropdownMenuItem>
          </Link>
          {data.finished && (
            <Link href={`/games/${gameId}/${data.id}/summary`} asChild>
              <DropdownMenuItem>
                <Text>Summary</Text>
              </DropdownMenuItem>
            </Link>
          )}
          <DropdownMenuItem onPress={() => onDelete()}>
            <Text className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground">
              Delete
            </Text>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
