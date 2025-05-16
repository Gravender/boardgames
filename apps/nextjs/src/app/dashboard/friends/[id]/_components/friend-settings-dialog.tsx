"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

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
import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";

import { FriendSettings } from "./friend-settings-form";

export function FriendSettingsDialog({
  friendId,
  initialSettings,
}: {
  friendId: number;
  initialSettings: RouterOutputs["friend"]["getFriend"]["settings"];
}) {
  const [open, setOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    // If trying to close and form is dirty and not submitted, show confirmation
    if (!newOpen && formIsDirty && !formSubmitted) {
      setShowConfirmation(true);
    } else {
      setOpen(newOpen);
    }
  };

  const handleFormChange = (isDirty: boolean) => {
    setFormIsDirty(isDirty);
  };

  const handleFormSubmit = () => {
    setFormSubmitted(true);
    // Keep dialog open until toast is shown
    setTimeout(() => setOpen(false), 10);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
            onFormChange={handleFormChange}
            onFormSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without
              saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmation(false);
                setOpen(false);
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
