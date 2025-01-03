import { match } from "assert";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Dices, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn, formatDuration } from "~/lib/utils";
import { api } from "~/trpc/server";

type Props = {
  params: Promise<{ matchId: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const slugs = await params;
  const matchId = slugs.matchId;

  // fetch data
  if (isNaN(Number(matchId))) return { title: "Games" };
  const summary = await api.match.getSummary({
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
  const summary = await api.match.getSummary({
    id: Number(matchId),
  });
  if (!summary) redirect("/dashboard/games");
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 items-center sm:grid sm:grid-cols-2 max-w-[54rem] sm:items-stretch">
        <Card className="w-full sm:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2 w-full items-center justify-center">
                <div className="relative flex shrink-0 overflow-hidden h-20 w-20 rounded shadow">
                  {summary.gameImageUrl ? (
                    <Image
                      fill
                      src={summary.gameImageUrl}
                      alt={`${summary.gameName} game image`}
                      className="rounded-md aspect-square h-full w-full object-cover"
                    />
                  ) : (
                    <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                  )}
                </div>
                <span className="text-xl font-semibold">
                  {summary.gameName}
                </span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center ">
            <div className="flex w-full max-w-[27rem] items-start sm:items-center justify-between gap-2 text-sm sm:flex-row flex-col">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Plays:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{summary.previousMatches}</span>
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
                  <span className="truncate max-w-36">
                    {summary.locationName}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 items-start justify-start">
            <span className="flex h-10 items-center justify-center">
              Actions:
            </span>
            <div className="flex flex-row flex-wrap max-w-sm sm:full sm:justify-end sm:space-x-2 gap-1">
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

        <Card className="max-w-2xl w-full sm:col-span-1">
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {summary.players.map((player, index) => {
              const calculatePerformance = () => {
                if (player.score === null) return "";
                const foundPlayer = summary.playerStats.find(
                  (p) => p.id === player.id,
                );
                if (!foundPlayer) return "";
                const firstGame = foundPlayer.dates.sort(
                  (a, b) => a.getTime() - b.getTime(),
                )[0];
                if (
                  foundPlayer.plays === 1 ||
                  summary.date.getTime() === firstGame?.getTime()
                )
                  return "First Game";
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
              const playerPerformance = calculatePerformance();
              return (
                <div
                  className={cn(
                    "flex justify-between items-center p-4",
                    player.isWinner && "bg-green-500/10",
                  )}
                  key={`match-${player.id}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{`${index + 1}.`}</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="shadow">
                        <AvatarImage
                          className="object-cover"
                          src={player.imageUrl}
                          alt={player.name}
                        />
                        <AvatarFallback className="bg-slate-300">
                          <User />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-foreground text-base font-semibold">
                          {player.name}
                        </span>
                        {playerPerformance && (
                          <Badge
                            variant="outline"
                            className="text-sm text-foreground font-medium"
                          >
                            {playerPerformance}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <span>{player.score ?? 0}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="max-w-2xl w-full sm:col-span-1">
          <CardHeader>
            <CardTitle>Player stats</CardTitle>
          </CardHeader>
          <CardContent className="p-1 sm:p-6 sm:pt-0 pt-0">
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
