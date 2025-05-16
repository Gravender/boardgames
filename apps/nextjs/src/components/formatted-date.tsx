import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@board-games/ui/utils";

export function FormattedDate({
  date,
  pattern = "PP",
  Icon,
  className,
  iconClassName,
}: {
  date: Date;
  pattern?: string;
  Icon?: LucideIcon;
  className?: string;
  iconClassName?: string;
}) {
  if (Icon !== undefined) {
    return (
      <span
        suppressHydrationWarning
        className={cn("flex items-center gap-2", className)}
      >
        <Icon className={cn("h-4 w-4", iconClassName)} />
        {format(date, pattern)}
        {}
      </span>
    );
  }
  return (
    <span suppressHydrationWarning className={cn(className)}>
      {format(date, pattern)}
    </span>
  );
}
