import { cn } from "@board-games/ui/utils";

function ShimmerBlock({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export function PlayerInsightsHeroSkeleton() {
  return (
    <div
      className={cn(
        "border-border/70 bg-card/75 overflow-hidden rounded-xl border shadow-md backdrop-blur-md",
        "ring-foreground/5 ring-1",
      )}
      aria-busy
      aria-label="Loading player stats header"
    >
      <div className="px-4 pt-4 pb-3 md:px-5 md:pt-4 md:pb-3">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex flex-col items-center gap-3 min-w-0 md:flex-row md:items-center md:gap-4">
            <ShimmerBlock className="size-20 shrink-0 rounded-full md:size-24" />
            <div className="min-w-0 flex-1 space-y-2 text-center md:text-left">
              <ShimmerBlock className="mx-auto h-8 w-48 max-w-full md:mx-0" />
              <ShimmerBlock className="mx-auto h-4 w-36 md:mx-0" />
            </div>
          </div>
          <ShimmerBlock className="size-9 shrink-0 rounded-md md:ml-auto" />
        </div>
      </div>
      <div className="border-border/50 border-t px-4 py-3 md:px-5 md:py-3.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
          {["a", "b", "c", "d", "e"].map((k) => (
            <ShimmerBlock key={k} className="h-[4.5rem] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TabsChromeSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="md:hidden">
        <ShimmerBlock className="mb-1.5 h-4 w-16" />
        <ShimmerBlock className="h-10 w-full rounded-md" />
      </div>
      <div className="bg-muted hidden h-auto w-full gap-1 p-1 md:grid md:grid-cols-2 md:rounded-lg lg:grid-cols-4">
        {["t1", "t2", "t3", "t4"].map((k) => (
          <ShimmerBlock key={k} className="h-11 rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** Performance card: title, 4 stats, two mode rows, recent form strip */
export function PlayerInsightsOverviewTabSkeleton() {
  return (
    <div
      className="border-border/80 bg-card/70 space-y-8 overflow-hidden rounded-xl border p-6 shadow-sm backdrop-blur-md"
      aria-busy
      aria-label="Loading performance summary"
    >
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-40 max-w-[80%]" />
        <ShimmerBlock className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["m1", "m2", "m3", "m4"].map((k) => (
          <ShimmerBlock key={k} className="h-[5.25rem] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ShimmerBlock className="h-28 rounded-xl" />
        <ShimmerBlock className="h-28 rounded-xl" />
      </div>
      <div>
        <ShimmerBlock className="mb-2 h-4 w-28" />
        <div className="flex flex-wrap gap-1.5">
          {["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"].map((k) => (
            <ShimmerBlock key={k} className="size-8 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlayerInsightsGamesTabSkeleton() {
  return (
    <div
      className="space-y-10"
      aria-busy
      aria-label="Loading games and activity"
    >
      <div className="border-border/80 bg-card/70 space-y-4 overflow-hidden rounded-xl border p-6 shadow-sm backdrop-blur-md">
        <ShimmerBlock className="h-8 w-48" />
        <ShimmerBlock className="h-56 w-full rounded-xl" />
      </div>
      <div className="border-border/80 bg-card/70 space-y-4 overflow-hidden rounded-xl border p-6 shadow-sm backdrop-blur-md">
        <ShimmerBlock className="h-8 w-40" />
        <ShimmerBlock className="h-64 w-full rounded-xl" />
      </div>
      <div className="border-border/80 bg-card/70 space-y-4 overflow-hidden rounded-xl border p-6 shadow-sm backdrop-blur-md">
        <ShimmerBlock className="h-8 w-44" />
        <ShimmerBlock className="h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function PlayerInsightsPeopleTabSkeleton() {
  return (
    <div className="space-y-10" aria-busy aria-label="Loading people insights">
      {["p1", "p2", "p3"].map((k) => (
        <div
          key={k}
          className="border-border/80 bg-card/70 space-y-4 overflow-hidden rounded-xl border p-6 shadow-sm backdrop-blur-md"
        >
          <ShimmerBlock className="h-8 w-52" />
          <ShimmerBlock className="h-48 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function PlayerInsightsAdvancedTabSkeleton() {
  return (
    <div className="space-y-10" aria-busy aria-label="Loading advanced stats">
      {["a1", "a2", "a3"].map((k) => (
        <div
          key={k}
          className="border-border/80 bg-card/70 space-y-4 overflow-hidden rounded-xl border p-6 shadow-sm backdrop-blur-md"
        >
          <ShimmerBlock className="h-8 w-44" />
          <ShimmerBlock className="h-40 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Full body loading: tab chrome + overview card (e.g. streaming / transitional states) */
export function PlayerInsightsBodySkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-6"
      aria-busy
      aria-label="Loading player stats"
    >
      <TabsChromeSkeleton />
      <PlayerInsightsOverviewTabSkeleton />
    </div>
  );
}
