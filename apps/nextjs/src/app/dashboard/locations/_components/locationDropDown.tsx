"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

import { useTRPC } from "~/trpc/react";
import { EditLocationDialog } from "./editLocationDialog";

export function LocationDropDown({
  data,
}: {
  data: RouterOutputs["location"]["getLocations"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const editDefaultLocation = useMutation(
    trpc.location.editDefaultLocation.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.location.getLocations.queryOptions(),
        );
      },
    }),
  );
  const deleteLocation = useMutation(
    trpc.location.deleteLocation.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.location.getLocations.queryOptions(),
        );
      },
    }),
  );
  const onDelete = () => {
    deleteLocation.mutate({ id: data.id, type: data.type });
  };
  const onEditDefault = () => {
    if (data.type === "shared") {
      editDefaultLocation.mutate({
        id: data.id,
        isDefault: !data.isDefault,
        type: "shared",
      });
    } else {
      editDefaultLocation.mutate({
        id: data.id,
        isDefault: !data.isDefault,
        type: "original",
      });
    }
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
          <DropdownMenuItem onClick={onEditDefault}>
            {data.isDefault ? "Unset Default" : "Set Default"}
          </DropdownMenuItem>
          {(data.type === "original" || data.permission === "edit") && (
            <DialogTrigger asChild>
              <DropdownMenuItem>Edit</DropdownMenuItem>
            </DialogTrigger>
          )}
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
