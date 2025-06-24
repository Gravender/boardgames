import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarIcon,
  Clock,
  GamepadIcon,
  MapPinIcon,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";

import { GameImage } from "~/components/game-image";
import { GamesDropDown } from "./gamesDropDown";

// Update the GameCardProps interface to include isCompact
interface GameCardProps {
  game: RouterOutputs["game"]["getGames"][number];
}

// Update the function signature to include the isCompact prop with a default value
export function GameCard({ game }: GameCardProps) {
  // Format the last played date - safely handle string dates
  const formattedLastPlayed = game.lastPlayed.date
    ? format(game.lastPlayed.date, "d MMM yyyy")
    : null;

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

  // Replace the return statement with this conditional rendering based on isCompact
  return (
    <li
      data-slot="card"
      className="relative flex h-full flex-col overflow-hidden rounded-lg border bg-card p-1 pb-2 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-row items-center">
        <Link
          prefetch={true}
          href={
            game.type === "shared"
              ? `/dashboard/games/shared/${game.id}`
              : `/dashboard/games/${game.id}`
          }
          className="p-1"
        >
          <GameImage
            image={game.image}
            alt={`${game.name} game image`}
            containerClassName="h-20 w-20 sm:h-24 sm:w-24"
          >
            {game.type === "shared" && (
              <>
                <Badge
                  variant="outline"
                  className="absolute left-1 top-1 bg-blue-600 px-1 text-xs text-white xs:hidden"
                >
                  S
                </Badge>
                <Badge
                  variant="outline"
                  className="absolute left-1 top-1 hidden bg-blue-600 text-xs text-white xs:inline-flex"
                >
                  Shared
                </Badge>
              </>
            )}
          </GameImage>
        </Link>
        <div className="min-w-0 flex-grow p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <h3 className="line-clamp-1 text-sm font-medium">{game.name}</h3>
              {game.yearPublished && (
                <span className="mr-auto flex-shrink-0 text-xs text-muted-foreground">
                  ({game.yearPublished})
                </span>
              )}
            </div>
            <GamesDropDown data={game} />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <div className="flex flex-shrink-0 items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{playerCount()}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{playtime()}</span>
              </div>
            </div>
            <div>
              {game.lastPlayed.location && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {game.lastPlayed.location.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <GamepadIcon className="h-3 w-3 flex-shrink-0" />
              <span>
                {game.games} {game.games === 1 ? "play" : "plays"}
              </span>
            </div>
            {formattedLastPlayed && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                <span suppressHydrationWarning>{formattedLastPlayed}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
