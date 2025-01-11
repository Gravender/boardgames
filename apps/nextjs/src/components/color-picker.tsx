"use client";

import { Paintbrush } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Input } from "@board-games/ui/input";
import { cn } from "@board-games/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";

export function GradientPicker({
  color,
  setColor: setColor,
  className,
}: {
  color: string | null;
  setColor: (color: string) => void;
  className?: string;
}) {
  const solids = [
    "#64748b",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "justify-start p-0 text-left font-normal",
            !color && "text-muted-foreground",
            className,
          )}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded"
            style={{ background: color ?? "none" }}
          >
            {!color && <Paintbrush className="h-8 w-8" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="mt-0 flex w-full flex-wrap gap-1">
          {solids.map((s) => (
            <div
              key={s}
              style={{ background: s }}
              className="h-6 w-6 cursor-pointer rounded-md active:scale-105"
              onClick={() => setColor(s)}
            />
          ))}
        </div>

        <Input
          id="custom"
          value={color ?? ""}
          placeholder="Custom color"
          className="col-span-2 mt-4 h-8"
          onChange={(e) => setColor(e.currentTarget.value)}
        />
      </PopoverContent>
    </Popover>
  );
}
