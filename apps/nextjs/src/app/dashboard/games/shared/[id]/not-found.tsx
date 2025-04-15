import Link from "next/link";

import { Button } from "@board-games/ui/button";

export default function SharedGameNotFound() {
  return (
    <div className="container flex min-h-[400px] flex-col items-center justify-center py-8">
      <h2 className="mb-4 text-2xl font-bold">Shared Game Not Found</h2>
      <p className="mb-6 text-muted-foreground">
        The shared game you're looking for doesn't exist or you don't have
        access to it.
      </p>
      <Button asChild>
        <Link href="/games">Back to Games</Link>
      </Button>
    </div>
  );
}
