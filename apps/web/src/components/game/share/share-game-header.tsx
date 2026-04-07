"use client";

import Link from "next/link";

import { Button } from "@board-games/ui/button";
import { buttonVariants } from "@board-games/ui/components/button-variants";

type ShareGameHeaderProps = {
  gameId: number;
  gameName: string;
  gameInitials: string;
  onSendRequest: () => void;
};

export const ShareGameHeader = ({
  gameId,
  gameName,
  gameInitials,
  onSendRequest,
}: ShareGameHeaderProps) => {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-lg font-semibold tracking-tight"
          aria-hidden
        >
          {gameInitials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gameName}</h1>
          <p className="text-muted-foreground text-sm">
            Share this game with others
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
        <Link
          href={`/dashboard/games/${gameId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Link>
        <Button type="button" onClick={onSendRequest}>
          Send Share Request
        </Button>
      </div>
    </header>
  );
};
