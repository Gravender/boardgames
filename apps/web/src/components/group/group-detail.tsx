"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, Pencil, Trophy, Users } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { ItemGroup } from "@board-games/ui/item";
import { Separator } from "@board-games/ui/separator";
import { Skeleton } from "@board-games/ui/skeleton";

import { PlayerImage } from "~/components/player-image";
import { useGroupQuery } from "~/hooks/queries/group/groups";

import { EditGroupDialog } from "./edit-group-dialog";
import { GroupDropdown } from "./group-dropdown";
import { GroupRecentMatchRow } from "./group-recent-match-row";

const RECENT_MATCHES_VISIBLE = 8;

const GroupDetailSkeleton = () => (
  <div className="relative mx-auto min-h-[75vh] w-full max-w-3xl px-4 pb-16 pt-6">
    <Skeleton className="mb-6 h-5 w-32" />
    <div className="border-border/60 mb-8 rounded-2xl border p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <Skeleton className="size-14 shrink-0 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-48 sm:h-9 sm:w-64" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="size-9" />
        </div>
      </div>
    </div>
    <Skeleton className="mb-4 h-6 w-24" />
    <Skeleton className="mb-4 h-px w-full" />
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export const GroupDetail = ({ groupId }: { groupId: number }) => {
  const router = useRouter();
  const { data: group, isPending, isError } = useGroupQuery(groupId);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (isError) {
      router.replace("/dashboard/groups");
    }
  }, [isError, router]);

  if (isPending) {
    return <GroupDetailSkeleton />;
  }

  if (!group) {
    return null;
  }

  const matchCount = group.matches.length;
  const recentMatches = group.matches.slice(0, RECENT_MATCHES_VISIBLE);
  const remainingMatches = Math.max(0, matchCount - recentMatches.length);

  return (
    <div className="relative mx-auto min-h-[75vh] w-full max-w-3xl px-4 pb-16 pt-6">
      <nav className="mb-6" aria-label="Breadcrumb">
        <Link
          href="/dashboard/groups"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All groups
        </Link>
      </nav>

      <header className="border-border/60 from-muted/30 bg-linear-to-br to-background mb-8 rounded-2xl border p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="bg-primary/12 text-primary ring-border/50 flex size-14 shrink-0 items-center justify-center rounded-2xl ring-1">
              <LayoutGrid className="size-7" strokeWidth={2} />
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {group.name}
              </h1>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="size-4 shrink-0" aria-hidden />
                  {matchCount} match{matchCount === 1 ? "" : "es"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 shrink-0" aria-hidden />
                  {group.players.length} member
                  {group.players.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit group
            </Button>
            <GroupDropdown
              variant="minimal"
              group={{
                id: group.id,
                name: group.name,
                players: group.players,
                matches: matchCount,
              }}
              editOpen={isEditOpen}
              onEditOpenChange={setIsEditOpen}
              onDeleted={() => {
                router.push("/dashboard/groups");
              }}
            />
          </div>
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="members-heading">
        <div className="flex items-end justify-between gap-4">
          <h2
            id="members-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Members
          </h2>
        </div>
        <Separator className="bg-border/80" />
        {group.players.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No players in this group yet. Use{" "}
            <strong className="text-foreground font-medium">Edit group</strong>{" "}
            to add people.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Players in group">
            {group.players.map((p) => (
              <li key={p.id}>
                <Link
                  prefetch={true}
                  href={`/dashboard/players/${p.id}/stats`}
                  className="border-border/60 from-card hover:border-primary/20 bg-linear-to-br group/row flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors"
                >
                  <PlayerImage
                    className="size-11 shrink-0"
                    image={p.image}
                    alt={p.name}
                  />
                  <span className="min-w-0 flex-1 font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-xs opacity-0 transition-opacity group-hover/row:opacity-100">
                    View stats →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {matchCount > 0 ? (
        <section
          className="mt-10 space-y-3"
          aria-labelledby="recent-matches-heading"
        >
          <div className="flex items-end justify-between gap-4">
            <h2
              id="recent-matches-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Recent matches
            </h2>
            {remainingMatches > 0 ? (
              <span className="text-muted-foreground text-xs">
                Showing {recentMatches.length} of {matchCount}
              </span>
            ) : null}
          </div>
          <Separator className="bg-border/80" />
          <ItemGroup
            className="gap-1.5"
            aria-label="Recent matches with group members"
          >
            {recentMatches.map((match) => (
              <GroupRecentMatchRow
                key={
                  match.type === "original"
                    ? `o-${match.id}`
                    : `s-${match.sharedMatchId}`
                }
                match={match}
              />
            ))}
          </ItemGroup>
        </section>
      ) : null}

      <EditGroupDialog
        group={{
          id: group.id,
          name: group.name,
          players: group.players,
        }}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </div>
  );
};
