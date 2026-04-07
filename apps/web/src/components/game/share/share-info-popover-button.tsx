"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";

export const ShareInfoPopoverButton = ({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) => (
  <Popover>
    <PopoverTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label={`More about ${label}`}
        >
          <Info className="size-4" />
        </Button>
      }
    />
    <PopoverContent
      className="w-[min(28rem,calc(100vw-1rem))] max-h-[min(80vh,520px)] overflow-y-auto p-2.5 text-xs sm:max-h-[min(85vh,560px)] sm:w-[min(28rem,calc(100vw-2rem))] sm:p-4 sm:text-sm"
      align="start"
    >
      <p className="text-sm font-medium sm:text-base">{title}</p>
      <div className="mt-1.5 sm:mt-2">{children}</div>
    </PopoverContent>
  </Popover>
);
