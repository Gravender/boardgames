import { Suspense } from "react";
import Link from "next/link";
import { Calendar1 } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@board-games/ui/sidebar";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import {
  GameItem,
  GamesItem,
  GroupItem,
  GroupsItem,
  LocationItem,
  LocationsItem,
  PlayerItem,
  PlayersItem,
} from "./sidebar-items";

// eslint-disable-next-line @typescript-eslint/require-await
export async function NavMain() {
  prefetch(trpc.dashboard.getGames.queryOptions());
  prefetch(trpc.dashboard.getPlayers.queryOptions());
  prefetch(trpc.dashboard.getGroups.queryOptions());
  prefetch(trpc.dashboard.getLocations.queryOptions());
  return (
    <HydrateClient>
      <SidebarGroup>
        <SidebarGroupLabel>BoardGame Scores</SidebarGroupLabel>
        <SidebarMenu>
          <Suspense fallback={<GameItem />}>
            <GamesItem />
          </Suspense>
          <Suspense fallback={<PlayerItem />}>
            <PlayersItem />
          </Suspense>
          <Suspense fallback={<GroupItem />}>
            <GroupsItem />
          </Suspense>
          <Suspense fallback={<LocationItem />}>
            <LocationsItem />
          </Suspense>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={true} href="/dashboard/calendar">
                <Calendar1 />
                <span>{"Calendar"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </HydrateClient>
  );
}
