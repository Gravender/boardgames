import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { GamepadIcon } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@board-games/ui/item";

import { PlayerImage } from "~/components/player-image";
import { PlayerDropDown } from "~/components/player/player-dropdown";

type ListPlayer = RouterOutputs["newPlayer"]["getPlayers"][number];

interface PlayerItemProps {
  player: ListPlayer;
}

const getPlayerPath = (player: ListPlayer) => {
  const id = player.type === "shared" ? player.sharedPlayerId : player.id;
  const prefix =
    player.type === "original"
      ? "/dashboard/players/"
      : "/dashboard/players/shared/";
  return `${prefix}${id}/insights`;
};

export const PlayerItem = ({ player }: PlayerItemProps) => {
  const lastPlayedLabel = player.lastPlayed
    ? formatDistanceToNow(player.lastPlayed, { addSuffix: true })
    : "No matches yet";

  return (
    <Item
      variant="outline"
      aria-label={`${player.name} player`}
      className="hover:bg-muted/50 transition-colors"
    >
      <Link
        prefetch={true}
        href={getPlayerPath(player)}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <PlayerImage
          image={player.image}
          alt={player.name}
          className="relative h-12 w-12 sm:h-16 sm:w-16"
          userImageClassName="h-12 w-12 sm:h-16 sm:w-16 text-lg"
        >
          {player.type === "shared" && (
            <>
              <Badge
                variant="outline"
                className="xs:hidden absolute top-1 left-1 bg-blue-600 px-1 text-xs text-white"
              >
                S
              </Badge>
              <Badge
                variant="outline"
                className="xs:inline-flex absolute top-1 left-1 hidden bg-blue-600 text-xs text-white"
              >
                Shared
              </Badge>
            </>
          )}
        </PlayerImage>

        <ItemContent>
          <ItemTitle>{player.name}</ItemTitle>
          <ItemDescription className="text-xs sm:text-sm">
            <span className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-3">
              <span className="flex items-center gap-1">
                <GamepadIcon className="h-3 w-3 shrink-0" />
                {player.matches} {player.matches === 1 ? "match" : "matches"}
              </span>
              {player.gameName ? (
                <span className="text-muted-foreground">
                  Last: {player.gameName}
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block">{lastPlayedLabel}</span>
          </ItemDescription>
        </ItemContent>
      </Link>

      <ItemActions>
        <PlayerDropDown data={player} />
      </ItemActions>
    </Item>
  );
};
