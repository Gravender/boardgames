import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Table, TableBody } from "@board-games/ui/table";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { Matches, MatchSkeleton } from "./_components/matches";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  const game = await caller.game.getGameMetaData({ id: Number(id) });
  if (!game) redirect("/dashboard/games");
  if (!game.imageUrl)
    return { title: game.name, description: `${game.name} Match Tracker` };
  return {
    title: game.name,
    description: `${game.name} Match Tracker`,
    openGraph: {
      images: [game.imageUrl],
    },
  };
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  if (isNaN(Number(id))) redirect("/dashboard/games");
  void prefetch(trpc.game.getGame.queryOptions({ id: Number(id) }));
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <Suspense
          fallback={
            <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
              <Table className="flex flex-col gap-2">
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <MatchSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        >
          <Matches gameId={Number(id)} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
