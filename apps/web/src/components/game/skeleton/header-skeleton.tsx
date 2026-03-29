import { Card, CardContent } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";

export function GameHeaderSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Game image skeleton */}
          <div className="bg-muted relative h-36 w-full shrink-0 overflow-hidden rounded-lg sm:aspect-square sm:h-auto sm:w-36">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>

          {/* Game details skeleton */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="mt-1 h-4 w-32" />
              </div>

              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>

            {/* Shared info box skeleton */}
            <Skeleton className="h-16 w-full rounded-md" />

            {/* Metadata skeleton */}
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
