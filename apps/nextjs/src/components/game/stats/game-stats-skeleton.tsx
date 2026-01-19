import { Card, CardContent } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

export function GameStatsSkeleton() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {/* Game header card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="xs:flex-row flex w-full flex-col gap-2 md:gap-6">
              {/* Game image - hidden on mobile */}
              <div className="xs:block hidden h-24 w-24 md:h-32 md:w-32">
                <Skeleton className="aspect-square w-full rounded-lg" />
              </div>
              <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Skeleton className="h-8 w-48 md:h-9 md:w-64" />
                  </div>
                  <Skeleton className="h-4 w-32 md:h-5 md:w-40" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center md:items-start"
                >
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Player stats table skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent matches skeleton */}
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-6 w-40" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoresheet" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Advanced stats cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-4 h-5 w-32" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Head to head section skeleton */}
          <Card>
            <CardContent className="p-6">
              <Skeleton className="mb-4 h-6 w-40" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
