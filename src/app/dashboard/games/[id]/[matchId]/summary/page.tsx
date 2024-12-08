import Image from "next/image";
import Link from "next/link";
import { Dices, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { api } from "~/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const slugs = await params;
  const matchId = slugs.matchId;
  const summary = await api.match.getSummary({
    id: Number(matchId),
  });
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 items-center sm:grid sm:grid-cols-2 max-w-3xl sm:items-stretch">
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
                      className="rounded-md aspect-square h-full w-full"
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
          <CardContent>
            <div className="flex w-full items-center justify-center gap-4 text-sm">
              <div className="flex w-24 items-center gap-2">
                <h4 className="font-medium">Plays:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{summary.previousMatches}</span>
                </div>
              </div>
              <div className="flex w-24 items-center gap-2">
                <h4 className="font-medium">Duration:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatDuration(summary.duration)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <span>Actions:</span>
            <Link href={`/dashboard/games/${summary.gameId}/${summary.id}`}>
              <Button variant="secondary">{"Back To Score"}</Button>
            </Link>
            <Link href={`/dashboard/games/${summary.gameId}/`}>
              <Button variant="secondary">{"Back To Game"}</Button>
            </Link>
            <Link href={`/dashboard/games/`}>
              <Button variant="secondary">{"Back To Games"}</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="max-w-xl w-full sm:col-span-1">
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {summary.players.map((player, index) => {
              const calculatePerformance = () => {
                if (!player.score) return "";
                const foundPlayer = summary.playerStats.find(
                  (p) => p.id === player.id,
                );
                if (!foundPlayer) return "";
                const highestScore = Math.max(...foundPlayer.scores);
                const lowestScore = Math.min(...foundPlayer.scores);
                if (foundPlayer.plays === 1) return "First Game";

                if (summary.scoresheet.winCondition === "Highest Score") {
                  if (player.score > highestScore) return "Best Game";
                  if (player.score === highestScore) return "Tied Best Game";
                  return "Worst Game";
                }
                if (summary.scoresheet.winCondition === "Lowest Score") {
                  if (player.score < lowestScore) return "Best Game";
                  if (player.score === lowestScore) return "Tied Best Game";
                  return "Worst Game";
                }
              };
              const playerPerformance = calculatePerformance();
              return (
                <div
                  className="flex justify-between items-center p-4"
                  key={`match-${player.id}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{`${index + 1}.`}</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="shadow">
                        <AvatarImage src={player.imageUrl} alt={player.name} />
                        <AvatarFallback className="bg-slate-300">
                          <User />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-base">{player.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {playerPerformance}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span>{player.score ?? 0}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="max-w-xl w-full sm:col-span-1">
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
