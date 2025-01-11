"use client";

import { useRouter } from "next/navigation";

import { cn } from "@board-games/ui/lib/utils";

interface CalendarDayProps {
  day: Date;
  matchIds: number[];
}

export function CalendarDay({ day, matchIds }: CalendarDayProps) {
  const router = useRouter();
  const hasMatches = matchIds.length > 0;

  const handleClick = () => {
    if (hasMatches) {
      router.push(`/dashboard/calendar/${day.toISOString().split("T")[0]}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "h-9 w-9 font-normal aria-selected:opacity-100 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20",
        hasMatches
          ? "cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80"
          : "",
        "flex items-center justify-center rounded-lg text-sm sm:text-lg",
      )}
    >
      <span>{day.getDate()}</span>
      {hasMatches && (
        <span
          className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
          aria-label={`${matchIds.length} match${matchIds.length !== 1 ? "es" : ""}`}
        >
          {matchIds.length}
        </span>
      )}
    </div>
  );
}
