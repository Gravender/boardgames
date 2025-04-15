import Link from "next/link";

import { Button } from "@board-games/ui/button";

export default function GameNotFound() {
  return (
    <div className="container flex min-h-[400px] flex-col items-center justify-center py-8">
      <h2 className="mb-4 text-2xl font-bold">Game Not Found</h2>
      <p className="mb-6 text-muted-foreground">
        The game you're looking for doesn't exist or has been removed.
      </p>
      <Button asChild>
        <Link href="/games">Back to Games</Link>
      </Button>
    </div>
  );
}
