"use client";

import Link from "next/link";
import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { formatMatchLink } from "~/utils/linkFormatting";

export type GroupMatchRow =
  RouterOutputs["group"]["getGroup"]["matches"][number];

const getMatchHref = (match: GroupMatchRow) => {
  if (match.type === "original") {
    return formatMatchLink({
      type: "original",
      gameId: match.game.id,
      matchId: match.id,
      finished: match.finished,
    });
  }
  return formatMatchLink({
    type: match.game.type === "linked" ? "linked" : "shared",
    sharedMatchId: match.sharedMatchId,
    sharedGameId: match.game.sharedGameId,
    finished: match.finished,
  });
};

const getMatchTitle = (match: GroupMatchRow) =>
  match.name?.trim() || match.game.name;

const MetaSep = () => (
  <span className="text-muted-foreground/35 px-0.5" aria-hidden>
    ·
  </span>
);

export const GroupRecentMatchRow = ({ match }: { match: GroupMatchRow }) => {
  const href = getMatchHref(match);
  const title = getMatchTitle(match);
  const isCoop = match.isCoop;

  const playersOrCoopLabel = isCoop
    ? `${match.teams.length} team${match.teams.length === 1 ? "" : "s"} co-op`
    : `${match.matchPlayers.length} player${match.matchPlayers.length === 1 ? "" : "s"}`;

  return (
    <Item variant="outline" role="listitem" className="p-0">
      <Link
        prefetch={true}
        href={href}
        className="hover:bg-muted/40 flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors"
      >
        <ItemMedia
          variant="image"
          className="size-10 shrink-0 !translate-y-0 !self-center"
        >
          <GameImage
            image={match.game.image}
            alt={match.game.name}
            containerClassName="size-10 rounded-md"
          />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <ItemTitle className="text-sm leading-tight font-medium">
                {title}
              </ItemTitle>
              {match.name?.trim() ? (
                <ItemDescription className="text-muted-foreground line-clamp-1 text-[11px] leading-tight">
                  {match.game.name}
                </ItemDescription>
              ) : null}
            </div>
            <MatchStatusBadge match={match} />
          </div>

          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center text-[11px] leading-snug">
            <FormattedDate
              date={match.date}
              pattern="MMM d, yyyy"
              Icon={Calendar}
              className="gap-1"
              iconClassName="size-3"
            />
            <MetaSep />
            <span className="inline-flex items-center gap-0.5">
              <Clock className="size-3 shrink-0" aria-hidden />
              {formatDuration(match.duration)}
            </span>
            {match.location ? (
              <>
                <MetaSep />
                <span className="inline-flex min-w-0 max-w-[10rem] items-center gap-0.5 sm:max-w-[14rem]">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{match.location.name}</span>
                </span>
              </>
            ) : null}
            <MetaSep />
            <span className="inline-flex items-center gap-0.5">
              <Users className="size-3 shrink-0" aria-hidden />
              {playersOrCoopLabel}
            </span>
          </div>

          {match.comment?.trim() ? (
            <p className="text-muted-foreground line-clamp-1 pt-0.5 text-[11px] leading-tight">
              <span className="text-foreground/80 font-medium">Note: </span>
              {match.comment.trim()}
            </p>
          ) : null}
        </ItemContent>
      </Link>
    </Item>
  );
};

const MatchStatusBadge = ({ match }: { match: GroupMatchRow }) => {
  const userInMatch = match.hasUser;

  if (!userInMatch) {
    return (
      <Badge
        variant="secondary"
        className="h-5 shrink-0 px-1.5 py-0 text-[10px] leading-none font-normal"
      >
        Viewer
      </Badge>
    );
  }

  if (!match.finished) {
    return (
      <Badge
        variant="outline"
        className="h-5 shrink-0 px-1.5 py-0 text-[10px] leading-none font-normal"
      >
        In progress
      </Badge>
    );
  }

  if (match.isCoop) {
    return (
      <Badge
        variant={match.won ? "default" : "secondary"}
        className="h-5 shrink-0 px-1.5 py-0 text-[10px] leading-none font-normal"
      >
        {match.won ? "Team win" : "Team loss"}
      </Badge>
    );
  }

  return (
    <Badge
      variant={match.won ? "default" : "secondary"}
      className="h-5 shrink-0 px-1.5 py-0 text-[10px] leading-none font-normal"
    >
      {match.won ? "Won" : "Lost"}
    </Badge>
  );
};
