import Link from "next/link";
import { Gamepad2, Home, Search } from "lucide-react";

import { buttonVariants } from "@board-games/ui/components/button-variants";

interface GameNotFoundProps {
  title?: string;
  description?: string;
  errorCode?: string;
}

export function GameNotFound({
  title = "Game Not Found",
  description = "Looks like this game doesn't exist in our database.",
  errorCode = "GAME_404",
}: GameNotFoundProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <div className="text-8xl font-bold md:text-9xl">404</div>

        {/* Game Controller Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Gamepad2 className="text-primary h-24 w-24" />
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white md:text-5xl">{title}</h1>
          <p className="mx-auto max-w-md text-xl leading-relaxed text-slate-300">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
          <Link href="/dashboard" className={buttonVariants()}>
            <Home className="mr-2 h-5 w-5" />
            Return Home
          </Link>

          <Link
            href="/dashboard/games"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <Search className="mr-2 h-5 w-5" />
            Browse Games
          </Link>
        </div>

        {/* Additional Help Text */}
        <div className="border-t border-slate-700 pt-8">
          <p className="text-sm text-slate-500">
            Error Code: {errorCode} | If you believe this is a mistake, please
            contact support
          </p>
        </div>
      </div>
    </div>
  );
}
