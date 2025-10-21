"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { cn } from "@board-games/ui/utils";

interface CalendarDayProps {
  day: Date;
  matches: { matches: number; date: Date } | undefined;
}

export function CalendarDay({ day, matches }: CalendarDayProps) {
  const hasMatches = matches && matches.matches > 0;
  const router = useRouter();

  if (hasMatches) {
    return (
      <td
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/dashboard/calendar/${format(day, "MM-dd-yyyy-XXXX")}`);
        }}
        className="relative mx-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-secondary text-sm font-normal text-secondary-foreground hover:bg-secondary/80 aria-selected:opacity-100 sm:h-12 sm:w-12 sm:text-lg md:h-16 md:w-16 lg:h-20 lg:w-20"
      >
        <span>{day.getDate()}</span>
        <span
          className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
          aria-label={`${matches.matches} match${matches.matches !== 1 ? "es" : ""}`}
        >
          {matches.matches}
        </span>
      </td>
    );
  }
  return (
    <td
      className={cn(
        "mx-1 h-9 w-9 font-normal aria-selected:opacity-100 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20",
        "flex items-center justify-center rounded-lg text-sm sm:text-lg",
      )}
    >
      <span>{day.getDate()}</span>
    </td>
  );
}
