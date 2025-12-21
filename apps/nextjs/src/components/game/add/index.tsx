"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Dialog, DialogContent } from "@board-games/ui/dialog";

import { AddGameForm } from "./add-game-form";

export function AddGameDialog({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <DialogContent className="p-2 sm:max-w-md sm:p-6">
        <AddGameForm setIsOpen={setIsOpen} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end p-4">
          <Button
            variant="default"
            className="rounded-full"
            size="icon"
            onClick={() => setIsOpen(true)}
            aria-label="add game"
          >
            <Plus />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
