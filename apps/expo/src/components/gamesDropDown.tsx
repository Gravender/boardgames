import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Text } from "~/components/ui/text";
import { MoreVertical } from "~/lib/icons/MoreVertical";
import { api, RouterOutputs } from "~/utils/api";

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
  const utils = api.useUtils();
  const deleteGame = api.game.deleteGame.useMutation({
    onSuccess: () => {
      utils.game.getGames.invalidate();
      utils.game.getGame.invalidate({ id: data.id });
      utils.game.getEditGame.invalidate({ id: data.id });
      utils.game.getGameStats.invalidate({ id: data.id });
      utils.game.getGameName.invalidate({ id: data.id });
      utils.game.getGameMetaData.invalidate({ id: data.id });
      utils.dashboard.invalidate();
    },
  });
  const onDelete = () => {
    deleteGame.mutate({ id: data.id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical
            className="text-foreground"
            size={20}
            strokeWidth={1.5}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent insets={contentInsets}>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Text>Edit</Text>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Text>Stats</Text>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Text>Rules</Text>
          </DropdownMenuItem>
          <DropdownMenuItem onPress={onDelete}>
            <Text className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground">
              Delete
            </Text>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
