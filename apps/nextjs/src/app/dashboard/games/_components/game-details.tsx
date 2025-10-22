import { Calendar, Clock, GamepadIcon, Users } from "lucide-react";

interface GameDetailsProps {
  players: {
    min: number | null;
    max: number | null;
  };
  playtime: {
    min: number | null;
    max: number | null;
  };
  yearPublished: number | null;
  matchesCount: number;
  isShared?: boolean;
}

export function GameDetails({
  players,
  playtime,
  yearPublished,
  matchesCount,
  isShared = false,
}: GameDetailsProps) {
  // Format player count
  const playerCount = () => {
    if (players.min === null && players.max === null) return "Unknown";
    if (players.min === players.max && players.min !== null)
      return `${players.min} players`;
    if (players.min === null) return `Up to ${players.max} players`;
    if (players.max === null) return `${players.min}+ players`;
    return `${players.min}-${players.max} players`;
  };

  // Format playtime
  const playtimeText = () => {
    if (playtime.min === null && playtime.max === null) return "Unknown";
    if (playtime.min === playtime.max && playtime.min !== null)
      return `${playtime.min} min`;
    if (playtime.min === null) return `Up to ${playtime.max} min`;
    if (playtime.max === null) return `${playtime.min}+ min`;
    return `${playtime.min}-${playtime.max} min`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Users className="text-muted-foreground h-5 w-5" />
          <span>{playerCount()}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-5 w-5" />
          <span>{playtimeText()}</span>
        </div>

        {yearPublished && (
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-5 w-5" />
            <span>Published in {yearPublished}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <GamepadIcon className="text-muted-foreground h-5 w-5" />
          <span>
            {matchesCount} {matchesCount === 1 ? "match" : "matches"} played
          </span>
        </div>
      </div>

      {isShared && (
        <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
          <p className="text-blue-800 dark:text-blue-300">
            This is a shared game. You can view match history and details from
            other players.
          </p>
        </div>
      )}
    </div>
  );
}
