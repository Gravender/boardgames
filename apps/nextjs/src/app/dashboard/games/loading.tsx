import { Skeleton } from "@board-games/ui/skeleton";

export default function Loading() {
  return (
    <div className="container px-4 py-4 md:px-6 md:py-8">
      <Skeleton className="mb-6 h-8 w-48" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="border-b p-4">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <Skeleton className="mb-2 h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <Skeleton className="h-10 w-full sm:w-[200px]" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
            </div>
          </div>

          <Skeleton className="mt-4 h-[200px] w-full" />
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[300px] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
