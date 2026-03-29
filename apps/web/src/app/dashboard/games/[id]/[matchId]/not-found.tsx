import Link from "next/link";

import { Button } from "@board-games/ui/button";

export default function SharedGameNotFound() {
  return (
    <div className="container flex min-h-[400px] flex-col items-center justify-center py-8">
      <h2 className="mb-4 text-2xl font-bold">Match Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The match you're looking for doesn't exist or you don't have access to
        it.
      </p>
      <Button asChild>
        <Link href="/dashboard/games">Back to Games</Link>
      </Button>
    </div>
  );
}
