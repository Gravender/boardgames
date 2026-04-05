import { Skeleton } from "@board-games/ui/skeleton";

export function PlayersListSkeleton() {
  return (
    <div className="w-full max-w-3xl">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 flex-1" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-2">
        {["s1", "s2", "s3", "s4", "s5"].map((key) => (
          <Skeleton key={key} className="h-[88px] w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
