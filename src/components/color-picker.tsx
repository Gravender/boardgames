"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Paintbrush } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

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
    "#E2E2E2",
    "#ff75c3",
    "#ffa647",
    "#ffe83f",
    "#9fff5b",
    "#70e2ff",
    "#cd93ff",
    "#09203f",
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "justify-start text-left font-normal p-0",
            !color && "text-muted-foreground",
            className,
          )}
        >
          <div
            className="w-10 h-10 flex items-center justify-center rounded"
            style={{ background: color ?? "none" }}
          >
            {!color && <Paintbrush className="h-8 w-8" />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="w-full flex flex-wrap gap-1 mt-0">
          {solids.map((s) => (
            <div
              key={s}
              style={{ background: s }}
              className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
              onClick={() => setColor(s)}
            />
          ))}
        </div>

        <Input
          id="custom"
          value={color ?? undefined}
          placeholder="Custom color"
          className="col-span-2 h-8 mt-4"
          onChange={(e) => setColor(e.currentTarget.value)}
        />
      </PopoverContent>
    </Popover>
  );
}
