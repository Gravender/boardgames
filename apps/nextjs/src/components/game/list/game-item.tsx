import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarIcon,
  ClockIcon,
  GamepadIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
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
    <Item asChild>
      <Link
        href={`/dashboard/games/${game.type === "shared" ? "shared/" : ""}${game.id}`}
      >
        <GameImage
          image={game.image}
          alt={`${game.name} game image`}
          containerClassName="h-20 w-20 "
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
          <div className="flex items-center gap-2">
            <ItemTitle>{game.name}</ItemTitle>
            {game.yearPublished && (
              <span className="text-muted-foreground mr-auto shrink-0 text-xs">
                ({game.yearPublished})
              </span>
            )}
          </div>

          <div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
            {game.yearPublished && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{game.yearPublished}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5" />
              <span>{playerCount()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="h-3.5 w-3.5" />
              <span>{playtime()}</span>
            </div>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            {game.lastPlayed.location && <MapPinIcon className="h-3.5 w-3.5" />}
            <span>
              {formattedLastPlayed}
              {game.lastPlayed.location &&
                ` at ${game.lastPlayed.location.name}`}
            </span>
            <div className="flex items-center gap-1">
              <GamepadIcon className="h-3 w-3 shrink-0" />
              <span>
                {game.games} {game.games === 1 ? "play" : "plays"}
              </span>
            </div>
          </div>
        </ItemContent>

        <ItemActions>
          <GamesDropDown data={game} />
        </ItemActions>
      </Link>
    </Item>
  );
}
