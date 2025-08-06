import { Skeleton } from "@board-games/ui/skeleton";
import { cn } from "@board-games/ui/utils";

export function InputFieldSkeleton({ classNames }: { classNames?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className={cn("h-4 w-32", classNames)} />
      <Skeleton className={cn("h-9 w-full", classNames)} />
    </div>
  );
}
