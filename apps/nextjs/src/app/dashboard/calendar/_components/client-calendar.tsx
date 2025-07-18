"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { Calendar } from "@board-games/ui/calendar";

import { CalendarDay } from "./calendar-day";

interface ClientCalendarProps {
  matchDayMap: Map<string, { matches: number[]; date: Date }>;
}

export function ClientCalendar({ matchDayMap }: ClientCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const gamesPlayed = useMemo(() => {
    let totalGames = 0;
    matchDayMap.forEach((ids, dateString) => {
      const date = new Date(dateString);
      if (
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear()
      ) {
        totalGames += ids.matches.length;
      }
    });
    return totalGames;
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
          components={{
            Day: ({ day, ...props }) => {
              return (
                <CalendarDay
                  day={day.date}
                  matches={matchDayMap.get(format(day.date, "MM-dd-yy"))}
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
