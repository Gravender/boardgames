"use client";

import { useState } from "react";

import { ChevronUp } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@board-games/ui/sheet";

import { ShareSummaryPanel } from "./share-summary-panel";
import type { FriendRow } from "./types";

type ShareSummaryMobileProps = {
  /** Return `false` when validation failed so the sheet can close and show inline errors. */
  onSendRequest: () => boolean;
  friends: FriendRow[];
};

export const ShareSummaryMobile = ({
  onSendRequest,
  friends,
}: ShareSummaryMobileProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSendFromSheet = () => {
    const ok = onSendRequest();
    if (ok === false) {
      setSheetOpen(false);
    }
  };

  return (
    <div className="lg:hidden">
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2"
                aria-label="Open share summary"
              >
                <ChevronUp className="size-4" aria-hidden />
                Summary
              </Button>
            }
          />
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>Share summary</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <ShareSummaryPanel
                onSendRequest={handleSendFromSheet}
                friends={friends}
                className="border-0 shadow-none"
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="h-16" aria-hidden />
    </div>
  );
};
