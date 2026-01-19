import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ClockIcon, GamepadIcon, MapPinIcon, UsersIcon } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@board-games/ui/item";

import { GameImage } from "~/components/game-image";
import { GamesDropDown } from "./games-dropdown";

interface GameCardProps {
  game: RouterOutputs["game"]["getGames"][number];
}

export function GameItem({ game }: GameCardProps) {
  const formattedLastPlayed = game.lastPlayed.date
    ? formatDistanceToNow(game.lastPlayed.date, { addSuffix: true })
    : "Never played";

  // Format player count
  const playerCount = () => {
    if (game.players.min === null && game.players.max === null)
      return "Unknown";
    if (game.players.min === game.players.max && game.players.min !== null)
      return `${game.players.min} players`;
    if (game.players.min === null) return `Up to ${game.players.max} players`;
    if (game.players.max === null) return `${game.players.min}+ players`;
    return `${game.players.min}-${game.players.max} players`;
  };

  // Format playtime
  const playtime = () => {
    if (game.playtime.min === null && game.playtime.max === null)
      return "Unknown";
    if (game.playtime.min === game.playtime.max && game.playtime.min !== null)
      return `${game.playtime.min} min`;
    if (game.playtime.min === null) return `Up to ${game.playtime.max} min`;
    if (game.playtime.max === null) return `${game.playtime.min}+ min`;
    return `${game.playtime.min}-${game.playtime.max} min`;
  };
  return (
    <Item
      variant="outline"
      aria-label={`${game.name} game item`}
      className="hover:bg-muted/50 transition-colors"
    >
      <Link
        href={`/dashboard/games/${game.type === "shared" ? "shared/" : ""}${game.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <GameImage
          image={game.image}
          alt={`${game.name} game image`}
          containerClassName="h-16 w-16 sm:h-24 sm:w-24"
        >
          {game.type === "shared" && (
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
        </GameImage>

        <ItemContent>
          <div className="flex flex-row items-center gap-2">
            <ItemTitle>{game.name}</ItemTitle>
            {game.yearPublished && (
              <span className="text-muted-foreground mr-auto shrink-0 text-xs">
                ({game.yearPublished})
              </span>
            )}
          </div>
          <ItemDescription className="text-xs sm:text-sm">
            <span className="xs:flex-row flex flex-col gap-2 sm:flex-row">
              <span className="flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {playerCount()}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {playtime()}
              </span>
              <span className="col-span-2 flex items-center gap-1 sm:col-span-1">
                <GamepadIcon className="h-3 w-3 shrink-0" />
                {game.games} {game.games === 1 ? "play" : "plays"}
              </span>
            </span>
            <span className="col-span-2 flex items-center gap-1 sm:col-span-1">
              <MapPinIcon className="h-3 w-3" />
              {formattedLastPlayed}
              {game.lastPlayed.location &&
                ` at ${game.lastPlayed.location.name}`}
            </span>
          </ItemDescription>
        </ItemContent>
      </Link>

      <ItemActions>
        <GamesDropDown data={game} />
      </ItemActions>
    </Item>
  );
}
