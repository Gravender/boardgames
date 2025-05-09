import Link from "next/link";
import { Dices, GamepadIcon, PlusCircle, Users } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

export function EmptyDashboard() {
  return (
    <div className="container mx-auto p-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="mb-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Dices className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to Board Game Tracker!</h2>
          <p className="max-w-md text-muted-foreground">
            Your dashboard is empty. Get started by adding your first game,
            creating players, or recording a match.
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold">Get Started</h2>

      <section
        aria-labelledby="get-started-heading"
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <GamepadIcon className="h-5 w-5 text-primary" />
              Add Your First Game
            </CardTitle>
            <CardDescription>
              Start building your board game collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add details like player count, play time, and more to keep track
              of your games.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              prefetch={true}
              href="/dashboard/games?add=true"
              className="w-full"
            >
              <Button className="w-full gap-2">
                <PlusCircle className="h-4 w-4" /> Add Game
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Create Players
            </CardTitle>
            <CardDescription>Add the people you play with</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track player statistics, win rates, and performance across
              different games.
            </p>
          </CardContent>
          <CardFooter>
            <Link
              prefetch={true}
              href="/dashboard/players?add=true"
              className="w-full"
            >
              <Button className="w-full gap-2">
                <PlusCircle className="h-4 w-4" /> Add Players
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
