"use server";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  BarChart2,
  Clock,
  Dices,
  Globe,
  Share2,
  Trophy,
  Users,
} from "lucide-react";

import { Button } from "@board-games/ui/button";

import { FeatureInfoModal } from "~/components/feature-info-modal";
import { ModeToggle } from "~/components/theme-toggle";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Dices className="flex h-8 w-8 items-center justify-center rounded-md bg-primary p-1 text-primary-foreground" />
            <span className="text-xl font-bold">BoardGame Tracker</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium hover:text-primary"
            >
              Features
            </Link>
            <Link
              href="#dashboard"
              className="text-sm font-medium hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="#collection"
              className="text-sm font-medium hover:text-primary"
            >
              Collection
            </Link>
            <Link
              href="#matches"
              className="text-sm font-medium hover:text-primary"
            >
              Matches
            </Link>
            <Link
              href="#stats"
              className="text-sm font-medium hover:text-primary"
            >
              Stats
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Link href="/sign-in">
              <Button variant="outline" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full bg-gradient-to-b from-background to-muted py-12 md:py-24 lg:py-32">
          <div className="container flex flex-col items-center gap-6 px-4 md:flex-row md:px-6">
            <div className="flex flex-col gap-4 md:w-1/2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Track Your Board Game Adventures
              </h1>
              <p className="text-muted-foreground md:text-xl">
                A full-featured platform for tracking games, players, matches,
                and statistics. Never lose track of who won game night again.
              </p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <Link href="/sign-in">
                  <Button size="lg" className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border shadow-lg md:w-1/2">
              <Image
                src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSeEP4QKDfGgC2lmMUbKTNOYxsphucD7yAaQd9"
                alt="Board Game Tracker Dashboard Light Mode"
                width={800}
                height={600}
                className="h-auto w-full dark:hidden"
              />
              <Image
                src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUStDYM8ShjO1pWQI7qFgMbLeD5zyEu6VAsohZX"
                alt="Board Game Tracker Dashboard Dark Mode"
                width={800}
                height={600}
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Everything You Need to Track Your Games
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our comprehensive platform offers all the tools you need to
                  track your board game collection and matches.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <BarChart2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Game & Match Stats</h3>
                <p className="text-center text-muted-foreground">
                  Track win/loss ratios, player performance, and match trends
                  with interactive charts.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Sharing System</h3>
                <p className="text-center text-muted-foreground">
                  Share games, matches, and stats with friends with configurable
                  permissions.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Players & Teams</h3>
                <p className="text-center text-muted-foreground">
                  Manage players, track detailed statistics, and organize teams
                  for matches.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Locations & Groups</h3>
                <p className="text-center text-muted-foreground">
                  Associate matches with locations and group data for better
                  organization.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 rounded-lg border p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Scoresheets & Rounds</h3>
                <p className="text-center text-muted-foreground">
                  Flexible scoring models with support for multiple scoresheets
                  per game.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Section */}
        <section
          id="dashboard"
          className="w-full bg-muted py-12 md:py-24 lg:py-32"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Dashboard
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Your Gaming Stats at a Glance
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Get a comprehensive overview of your gaming activity with our
                  intuitive dashboard.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="rounded-lg border bg-background p-6 shadow-lg">
                <Image
                  src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSeEP4QKDfGgC2lmMUbKTNOYxsphucD7yAaQd9"
                  alt="Board Game Tracker Dashboard Light Mode"
                  width={1200}
                  height={800}
                  className="h-auto w-full rounded-md dark:hidden"
                />
                <Image
                  src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUStDYM8ShjO1pWQI7qFgMbLeD5zyEu6VAsohZX"
                  alt="Board Game Tracker Dashboard Dark Mode"
                  width={1200}
                  height={800}
                  className="hidden h-auto w-full rounded-md dark:block"
                />
                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Games Played</h3>
                    <p className="text-muted-foreground">
                      Track which games you've played the most and see your
                      gaming trends over time.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Match Placements</h3>
                    <p className="text-muted-foreground">
                      See your distribution of placements in matches, from first
                      place to last.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Play Frequency</h3>
                    <p className="text-muted-foreground">
                      Discover which days of the week you play most often and
                      track your gaming habits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Game Collection Section */}
        <section id="collection" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Game Collection
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Manage Your Board Game Library
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Keep track of all your games, including shared games from
                  friends, with detailed information.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">
                      Comprehensive Game Tracking
                    </h3>
                    <p className="text-muted-foreground">
                      Track all your board games with details like player count,
                      play time, and play history.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Sharing System</h3>
                    <p className="text-muted-foreground">
                      Easily identify shared games with the "Shared" badge and
                      manage access permissions.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Powerful Filtering</h3>
                    <p className="text-muted-foreground">
                      Find games quickly with search and filter options to sort
                      by various criteria.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <FeatureInfoModal
                      title="Game Collection Features"
                      description="Our game collection system helps you organize and manage your entire board game library."
                      features={[
                        "Track game details like player count and duration",
                        "See play history and statistics for each game",
                        "Share games with friends and gaming groups",
                      ]}
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border shadow-lg">
                  <div className="flex items-center justify-between border-b bg-background p-4">
                    <div className="text-lg font-bold">Game Collection</div>
                  </div>
                  <div className="bg-background">
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSgOKMQzBEfL8OhryT26wlpj5McQauz1DRVnok"
                      alt="Game Collection Light Mode"
                      width={600}
                      height={800}
                      className="h-auto w-full dark:hidden"
                    />
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUS65W4hzAwnONTZjAy7b1MV82dpE5FsBgkwvRC"
                      alt="Game Collection Dark Mode"
                      width={600}
                      height={800}
                      className="hidden h-auto w-full dark:block"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Match Scoresheet Section */}
        <section
          id="matches"
          className="w-full bg-muted py-12 md:py-24 lg:py-32"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Match Tracking
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Track Every Round and Score
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Record detailed match information with our flexible scoresheet
                  system.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div className="overflow-hidden rounded-lg border shadow-lg">
                  <div className="border-b bg-background p-4">
                    <h3 className="text-lg font-bold">
                      Match Scoresheet Example
                    </h3>
                  </div>
                  <div className="bg-background">
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUStJZ3Q96hjO1pWQI7qFgMbLeD5zyEu6VAsohZ"
                      alt="Match Scoresheet Light Mode"
                      width={600}
                      height={600}
                      className="h-auto w-full dark:hidden"
                    />
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSjBHVBsbWNm6evrTjDMU1LYQgpz7butwxofS0"
                      alt="Match Scoresheet Dark Mode"
                      width={600}
                      height={600}
                      className="hidden h-auto w-full dark:block"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">
                      Round-by-Round Scoring
                    </h3>
                    <p className="text-muted-foreground">
                      Track scores for each round with color-coded rows for
                      better visibility.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Multiple Players</h3>
                    <p className="text-muted-foreground">
                      Support for any number of players with automatic totaling
                      and winner calculation.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Timer and Comments</h3>
                    <p className="text-muted-foreground">
                      Track game duration and add comments for each match to
                      remember special moments.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <FeatureInfoModal
                      title="Match Tracking Features"
                      description="Our match tracking system makes it easy to record and analyze your game sessions."
                      features={[
                        "Create custom scoresheets for any game type",
                        "Support for various scoring models (points, cooperative, etc.)",
                        "Color-coded rounds for better visibility",
                        "Built-in timer to track game duration",
                        "Add comments and notes to each match",
                        "Track location, date, and participants",
                        "Automatic winner calculation and statistics updates",
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Game Stats Section */}
        <section id="stats" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Game Statistics
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Detailed Game Performance Analytics
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Dive deep into your game statistics with comprehensive
                  analytics for each game.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Player Statistics</h3>
                    <p className="text-muted-foreground">
                      Track win rates, play counts, and performance metrics for
                      each player across all games.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Match History</h3>
                    <p className="text-muted-foreground">
                      View complete match history with filters for date,
                      location, and players.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Win Rate Tracking</h3>
                    <p className="text-muted-foreground">
                      See who dominates in each game with detailed win
                      percentage statistics.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button className="gap-2">
                      <Trophy className="h-4 w-4" /> View Leaderboards
                    </Button>
                    <FeatureInfoModal
                      title="Statistics Features"
                      description="Our powerful statistics system helps you analyze your gaming performance and trends."
                      features={[
                        "Comprehensive win rate tracking for all players",
                        "Visual charts and graphs for easy data interpretation",
                        "Track performance trends over time",
                        "Compare player statistics across different games",
                        "Analyze match duration, scores, and other metrics",
                      ]}
                    ></FeatureInfoModal>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border shadow-lg">
                  <div className="border-b bg-background p-4">
                    <h3 className="text-lg font-bold">
                      Fresh Marble Salad Statistics
                    </h3>
                  </div>
                  <div className="bg-background">
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSATZsKdjlRFzof9SNuEv6mKQ3y1gP2XkITLOw"
                      alt="Game Statistics Light Mode"
                      width={600}
                      height={800}
                      className="h-auto w-full dark:hidden"
                    />
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSky2F19YoFCGymXaHenJMExAc526LUBlSbYDj"
                      alt="Game Statistics Dark Mode"
                      width={600}
                      height={800}
                      className="hidden h-auto w-full dark:block"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Game Page Section */}
        <section className="w-full bg-muted py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                  Game Details
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Complete Game Information
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Access all information about your games in one convenient
                  place.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div className="overflow-hidden rounded-lg border shadow-lg">
                  <div className="border-b bg-background p-4">
                    <h3 className="text-lg font-bold">Fresh Marble Salad</h3>
                  </div>
                  <div className="bg-background">
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSjGvLVibWNm6evrTjDMU1LYQgpz7butwxofS0"
                      alt="Game Page Light Mode"
                      width={600}
                      height={800}
                      className="h-auto w-full dark:hidden"
                    />
                    <Image
                      src="https://ji5jeyxujf.ufs.sh/f/FArKeeZnAmUSG54uIkaiYKyhzpMH4geB2rmwxZX61FO8avIQ"
                      alt="Game Page Dark Mode"
                      width={600}
                      height={800}
                      className="hidden h-auto w-full dark:block"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Match History</h3>
                    <p className="text-muted-foreground">
                      View all matches played for each game with detailed
                      information and results.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Game Information</h3>
                    <p className="text-muted-foreground">
                      Track player count, play time, and other important game
                      details.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Win/Loss Indicators</h3>
                    <p className="text-muted-foreground">
                      Easily identify wins and losses with color-coded
                      indicators and trophy icons.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <FeatureInfoModal
                      title="Game Details Features"
                      description="Our game details page provides comprehensive information about each game in your collection."
                      features={[
                        "View complete match history for each game",
                        "Track play count, win rates, and other statistics",
                        "See detailed information about each match",
                        "Filter matches by date, location, or outcome",
                        "Color-coded win/loss indicators for quick reference",
                        "Add notes and comments about the game",
                        "Share game details and statistics with friends",
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full bg-primary py-12 text-primary-foreground md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Track Your Board Game Adventures?
                </h2>
              </div>
              <div className="flex flex-col gap-4 min-[400px]:flex-row sm:flex-row">
                <Link href="/sign-in">
                  <Button size="lg" variant="secondary" className="gap-2">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:h-24 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <Dices className="flex h-8 w-8 items-center justify-center rounded-md bg-primary p-1 text-primary-foreground" />
            <span className="text-lg font-bold">BoardGame Tracker</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
