"use client";

import { useRouter } from "next/navigation";

import { cn } from "~/lib/utils";

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
        "h-9 w-9 sm:h-12 sm:w-12 md:w-16 md:h-16 lg:w-20 lg:h-20 font-normal aria-selected:opacity-100",
        hasMatches
          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
          : "",
        "rounded-lg flex items-center justify-center text-sm sm:text-lg",
      )}
    >
      <span>{day.getDate()}</span>
      {hasMatches && (
        <span
          className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center"
          aria-label={`${matchIds.length} match${matchIds.length !== 1 ? "es" : ""}`}
        >
          {matchIds.length}
        </span>
      )}
    </div>
  );
}
