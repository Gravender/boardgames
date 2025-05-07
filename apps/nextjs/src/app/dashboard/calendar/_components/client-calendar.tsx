"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { Calendar } from "@board-games/ui/calendar";

import { CalendarDay } from "./calendar-day";

interface ClientCalendarProps {
  matchDayMap: Map<string, { matches: number[]; date: Date }>;
}

export function ClientCalendar({ matchDayMap }: ClientCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [gamesPlayed, setGamesPlayed] = useState(0);

  useEffect(() => {
    const selectedMonthNum = currentMonth.getMonth();
    const selectedYear = currentMonth.getFullYear();

    let totalGames = 0;
    matchDayMap.forEach((ids, dateString) => {
      const date = new Date(dateString);
      if (
        date.getMonth() === selectedMonthNum &&
        date.getFullYear() === selectedYear
      ) {
        totalGames += ids.matches.length;
      }
    });

    setGamesPlayed(totalGames);
  }, [matchDayMap, currentMonth]);
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-2 flex flex-col text-center text-lg font-semibold sm:mb-4 sm:text-xl">
        <span className="text-3xl">{gamesPlayed}</span>
        <span>{`Plays this Month`}</span>
      </div>

      <div className="flex h-40 w-full max-w-3xl flex-1 items-center justify-center">
        <Calendar
          mode="single"
          selected={currentMonth}
          onMonthChange={(date) => setCurrentMonth(date)}
          className="w-fit rounded-md border p-2 shadow sm:p-4"
          classNames={{
            months:
              "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell:
              "text-muted-foreground rounded-md w-9 sm:w-12 md:w-16 lg:w-20 font-normal text-[0.8rem]",
            row: "flex w-full mt-2 gap-1 sm:gap-2",
            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 flex-1",
            day: "h-9 w-9 sm:h-12 sm:w-12 md:w-16 lg:w-20 p-0 font-normal aria-selected:opacity-100",
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle:
              "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          components={{
            Day: ({ date, ...props }) => {
              return (
                <CalendarDay
                  day={date}
                  matches={matchDayMap.get(format(date, "MM-dd-yy"))}
                  {...props}
                />
              );
            },
          }}
        />
      </div>
    </div>
  );
}
