"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, Users } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { buttonVariants } from "@board-games/ui/components/button-variants";
import { Input } from "@board-games/ui/input";
import { cn } from "@board-games/ui/utils";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { useGroupsWithPlayersSuspenseQuery } from "~/hooks/queries/group/groups";

import { AddGroupDialog } from "./add-group-dialog";
import { GroupDropdown } from "./group-dropdown";
import { GroupPlayerAvatarStack } from "./group-player-avatar-stack";

export const GroupsList = () => {
  const { data } = useGroupsWithPlayersSuspenseQuery();
  const groups = data.groups;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      return groups;
    }
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  return (
    <div className="relative mx-auto min-h-[85vh] w-full max-w-3xl px-4 pb-28 pt-8">
      <header className="mb-8 space-y-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/12 text-primary ring-border/60 flex size-11 shrink-0 items-center justify-center rounded-xl ring-1">
            <Users className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>
              <Badge variant="secondary" className="font-normal">
                <Sparkles className="mr-1 size-3" aria-hidden />
                {groups.length} total
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
              Curate player sets for filters and insights. Only groups with at
              least one member appear here.
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-lg border-border/80 bg-muted/30 pl-10"
            aria-label="Search groups"
          />
        </div>
      </header>

      <ScrollArea className="h-[min(58vh,560px)] pr-1 sm:h-[min(62vh,620px)]">
        {filtered.length === 0 ? (
          <div className="border-border/60 bg-muted/15 text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
            {groups.length === 0
              ? "No groups yet. Create one with the button below."
              : "No groups match your search."}
          </div>
        ) : (
          <ItemGroup className="gap-3" aria-label="Groups">
            {filtered.map((group) => (
              <Item
                key={group.id}
                variant="outline"
                role="listitem"
                className="hover:bg-muted/50 transition-colors"
              >
                <Link
                  prefetch={true}
                  href={`/dashboard/groups/${group.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ItemMedia variant="icon" className="max-w-22 justify-start">
                    <GroupPlayerAvatarStack players={group.players} size="sm" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-sm font-semibold sm:text-base">
                      {group.name}
                    </ItemTitle>
                    <ItemDescription>
                      {group.players.length} member
                      {group.players.length === 1 ? "" : "s"}
                    </ItemDescription>
                  </ItemContent>
                </Link>
                <ItemActions>
                  <span
                    className={cn(
                      buttonVariants({
                        variant: "secondary",
                        size: "sm",
                      }),
                      "pointer-events-none h-9 min-w-10 font-mono text-xs tabular-nums",
                    )}
                    role="status"
                    aria-label={`${group.matches} matches`}
                  >
                    {group.matches}
                  </span>
                  <GroupDropdown group={group} />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </ScrollArea>

      <div className="pointer-events-none absolute right-4 bottom-6 z-10 sm:right-8">
        <div className="pointer-events-auto">
          <AddGroupDialog />
        </div>
      </div>
    </div>
  );
};
