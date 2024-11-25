"use client";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Dices, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import type { Table } from "@tanstack/react-table";
import { Separator } from "~/components/ui/separator";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api, RouterOutputs } from "~/trpc/react";

import { format } from "date-fns";
import { DataTable } from "./dataTable";
import { Card, CardContent } from "~/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "~/hooks/use-toast";

export function Games({ games }: { games: RouterOutputs["game"]["getGames"] }) {
  const utils = api.useUtils();
  const router = useRouter();
  const { toast } = useToast();
  const deleteGame = api.game.deleteGame.useMutation({
    onSuccess: async () => {
      await utils.game.getGames.invalidate();
      router.refresh();
      toast({
        title: "Game deleted successfully!",
        variant: "destructive",
      });
    },
  });
  const columnHelper =
    createColumnHelper<RouterOutputs["game"]["getGames"][0]>();
  const columns = [
    columnHelper.accessor("gameImg", {
      header: "Image",
      cell: ({ row }) => (
        <Avatar className="h-24 w-24 rounded">
          <AvatarImage
            src={row.getValue("gameImg") ? row.getValue("gameImg") : ""}
            alt="Game image"
          />
          <AvatarFallback>
            <Dices className="h-full w-full p-2" />
          </AvatarFallback>
        </Avatar>
      ),
    }),
    columnHelper.group({
      enableGrouping: false,
      enableSorting: false,
      header: "Game",
      sortingFn: (rowA, rowB) => {
        return rowA.original.name.localeCompare(rowB.original.name);
      },
      cell: (props) => {
        const players = props.row.original.players as {
          min: number | null;
          max: number | null;
        } | null;
        const playerMin = players?.min ?? null;
        const playerMax = players?.max ?? null;
        const playtime = props.row.original?.playtime as {
          min: number | null;
          max: number | null;
        } | null;
        const playtimeMin = playtime?.min ?? null;
        const playtimeMax = playtime?.max ?? null;
        const yearPublished = props.row.original?.yearPublished ?? "";
        const lastPlayed =
          format(props.row.original?.lastPlayed, "d MMM yyyy") ?? null;
        return (
          <div className="flex flex-col gap-1 p-2">
            <h2 className="text-xl font-bold">{props.row.original?.name}</h2>
            <div className="flex min-w-20 items-center gap-1">
              <span>Last Played:</span>
              <span className="text-muted-foreground">{lastPlayed}</span>
            </div>
            <div className="flex max-w-96 items-center justify-between">
              <div className="flex w-24 items-center">
                <h4 className="font-medium">Players:</h4>
                <div className="flex justify-between text-muted-foreground">
                  {playerMin && playerMax ? (
                    <>
                      <span>{playerMin}</span>
                      <span>-</span>
                      <span>{playerMax}</span>
                    </>
                  ) : playerMin || playerMax ? (
                    <>
                      <span>{playerMin ?? playerMax}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex w-24 items-center">
                <span>Playtime:</span>
                <div className="flex justify-between text-muted-foreground">
                  {playtimeMin && playtimeMax ? (
                    <>
                      <span>{playtimeMin}</span>
                      <span>-</span>
                      <span>{playtimeMax}</span>
                    </>
                  ) : playtimeMin || playtimeMax ? (
                    <>
                      <span>{playtimeMin ?? playtimeMax}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex w-24 items-center gap-1">
                <span>Year:</span>
                <span className="text-muted-foreground">{yearPublished}</span>
              </div>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("games", {
      header: "Played",
      cell: (row) => (
        <Button size={"icon"} variant={"outline"}>
          {row.getValue()}
        </Button>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        const payment = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Stats</DropdownMenuItem>
              <DropdownMenuItem>Rules</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
                onClick={() => deleteGame.mutate({ id: row.original.id })}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ];

  const renderMobile = ({
    table,
  }: {
    table: Table<RouterOutputs["game"]["getGames"][0]>;
  }) => {
    return (
      <div className="flex flex-col gap-2">
        {table.getRowModel().rows?.map((row) => {
          const players = row.original.players as {
            min: number | null;
            max: number | null;
          } | null;
          const playerMin = players?.min ?? null;
          const playerMax = players?.max ?? null;
          const playtime = row.original?.playtime as {
            min: number | null;
            max: number | null;
          } | null;
          const playtimeMin = playtime?.min ?? null;
          const playtimeMax = playtime?.max ?? null;
          const yearPublished = row.original?.yearPublished ?? "";
          const lastPlayed =
            format(row.original?.lastPlayed, "d MMM yyyy") ?? null;
          return (
            <button key={`mobile-${row.id}`} className="w-full">
              <Card className="flex w-full items-center gap-3 border-none">
                <Avatar className="h-12 w-12 rounded">
                  <AvatarImage
                    src={row.getValue("gameImg") ? row.getValue("gameImg") : ""}
                    alt="Game image"
                  />
                  <AvatarFallback>
                    <Dices className="h-full w-full p-2" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-grow flex-col items-start">
                  <h2 className="text-left text-xl font-semibold">
                    {row.original.name}
                  </h2>
                  <div className="flex min-w-20 items-center gap-1">
                    <span>Last Played:</span>
                    <span className="text-muted-foreground">{lastPlayed}</span>
                  </div>
                  <div className="mb-2 flex w-full items-center justify-between text-sm">
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Players:</span>
                      <span className="flex justify-between text-muted-foreground">
                        {playerMin && playerMax ? (
                          <>
                            <span>{playerMin}</span>
                            <span>-</span>
                            <span>{playerMax}</span>
                          </>
                        ) : playerMin || playerMax ? (
                          <>
                            <span>{playerMin ?? playerMax}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Playtime:</span>
                      <span className="flex justify-between text-muted-foreground">
                        {playtimeMin && playtimeMax ? (
                          <>
                            <span>{playtimeMin}</span>
                            <span>-</span>
                            <span>{playtimeMax}</span>
                          </>
                        ) : playtimeMin || playtimeMax ? (
                          <>
                            <span>{playtimeMin ?? playtimeMax}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Year:</span>
                      <span className="text-muted-foreground">
                        {yearPublished}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 py-10">
      <DataTable columns={columns} data={games} renderMobile={renderMobile} />
    </div>
  );
}
