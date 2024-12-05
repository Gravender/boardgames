"use client";

import { on } from "events";
import { use, useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { api, RouterOutputs } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
export function Match({ match }: { match: Match }) {
  const [players, setPlayers] = useState(() => [...match.players]);
  const utils = api.useUtils();
  const updateMatch = api.match.updateMatch.useMutation({
    onSuccess: async () => {
      await utils.match.getMatch.invalidate({ id: match.id });
    },
  });
  const onSubmit = () => {
    const winner = players.reduce<{
      id: Match["players"][number]["id"];
      score: number;
    }>(
      (prev, current) => {
        const temp = {
          id: current.id,
          score: current.rounds.reduce((acc, round) => {
            return acc + (round.score ?? 0);
          }, 0),
        };
        if (match.scoresheet.winCondition === "Highest Score") {
          return prev && (prev.score ?? 0) > (temp.score ?? -Infinity)
            ? prev
            : temp;
        }
        if (match.scoresheet.winCondition === "Lowest Score") {
          return prev && (prev.score ?? 0) < (temp.score ?? Infinity)
            ? prev
            : temp;
        }
        if (match.scoresheet.winCondition === "No Winner") {
          return { id: -1, score: -Infinity };
        }
        if (match.scoresheet.winCondition === "Manual") {
          return { id: -1, score: 0 };
        }
        if (match.scoresheet.winCondition === "Target Score") {
          return { id: -1, score: 0 };
        }
        return prev && (prev.score ?? 0) > (temp.score ?? -Infinity)
          ? prev
          : temp;
      },
      {
        id: players[0]?.id ?? -1,
        score:
          players[0]?.score ??
          (match.scoresheet.winCondition === "Highest Score"
            ? -Infinity
            : Infinity),
      },
    );
    updateMatch.mutate({
      roundPlayers: players.flatMap((player) =>
        player.rounds.map((round) => ({
          id: round.id,
          score: round.score,
          roundId: round.id,
          matchPlayerId: player.id,
        })),
      ),
      matchPlayers: players.map((player) => {
        const score = player.rounds.reduce((acc, round) => {
          return acc + (round.score ?? 0);
        }, 0);
        //TODO: need to add target score for scoresheet
        const matchWinner = winner.score === score;
        return {
          id: player.id,
          score,
          winner: matchWinner,
        };
      }),
    });
  };
  useEffect(() => {
    return () => {
      onSubmit();
    };
  }, []);
  return (
    <div className="px-4">
      <CardHeader>
        <CardTitle>{`${match.scoresheet.name} Scoresheet`}</CardTitle>
      </CardHeader>
      <Card>
        <Table>
          <>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="sm:w-36 w-20">
                  Name:
                </TableHead>
                {players.map((player) => (
                  <TableHead scope="col" key={player.id}>
                    {player.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {match.scoresheet.rounds.map((round, index) => (
                <TableRow key={`round-${round.id}`}>
                  <TableHead
                    scope="row"
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
                  </TableHead>
                  {players.map((player, playerIndex) => {
                    const roundPlayer = player.rounds[index];

                    return (
                      <TableCell key={`player-${player.id}-round-${round.id}`}>
                        {round.type === "Numeric" ? (
                          <Input
                            type="number"
                            className="text-center"
                            value={roundPlayer?.score ?? 0}
                            onChange={(e) => {
                              const score = Number(e.target.value);
                              const temp = [...players];
                              temp[playerIndex]!.rounds[index]!.score = score;
                              setPlayers(temp);
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center">
                            <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                            <Checkbox
                              className=""
                              value={roundPlayer?.score ?? 0}
                              onCheckedChange={(isChecked) => {
                                const temp = [...players];
                                temp[playerIndex]!.rounds[index]!.score =
                                  isChecked ? round.score : 0;
                                setPlayers(temp);
                              }}
                            />
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow className="border-t-4 border-slate-700">
                <TableHead
                  scope="row"
                  className="sm:text-lg font-semibold text-muted-foreground"
                >
                  Total
                </TableHead>
                {players.map((player, index) => {
                  if (match.scoresheet.roundsScore === "Manual") {
                    return (
                      <TableCell key={`${player.id}-total`}>
                        <Input
                          type="number"
                          className="text-center"
                          value={player?.score ?? 0}
                          onChange={(e) => {
                            const score = Number(e.target.value);
                            const temp = [...players];
                            temp[index]!.score = score;
                            setPlayers(temp);
                          }}
                        />
                      </TableCell>
                    );
                  }
                  const total = player.rounds.reduce((acc, round) => {
                    if (match.scoresheet.roundsScore === "Aggregate") {
                      return acc + (round.score ?? 0);
                    }
                    if (match.scoresheet.roundsScore === "Best Of") {
                      return acc > (round.score ?? 0)
                        ? acc
                        : (round.score ?? 0);
                    }
                    return acc;
                  }, 0);
                  return (
                    <TableCell key={`${player.id}-total`}>
                      <div className="flex items-center justify-center">
                        {total}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </>
        </Table>
      </Card>
      <Button onClick={onSubmit}>Submit</Button>
    </div>
  );
}
