import Link from "next/link";
import { Gamepad2, Home, Search } from "lucide-react";

import { Button } from "@board-games/ui/button";

export function MatchNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <div className="text-8xl font-bold md:text-9xl">404</div>

        {/* Game Controller Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <Gamepad2 className="h-24 w-24 text-primary" />
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Match Not Found
          </h1>
          <p className="mx-auto max-w-md text-xl leading-relaxed text-slate-300">
            Looks like this Match doesn't exist in our database.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-5 w-5" />
              Return Home
            </Link>
          </Button>

          <Button variant="outline" size="lg" asChild>
            <Link href="/dashboard/games">
              <Search className="mr-2 h-5 w-5" />
              Browse Games
            </Link>
          </Button>
        </div>

        {/* Additional Help Text */}
        <div className="border-t border-slate-700 pt-8">
          <p className="text-sm text-slate-500">
            Error Code: Match_404 | If you believe this is a mistake, please
            contact support
          </p>
        </div>
      </div>
    </div>
  );
}
