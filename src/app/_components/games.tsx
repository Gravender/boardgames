"use client";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Dices, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import { api } from "~/trpc/server";
import { RouterOutput } from "../api/trpc/[trpc]/client";
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
import { DataTable } from "./dataTable";

export function Games({ games }: { games: RouterOutput["game"]["getGames"] }) {
  console.log(games);
  const columnHelper =
    createColumnHelper<RouterOutput["game"]["getGames"][0]>();
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
        return (
          <div className="flex flex-col p-2">
            <h2 className="text-xl font-bold">{props.row.original?.name}</h2>
            <div className="flex max-w-96 items-center justify-between">
              <div className="flex items-center p-2 pl-0">
                <h4 className="font-medium">Players:</h4>
                <div className="flex w-8 justify-between font-light">
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
              <div className="flex items-center p-2">
                <h4 className="font-medium">Playtime:</h4>
                <div className="flex w-8 justify-between font-light">
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
              <div className="flex items-center p-2">
                <h4 className="font-medium">Year Published:</h4>
                <span className="font-light">{yearPublished}</span>
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
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View customer</DropdownMenuItem>
              <DropdownMenuItem>View payment details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ];

  return (
    <div className="container mx-auto p-4 py-10">
      <DataTable columns={columns} data={games} />
    </div>
  );
}
