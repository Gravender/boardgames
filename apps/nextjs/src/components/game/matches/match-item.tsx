"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  Clock,
  Eye,
  MapPin,
  Pencil,
  PlayCircle,
  Share,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@board-games/ui/item";

import { formatMatchLink } from "~/utils/linkFormatting";
import { MatchDropdown } from "./match-dropdown";

type Match = NonNullable<RouterOutputs["game"]["gameMatches"]>[number];
interface MatchItemProps {
  match: Match;
}

export function MatchItem({ match }: MatchItemProps) {
  const isShared = match.type === "shared";

  return (
    <Item variant="outline" className="hover:bg-muted/50 transition-colors">
      <Link
        prefetch={true}
        href={formatMatchLink(
          match.type === "original"
            ? {
                type: "original",
                gameId: match.game.id,
                matchId: match.id,
                finished: match.finished,
              }
            : {
                type: "shared",
                sharedGameId: match.game.sharedGameId,
                sharedMatchId: match.id,
                finished: match.finished,
              },
        )}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <div className="flex items-center gap-4">
          {!match.finished ? (
            <PlayCircle className="size-6 text-blue-500" />
          ) : match.hasUser ? (
            match.won ? (
              <Trophy className="size-6 text-yellow-500" />
            ) : (
              <XCircle className="size-6 text-red-500" />
            )
          ) : (
            <Eye className="size-6 text-gray-500" />
          )}
        </div>

        <ItemContent>
          <ItemTitle>
            <span className="text-foreground">{match.name}</span>
            {isShared && (
              <Badge variant="secondary" className="text-xs">
                <Share className="mr-1 h-3 w-3" />
                Shared
              </Badge>
            )}
            {!match.finished && (
              <Badge
                variant="outline"
                className="border-blue-500/20 bg-blue-500/10 text-xs text-blue-600"
              >
                In Progress
              </Badge>
            )}
            {!match.hasUser && (
              <Badge className="border-stone-500/20 bg-stone-500/10 text-xs text-stone-600">
                View
              </Badge>
            )}
            {match.won && match.finished && match.hasUser && (
              <Badge className="border-yellow-500/20 bg-yellow-500/10 text-xs text-yellow-600">
                Won
              </Badge>
            )}
            {!match.won && match.finished && match.hasUser && (
              <Badge className="border-red-500/20 bg-red-500/10 text-xs text-red-600">
                Lost
              </Badge>
            )}
          </ItemTitle>

          <ItemDescription className="flex flex-wrap items-center gap-3">
            <span>{format(new Date(match.date), "MMM d, yyyy")}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(match.duration)}
            </span>
            {match.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.location.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {match.matchPlayers.length} players
            </span>
          </ItemDescription>
        </ItemContent>
      </Link>

      <ItemActions className="flex items-center gap-2 pl-2 sm:pl-4">
        {isShared && (
          <Badge variant="outline" className="text-xs">
            {match.permissions === "edit" ? (
              <>
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </>
            ) : (
              <>
                <Eye className="mr-1 h-3 w-3" /> View
              </>
            )}
          </Badge>
        )}

        <MatchDropdown match={match} />
      </ItemActions>
    </Item>
  );
}
