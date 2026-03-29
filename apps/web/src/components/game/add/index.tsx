"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@board-games/ui/dialog";

import { AddGameForm } from "./add-game-form";

export function AddGameDialog({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <DialogTrigger asChild>
        <Button aria-label="add game">
          <Plus className="mr-2 h-4 w-4" />
          Add Game
        </Button>
      </DialogTrigger>
      <DialogContent className="p-2 sm:max-w-md sm:p-6">
        <AddGameForm setIsOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
