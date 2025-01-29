"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Dialog, DialogTrigger } from "@board-games/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";

import { api } from "~/trpc/react";
import { EditLocationDialog } from "./editLocationDialog";

export function LocationDropDown({
  data,
}: {
  data: RouterOutputs["location"]["getLocations"][number];
}) {
  const utils = api.useUtils();
  const deleteLocation = api.location.deleteLocation.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.location.getLocations.invalidate()]);
    },
  });
  const onDelete = () => {
    deleteLocation.mutate({ id: data.id });
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
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditLocationDialog location={data} setOpen={setIsOpen} />
    </Dialog>
  );
}
