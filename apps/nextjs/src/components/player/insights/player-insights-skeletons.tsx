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
      className="border-border/80 bg-card/60 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm"
      aria-busy
      aria-label="Loading player stats header"
    >
      <div className="px-4 pt-4 pb-3 md:px-5 md:pt-4 md:pb-3">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4">
          <ShimmerBlock className="size-20 shrink-0 rounded-full md:size-24" />
          <div className="min-w-0 flex-1 space-y-2 text-center md:text-left">
            <ShimmerBlock className="mx-auto h-8 w-48 max-w-full md:mx-0" />
            <ShimmerBlock className="mx-auto h-4 w-36 md:mx-0" />
          </div>
        </div>
      </div>
      <div className="border-border/50 border-t px-4 py-3 md:px-5 md:py-3.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
          {["a", "b", "c", "d", "e"].map((k) => (
            <ShimmerBlock key={k} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlayerInsightsBodySkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading player stats">
      {["s1", "s2", "s3", "s4", "s5"].map((k) => (
        <div
          key={k}
          className="border-border/80 bg-card/60 space-y-4 rounded-2xl border p-6 shadow-sm backdrop-blur-sm"
        >
          <ShimmerBlock className="h-7 w-56" />
          <ShimmerBlock className="h-48 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <ShimmerBlock className="h-24 rounded-lg" />
            <ShimmerBlock className="h-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
