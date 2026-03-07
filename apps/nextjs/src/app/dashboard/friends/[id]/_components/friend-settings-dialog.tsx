"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";

import { FriendSettings } from "~/components/friend/FriendSettingsForm";

export function FriendSettingsDialog({
  friendId,
  initialSettings,
}: {
  friendId: string;
  initialSettings: RouterOutputs["friend"]["getFriendSettings"]["settings"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size={"icon"}>
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[750px] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Friend Settings</DialogTitle>
          <DialogDescription>
            Manage how you share and interact with this friend
          </DialogDescription>
        </DialogHeader>

        <FriendSettings
          friendId={friendId}
          initialSettings={initialSettings}
          onFormSubmit={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
