import Image from "next/image";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { RouterOutputs } from "~/trpc/react";

type Matches = NonNullable<RouterOutputs["game"]["getGame"]>["matches"];
type GameName = NonNullable<RouterOutputs["game"]["getGame"]>["name"];
type GameImage = NonNullable<RouterOutputs["game"]["getGame"]>["imageUrl"];
export function Matches({
  matches,
  gameName,
  imageUrl,
}: {
  matches: Matches;
  gameName: GameName;
  imageUrl: GameImage;
}) {
  return (
    <Table>
      <TableBody>
        {matches.map((match, index) => (
          <TableRow key={match.id}>
            <TableCell className="font-medium flex items-center gap-3">
              <div className="relative flex shrink-0 overflow-hidden h-12 w-12">
                {imageUrl ? (
                  <Image
                    fill
                    src={imageUrl}
                    alt={`${gameName} game image`}
                    className="rounded-md aspect-square h-full w-full"
                  />
                ) : (
                  <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                )}
              </div>
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col items-start">
                  <h2 className="text-md text-left font-semibold">
                    {`${gameName} # ${index + 1}`}
                  </h2>
                  <div className="flex min-w-20 items-center gap-1">
                    <span>Play Date:</span>
                    <span className="text-muted-foreground">
                      {match.date ? format(match.date, "d MMM yyyy") : null}
                    </span>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>{match.won ? "You Won" : "You Lost"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
