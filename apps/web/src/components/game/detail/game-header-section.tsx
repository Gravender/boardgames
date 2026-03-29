"use client";

import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Clock,
  MoreHorizontal,
  PencilIcon,
  Share2,
  UserCog,
  Users,
} from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { GameImage } from "~/components/game-image";
import { useGame } from "~/hooks/queries/game/game";

interface GameHeaderSectionProps {
  game:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      };
}
function formatRange(
  min: number | null,
  max: number | null,
  suffix?: string,
): string {
  if (min === null && max === null) return "Unknown";
  if (min === null) return `Up to ${max}${suffix ?? ""}`;
  if (max === null) return `${min}+${suffix ?? ""}`;
  if (min === max) return `${min}${suffix ?? ""}`;
  return `${min}-${max}${suffix ?? ""}`;
}
export function GameHeaderSection({ game: gameInput }: GameHeaderSectionProps) {
  const { game } = useGame(gameInput);
  const isShared = game.type === "shared";
  const canEdit = game.type === "original" || game.permission === "edit";
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="bg-muted relative h-36 w-full shrink-0 overflow-hidden rounded-lg sm:aspect-square sm:h-auto sm:w-36">
            <GameImage
              image={game.image}
              alt={`${game.name} game image`}
              containerClassName="aspect-square w-full shadow border rounded-lg"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-foreground text-2xl font-bold">
                    {game.name}
                  </h1>
                  {isShared && (
                    <Badge variant="secondary" className="text-xs">
                      Shared {game.permission === "edit" ? "(Edit)" : "(View)"}
                    </Badge>
                  )}
                </div>
                {game.yearPublished && (
                  <p className="text-muted-foreground text-sm">
                    Published {game.yearPublished}
                  </p>
                )}
                {isShared && (
                  <p className="text-muted-foreground text-sm">
                    Shared by {game.sharedBy.name}
                    {game.sharedBy.username && (
                      <span className="text-muted-foreground text-xs">
                        @{game.sharedBy.username}
                      </span>
                    )}
                    {game.sharedBy.player && (
                      <span className="text-muted-foreground text-xs">
                        {game.sharedBy.player.name}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/dashboard/games/${game.type === "original" ? "" : "shared/"}${game.type === "original" ? game.id : game.sharedGameId}/stats`}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Stats
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                      <span className="sr-only">Game options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/games/${game.type === "original" ? "" : "shared/"}${game.type === "original" ? game.id : game.sharedGameId}/edit`}
                          >
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Edit Game
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/games/${game.type === "original" ? "" : "shared/"}${game.id}/roles`}
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            Edit Roles
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isShared && (
                      <>
                        {canEdit && <DropdownMenuSeparator />}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/games/${game.id}/share`}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Game
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isShared && (
              <div className="bg-muted/50 border-border rounded-md border p-3">
                <p className="text-muted-foreground text-sm">
                  This is a shared game. You can view match history and details
                  from other players.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>
                  {formatRange(game.players.min, game.players.max)} Players
                </span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  {formatRange(game.playtime.min, game.playtime.max, " min")}
                </span>
              </div>
              {game.yearPublished && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{game.yearPublished}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
