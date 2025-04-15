import { Card, CardContent, CardHeader } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";

export function StatsPageSkeleton() {
  return (
    <div className="container px-3 py-4 md:px-6 md:py-8">
      {/* Back button and header */}
      <div className="mb-6">
        <Skeleton className="mb-2 h-9 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Game image and overview cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Skeleton className="h-[300px] md:row-span-2" />
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Match details card */}
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1">
              <Skeleton className="mb-2 h-6 w-48" />
              <div className="mb-4 flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>

              <div className="space-y-4">
                <div>
                  <Skeleton className="mb-2 h-4 w-16" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="mb-1 h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="mb-6">
        <Skeleton className="mb-4 h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
