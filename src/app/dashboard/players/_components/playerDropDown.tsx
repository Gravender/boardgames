"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { AlignLeft, MoreVertical } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogTrigger } from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { type RouterOutputs } from "~/trpc/react";

import { EditPlayerDialog } from "./editPlayerDialog";
import { SortField, sortFieldConst } from "./players";

export function PlayerDropDown({
  data,
}: {
  data: RouterOutputs["player"]["getPlayers"][number];
}) {
  const onDelete = () => {
    startTransition(async () => {
      //await deletePlayer({ id: data.id });
    });
  };
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>Edit</DropdownMenuItem>
          </DialogTrigger>
          <Link href={`/dashboard/players/${data.id}/stats`}>
            <DropdownMenuItem>Stats</DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditPlayerDialog player={data} setOpen={setIsOpen} />
    </Dialog>
  );
}
export function SortingOptions({
  sortField,
  setSortField,
}: {
  sortField: SortField;
  setSortField: (field: SortField) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"icon"}>
          <span className="sr-only">Open menu</span>
          <AlignLeft />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortFieldConst.map((field) => {
          return (
            <DropdownMenuCheckboxItem
              key={field}
              onClick={() => setSortField(field)}
              checked={sortField === field}
            >
              {field}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
