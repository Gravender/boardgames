import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { RouterOutputs } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
export function Match({
  scoresheet,
  players,
}: {
  scoresheet: Match["scoresheet"];
  players: Match["players"];
}) {
  return (
    <div className="px-4">
      <CardHeader>
        <CardTitle>{`${scoresheet.name} Scoresheet`}</CardTitle>
      </CardHeader>
      <Card>
        <Table>
          <>
            <TableHeader>
              <TableRow>
                <TableHead className="sm:w-36 w-20">Name:</TableHead>
                {players.map((player) => (
                  <TableHead key={player.id}>{player.player.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoresheet.rounds.map((round) => (
                <TableRow key={round.id}>
                  <TableCell
                    className={cn(
                      "sm:text-lg font-semibold text-muted-foreground",
                      round.color &&
                        "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
                    )}
                    style={{
                      backgroundColor: round.color ?? "",
                    }}
                  >
                    {round.name}
                  </TableCell>
                  {round.roundPlayers.map((roundPlayer) => (
                    <TableCell key={roundPlayer.id}>
                      {roundPlayer.score ?? 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="border-t-4 border-slate-700">
                <TableCell className="sm:text-lg font-semibold text-muted-foreground">
                  Total
                </TableCell>
                {players.map((player) => (
                  <TableCell key={`${player.id}-total`}>
                    {player.score}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </>
        </Table>
      </Card>
    </div>
  );
}
