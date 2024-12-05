"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createColumnHelper, type Table } from "@tanstack/react-table";
import { format } from "date-fns";
import { Dices } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { RouterInputs, RouterOutputs } from "~/trpc/react";

import { DataTable } from "./dataTable";
import { EditGameDialog } from "./editGameDialog";
import { GamesDropDown } from "./gamesDropDown";

export function Games({ games }: { games: RouterOutputs["game"]["getGames"] }) {
  const [isOpen, setOpen] = useState(false);
  const [editGame, setEditGame] = useState<
    (RouterInputs["game"]["updateGame"] & { image: string | null }) | null
  >(null);
  const columnHelper =
    createColumnHelper<RouterOutputs["game"]["getGames"][number]>();
  const columns = [
    columnHelper.accessor("image", {
      header: "Image",
      cell: ({ row }) => (
        <Link href={`/dashboard/games/${row.original.id}`}>
          <div className="relative flex shrink-0 overflow-hidden h-24 w-24">
            {row.getValue("image") ? (
              <Image
                fill
                src={row.getValue("image")}
                alt={`${row.original.name} game image`}
                className="rounded-md aspect-square h-full w-full"
              />
            ) : (
              <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
            )}
          </div>
        </Link>
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
        const lastPlayed = props.row.original?.lastPlayed
          ? format(props.row.original?.lastPlayed, "d MMM yyyy")
          : null;
        return (
          <Link href={`/dashboard/games/${props.row.original.id}`}>
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
          </Link>
        );
      },
    }),
    columnHelper.accessor("games", {
      header: "Played",
      cell: (row) => (
        <Link href={`/dashboard/games/${row.row.original.id}`}>
          <Button size={"icon"} variant={"outline"}>
            {row.getValue()}
          </Button>
        </Link>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => {
        const payment = row.original;

        return (
          <GamesDropDown
            data={row.original}
            setEditGame={setEditGame}
            setOpen={setOpen}
          />
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
            <Card
              key={`mobile-${row.id}`}
              className="flex w-full items-center gap-3 border-none"
            >
              <div className="relative flex shrink-0 overflow-hidden h-12 w-12">
                {row.getValue("image") ? (
                  <Image
                    fill
                    src={row.getValue("image")}
                    alt={`${row.original.name} game image`}
                    className="rounded-md aspect-square h-full w-full"
                  />
                ) : (
                  <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                )}
              </div>
              <div className="flex flex-grow flex-col items-start">
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col items-start">
                    <h2 className="text-md text-left font-semibold">
                      {row.original.name}
                    </h2>
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Last Played:</span>
                      <span className="text-muted-foreground">
                        {lastPlayed}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size={"icon"}
                      variant={"outline"}
                      className="h-8 w-8 p-0"
                    >
                      {row.original.games}
                    </Button>
                    <GamesDropDown
                      data={row.original}
                      setEditGame={setEditGame}
                      setOpen={setOpen}
                    />
                  </div>
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
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 py-10">
      <DataTable columns={columns} data={games} renderMobile={renderMobile} />
      {editGame && (
        <EditGameDialog game={editGame} setOpen={setOpen} isOpen={isOpen} />
      )}
    </div>
  );
}
