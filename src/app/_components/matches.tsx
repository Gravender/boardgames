import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { RouterOutputs } from "~/trpc/react";

import { MatchDropDown } from "./matchesDropDown";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;
export function Matches({
  matches,
  gameName,
  imageUrl,
  gameId,
}: {
  matches: Game["matches"];
  gameName: Game["name"];
  imageUrl: Game["imageUrl"];
  gameId: Game["id"];
}) {
  return (
    <Table className="mt-4">
      <TableBody className="flex flex-col gap-2 px-4 w-full">
        {matches.map((match, index) => (
          <TableRow
            key={match.id}
            className="rounded-lg border bg-card text-card-foreground shadow-sm flex w-full"
          >
            <TableCell className="font-medium flex items-center w-full">
              <Link
                href={`/dashboard/games/${gameId}/${match.id}`}
                className="font-medium flex items-center gap-3 w-full"
              >
                <div className="relative flex shrink-0 overflow-hidden h-12 w-12">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`${gameName} game image`}
                      className="rounded-md aspect-square h-full w-full"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                  )}
                </div>
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col items-start">
                    <h2 className="text-md text-left font-semibold">
                      {match.name}
                    </h2>
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Play Date:</span>
                      <span className="text-muted-foreground">
                        {match.date ? format(match.date, "d MMM yyyy") : null}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </TableCell>
            <TableCell className="w-24 flex items-center justify-center">
              {!match.finished ? (
                <div className="inline-flex w-12 rounded-sm font-semibold p-2 text-destructive-foreground items-center justify-center bg-yellow-500 dark:bg-green-900">
                  {"-"}
                </div>
              ) : match.won ? (
                <div className="inline-flex w-12 rounded-sm font-medium p-2 text-destructive-foreground items-center justify-center bg-green-500 dark:bg-green-900">
                  {"Won"}
                </div>
              ) : (
                <div className="inline-flex w-12 rounded-sm font-medium p-2 text-destructive-foreground items-center justify-center bg-destructive">
                  {"Lost"}
                </div>
              )}
            </TableCell>
            <TableCell className="w-24 flex items-center justify-center">
              <MatchDropDown gameId={gameId} matchId={match.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
