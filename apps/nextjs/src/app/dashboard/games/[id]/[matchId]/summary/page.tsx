import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Dices, User, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

import { caller } from "~/trpc/server";

interface Props {
  params: Promise<{ matchId: string; id: string }>;
}
type teamWithPlayers = NonNullable<
  RouterOutputs["match"]["getSummary"]
>["teams"][number] & {
  type: "Team";
  players: NonNullable<RouterOutputs["match"]["getSummary"]>["players"];
  placement: number;
  score: number;
  winner: boolean;
};
type playerWithoutTeams = NonNullable<
  RouterOutputs["match"]["getSummary"]
>["players"][number] & {
  type: "Player";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const slugs = await params;
  const matchId = slugs.matchId;

  // fetch data
  if (isNaN(Number(matchId))) return { title: "Games" };
  const summary = await caller.match.getSummary({
    id: Number(matchId),
  });
  if (!summary) return { title: "Games" };
  if (!summary.gameImageUrl)
    return {
      title: `${summary.name} Summary`,
      description: `Summarizing the results of ${summary.name}`,
    };
  return {
    title: `${summary.name} Summary`,
    description: `Summarizing the results of ${summary.name}`,
    openGraph: {
      images: [summary.gameImageUrl],
    },
  };
}
export default async function Page({ params }: Props) {
  const slugs = await params;
  const matchId = slugs.matchId;
  if (isNaN(Number(matchId))) redirect("/dashboard/games");
  const summary = await caller.match.getSummary({
    id: Number(matchId),
  });
  if (!summary) redirect("/dashboard/games");
  const calculatePerformance = (
    player: NonNullable<
      RouterOutputs["match"]["getSummary"]
    >["players"][number],
  ) => {
    if (player.score === null) return "";
    const foundPlayer = summary.playerStats.find((p) => p.id === player.id);
    if (!foundPlayer) return "";

    if (foundPlayer.firstGame) return "First Game";
    const highestScore = Math.max(...foundPlayer.scores);
    const lowestScore = Math.min(...foundPlayer.scores);

    if (summary.scoresheet.winCondition === "Highest Score") {
      if (player.score >= highestScore) return "Best Game";
      if (player.score === lowestScore) return "Worst Game";
    }
    if (summary.scoresheet.winCondition === "Lowest Score") {
      if (player.score <= lowestScore) return "Best Game";
      if (player.score === highestScore) return "Worst Game";
    }
    if (summary.scoresheet.winCondition === "Target Score") {
      if (player.score === summary.scoresheet.targetScore)
        return "Perfect Game";
      return "Worst Game";
    }
    return "";
  };
  const matchResults = () => {
    const playersWithoutTeams = summary.players
      .filter((player) => player.teamId === null)
      .map<playerWithoutTeams>((player) => ({ ...player, type: "Player" }));

    const teamsWithTeams = summary.teams.map<teamWithPlayers>((team) => {
      const teamPlayers = summary.players.filter(
        (player) => player.teamId === team.id,
      );
      const [firstTeamPlayer] = teamPlayers;
      return {
        ...team,
        players: teamPlayers,
        placement: firstTeamPlayer?.placement ?? 0,
        score: firstTeamPlayer?.placement ?? 0,
        winner: firstTeamPlayer?.winner ?? false,
        type: "Team",
      };
    });
    const sortedPlayersAndTeams: (playerWithoutTeams | teamWithPlayers)[] = [
      ...teamsWithTeams,
      ...playersWithoutTeams,
    ].toSorted((a, b) => {
      if (a.placement === b.placement) {
        return a.name.localeCompare(b.name);
      } else {
        if (a.placement === null) return -1;
        if (b.placement === null) return 1;
        return a.placement - b.placement;
      }
    });
    return sortedPlayersAndTeams;
  };
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex max-w-[54rem] flex-1 flex-col items-center gap-4 p-4 pt-0 sm:grid sm:grid-cols-2 sm:items-stretch">
        <Card className="w-full sm:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex w-full flex-col items-center justify-center gap-2">
                <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                  {summary.gameImageUrl ? (
                    <Image
                      fill
                      src={summary.gameImageUrl}
                      alt={`${summary.gameName} game image`}
                      className="aspect-square h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                  )}
                </div>
                <span className="text-xl font-semibold">
                  {summary.gameName}
                </span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="flex w-full max-w-[27rem] flex-col items-start justify-between gap-2 text-sm sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Plays:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{summary.previousMatches.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Duration:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatDuration(summary.duration)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Location:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span className="max-w-36 truncate">
                    {summary.locationName}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-start justify-start gap-4">
            <span className="flex h-10 items-center justify-center">
              Actions:
            </span>
            <div className="sm:full flex max-w-sm flex-row flex-wrap gap-1 sm:justify-end sm:space-x-2">
              <Button variant="secondary" asChild>
                <Link href={`/dashboard/games/${summary.gameId}/${summary.id}`}>
                  {"Back To Score"}
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/dashboard/games/${summary.gameId}/`}>
                  {"Back To Game"}
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/dashboard/games/`}>{"Back To Games"}</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
        <Card className="w-full sm:col-span-2">
          <CardHeader>
            <CardTitle>Previous Plays</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="flex">
              <ScrollArea className="w-1 flex-1">
                <div className="flex space-x-4 p-1 sm:p-4">
                  {summary.previousMatches.map((match) => (
                    <Link
                      className="flex shrink-0 flex-col items-center gap-2 text-sm text-secondary-foreground"
                      key={match.id}
                      href={
                        match.finished
                          ? `/dashboard/games/${match.gameId}/${match.id}/summary`
                          : `/dashboard/games/${match.gameId}/${match.id}`
                      }
                    >
                      <span className="flex max-w-28 truncate font-medium">
                        {match.finished
                          ? match.matchPlayers
                              .filter((player) => player.placement === 1)
                              .map((player) => player.player.name)
                              .join(", ")
                          : "Not Finished"}
                      </span>
                      <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                        {summary.gameImageUrl ? (
                          <Image
                            fill
                            src={summary.gameImageUrl}
                            alt={`${summary.gameName} game image`}
                            className="aspect-square h-full w-full rounded-md object-cover"
                          />
                        ) : (
                          <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        <span suppressHydrationWarning>
                          {format(match.date, "d MMM yyyy")}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full max-w-2xl sm:col-span-1">
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {matchResults().map((data) => {
              return (
                <div
                  className={cn(
                    "flex items-center justify-between p-4",
                    data.placement == 1 && "bg-green-500/10",
                  )}
                  key={`match-${data.id}`}
                >
                  {data.type === "Player" ? (
                    <div className="flex items-center justify-center gap-2">
                      <span>
                        {summary.scoresheet.winCondition === "Manual"
                          ? data.winner
                            ? "✔️"
                            : "❌"
                          : `${data.placement}.`}
                      </span>
                      <div className="flex items-center gap-2">
                        <Avatar className="shadow">
                          <AvatarImage
                            className="object-cover"
                            src={data.imageUrl}
                            alt={data.name}
                          />
                          <AvatarFallback className="bg-slate-300">
                            <User />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-base font-semibold text-foreground">
                            {data.name}
                          </span>
                          {calculatePerformance(data) && (
                            <Badge
                              variant="outline"
                              className="text-sm font-medium text-foreground"
                            >
                              {calculatePerformance(data)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>
                        {summary.scoresheet.winCondition === "Manual"
                          ? data.winner
                            ? "✔️"
                            : "❌"
                          : `${data.placement}.`}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-300">
                            <Users />
                          </div>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-base font-semibold text-foreground">
                            {`Team: ${data.name}`}
                          </span>
                          <div className="ml-2 flex flex-col">
                            {data.players.map((player) => (
                              <span key={player.id} className="text-sm">
                                {`- ${player.name}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <span>{data.score ?? 0}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="w-full max-w-2xl sm:col-span-1">
          <CardHeader>
            <CardTitle>Player stats</CardTitle>
          </CardHeader>
          <CardContent className="p-1 pt-0 sm:p-6 sm:pt-0">
            <Table className="rounded-md">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-card-foreground">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold text-card-foreground">
                    Plays
                  </TableHead>
                  <TableHead className="font-semibold text-card-foreground">
                    Wins
                  </TableHead>
                  <TableHead className="font-semibold text-card-foreground">
                    Best
                  </TableHead>
                  <TableHead className="font-semibold text-card-foreground">
                    Worst
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.playerStats.map((player) => {
                  const highestScore = Math.max(...player.scores);
                  const lowestScore = Math.min(...player.scores);
                  let Best: number | null = null;
                  let Worst: number | null = null;
                  if (summary.scoresheet.winCondition === "Highest Score") {
                    Best = highestScore;
                    Worst = lowestScore;
                  }
                  if (summary.scoresheet.winCondition === "Lowest Score") {
                    Best = lowestScore;
                    Worst = highestScore;
                  }
                  if (summary.scoresheet.winCondition === "Target Score") {
                    const foundScore = player.scores.find(
                      (score) => score === summary.scoresheet.targetScore,
                    );
                    Best = foundScore ? summary.scoresheet.targetScore : null;
                    const differenceHighest =
                      highestScore - summary.scoresheet.targetScore;
                    const differenceLowest =
                      lowestScore - summary.scoresheet.targetScore;
                    if (differenceLowest == 0 && differenceHighest == 0)
                      Worst = null;
                    else if (differenceLowest == 0) Worst = highestScore;
                    else if (differenceHighest == 0) Worst = lowestScore;
                  }

                  return (
                    <TableRow key={player.id}>
                      <TableHead>{player.name}</TableHead>
                      <TableCell>{player.plays}</TableCell>
                      <TableCell>{player.wins}</TableCell>
                      <TableCell>{Best ?? ""}</TableCell>
                      <TableCell>{Worst ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
