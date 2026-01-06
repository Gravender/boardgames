import { Skeleton } from "@board-games/ui/skeleton";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { ItemGroup } from "@board-games/ui/item";

export function GameMatchesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search and filter controls skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search input skeleton */}
        <Skeleton className="h-10 flex-1" />

        {/* Filter buttons skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 shrink-0" />
          <Skeleton className="h-10 w-16 shrink-0" />
          <Skeleton className="h-10 w-20 shrink-0" />
        </div>
      </div>

      {/* Matches list skeleton */}
      <ScrollArea className="xs:h-[60vh] h-[50vh] sm:h-[65vh]">
        <ItemGroup className="space-y-3 p-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </ItemGroup>
      </ScrollArea>
    </div>
  );
}
