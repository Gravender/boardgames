"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Dices, Map, User, UsersRound } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@board-games/ui/sidebar";

import { useTRPC } from "~/trpc/react";

export function GameItem() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link prefetch={true} href="/dashboard/games">
          <Dices />
          <span>{"Games"}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function GamesItem() {
  const trpc = useTRPC();
  const { data: games } = useSuspenseQuery(
    trpc.dashboard.getGames.queryOptions(),
  );
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={"Games"}>
            <Link prefetch={true} href="/dashboard/games">
              <Dices />
            </Link>

            <Link prefetch={true} href="/dashboard/games">
              <span>{"Games"}</span>
            </Link>
            {games.length > 0 && (
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {games.length > 0 && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {games.map((game) => (
                <SidebarMenuSubItem key={game.id}>
                  <SidebarMenuSubButton asChild>
                    <Link prefetch={true} href={`/dashboard/games/${game.id}`}>
                      <span>{game.name}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function PlayerItem() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link prefetch={true} href="/dashboard/players">
          <User />
          <span>{"Players"}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function PlayersItem() {
  const trpc = useTRPC();
  const { data: players } = useSuspenseQuery(
    trpc.dashboard.getPlayers.queryOptions(),
  );
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={"Players"}>
            <Link prefetch={true} href="/dashboard/players">
              <User />
            </Link>

            <Link prefetch={true} href="/dashboard/players">
              <span>{"Players"}</span>
            </Link>
            {players.length > 0 && (
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {players.length > 0 && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {players.map((player) => (
                <SidebarMenuSubItem key={player.id}>
                  <SidebarMenuSubButton asChild>
                    <Link
                      prefetch={true}
                      href={`/dashboard/players/${player.id}/stats`}
                    >
                      <span>{player.name}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function GroupItem() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link prefetch={true} href="/dashboard/groups">
          <UsersRound />
          <span>{"Groups"}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
export function GroupsItem() {
  const trpc = useTRPC();
  const { data: groups } = useSuspenseQuery(
    trpc.dashboard.getGroups.queryOptions(),
  );
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={"Groups"}>
            <Link prefetch={true} href="/dashboard/groups">
              <UsersRound />
            </Link>

            <Link prefetch={true} href="/dashboard/groups">
              <span>{"Groups"}</span>
            </Link>
            {groups.length > 0 && (
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {groups.length > 0 && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {groups.map((group) => (
                <SidebarMenuSubItem key={group.id}>
                  <SidebarMenuSubButton asChild>
                    <Link
                      prefetch={true}
                      href={`/dashboard/groups/${group.id}`}
                    >
                      <span>{group.name}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function LocationItem() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link prefetch={true} href="/dashboard/locations">
          <Map />
          <span>{"Locations"}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
export function LocationsItem() {
  const trpc = useTRPC();
  const { data: locations } = useSuspenseQuery(
    trpc.dashboard.getLocations.queryOptions(),
  );
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={"Locations"}>
            <Link prefetch={true} href="/dashboard/locations">
              <Map />
            </Link>

            <Link prefetch={true} href="/dashboard/locations">
              <span>{"Locations"}</span>
            </Link>
            {locations.length > 0 && (
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {locations.length > 0 && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {locations.map((location) => (
                <SidebarMenuSubItem key={location.id}>
                  <SidebarMenuSubButton asChild>
                    <Link
                      prefetch={true}
                      href={`/dashboard/locations/${location.id}`}
                    >
                      <span>{location.name}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
