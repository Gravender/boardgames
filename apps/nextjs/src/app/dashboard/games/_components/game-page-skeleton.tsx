import { Skeleton } from "@board-games/ui/skeleton";

export function GamePageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Game image skeleton */}
        <div className="w-full md:w-1/3 lg:w-1/4">
          <Skeleton className="aspect-square w-full rounded-lg" />
        </div>

        {/* Game details skeleton */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Match history skeleton */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Filter controls skeleton */}
        <div className="mb-4 flex flex-col gap-4 md:flex-row">
          <Skeleton className="h-10 w-full md:w-1/3" />
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-2/3">
            <Skeleton className="h-10 w-full sm:w-[180px]" />
            <Skeleton className="h-10 w-full sm:w-[180px]" />
            <Skeleton className="h-10 w-full sm:w-[180px]" />
          </div>
        </div>

        {/* Matches list skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
