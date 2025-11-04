"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@board-games/ui/alert-dialog";
import { Button, buttonVariants } from "@board-games/ui/button";
import { Dialog } from "@board-games/ui/dialog";
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
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [isDeleteLocationOpen, setIsDeleteLocationOpen] = useState(false);
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
    deleteLocation.mutate(
      data.type === "shared"
        ? { id: data.sharedId, type: "shared" }
        : { id: data.id, type: "original" },
    );
  };
  const onEditDefault = () => {
    if (data.type === "shared") {
      editDefaultLocation.mutate({
        id: data.sharedId,
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

  return (
    <>
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
            <DropdownMenuItem onClick={() => setIsEditLocationOpen(true)}>
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
            onClick={() => setIsDeleteLocationOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isEditLocationOpen} onOpenChange={setIsEditLocationOpen}>
        <EditLocationDialog location={data} setOpen={setIsEditLocationOpen} />
      </Dialog>
      <AlertDialog
        open={isDeleteLocationOpen}
        onOpenChange={setIsDeleteLocationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Are you absolutely sure you want to delete ${data.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => onDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
