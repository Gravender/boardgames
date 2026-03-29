import { Card, CardContent } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";

export function ScoreSheetsStatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Scoresheet selector skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-10 w-full sm:w-96" />
        </CardContent>
      </Card>

      {/* Scoresheet overview cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j}>
                    <Skeleton className="mb-1 h-3 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
