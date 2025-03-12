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

export function GamesDropDown({
  data,
}: {
  data: RouterOutputs["game"]["getGames"][0];
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
    trpc.game.deleteGame.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        await queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({ id: data.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getEditGame.queryOptions({ id: data.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameStats.queryOptions({ id: data.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameName.queryOptions({ id: data.id }),
        );
        await queryClient.invalidateQueries(
          trpc.game.getGameMetaData.queryOptions({ id: data.id }),
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
          <Link href={`/games/${data.id}/stats`} asChild>
            <DropdownMenuItem>
              <Text>Stats</Text>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem>
            <Text>Rules</Text>
          </DropdownMenuItem>
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
