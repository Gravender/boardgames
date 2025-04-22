import { Skeleton } from "@board-games/ui/skeleton";

export default function MatchSummarySkeleton() {
  return (
    <div className="container space-y-8 py-8">
      {/* Match Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Player List Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {/* Team skeletons */}
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center">
                  <Skeleton className="mr-2 h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-3 pl-2">
                  {Array(2)
                    .fill(0)
                    .map((_, j) => (
                      <div key={j} className="flex items-center">
                        <Skeleton className="mr-3 h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32 flex-1" />
                        <Skeleton className="ml-2 h-4 w-16" />
                      </div>
                    ))}
                </div>
              </div>
            ))}

          {/* Solo player skeletons */}
          <Skeleton className="mb-2 mt-6 h-5 w-36" />
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
        </div>
      </div>

      {/* Previous Matches Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
        </div>
      </div>

      {/* Player Stats Table Skeleton with pinned columns and headers */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-md border">
          <div className="relative" style={{ height: "400px" }}>
            {/* Simulating the fixed header */}
            <div className="sticky top-0 z-20 flex w-full border-b bg-background p-3">
              <div className="sticky left-0 z-30 w-[200px] min-w-[200px] bg-background">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex gap-4 pl-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>

            {/* Simulating rows */}
            <div
              className="overflow-hidden"
              style={{ height: "calc(400px - 45px)" }}
            >
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className={`flex border-b p-3 ${i % 2 === 0 ? "bg-muted/50" : ""}`}
                  >
                    <div
                      className={`sticky left-0 z-10 w-[200px] min-w-[200px] ${i % 2 === 0 ? "bg-muted/50" : "bg-background"}`}
                    >
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="flex gap-4 pl-4">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
