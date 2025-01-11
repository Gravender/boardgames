"use client";

import * as React from "react";
import { SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import {
  Calendar1,
  Dices,
  Map,
  Settings2,
  User,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@board-games/ui/sidebar";

import type { RouterOutputs } from "~/trpc/react";
import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";

// This is sample data.

export function AppSidebar({
  games,
  players,
  groups,
  locations,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  games: RouterOutputs["dashboard"]["getGames"];
  players: RouterOutputs["dashboard"]["getPlayers"];
  groups: RouterOutputs["dashboard"]["getGroups"];
  locations: RouterOutputs["dashboard"]["getLocations"];
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const data = [
    {
      title: "Games",
      url: "/dashboard/games",
      icon: Dices,
      isActive: true,
      items: games.map((game) => {
        return {
          title: game.name,
          url: `/dashboard/games/${game.id}`,
        };
      }),
    },
    {
      title: "Players",
      url: "/dashboard/players",
      icon: User,
      items: players.map((player) => {
        return {
          title: player.name,
          url: `/dashboard/players/${player.id}/stats`,
        };
      }),
    },
    {
      title: "Groups",
      url: "/dashboard/groups",
      icon: UsersRound,
      items: groups.map((group) => {
        return {
          title: group.name,
          url: `/dashboard/groups/${group.id}/`,
        };
      }),
    },
    {
      title: "Locations",
      url: "/dashboard/locations",
      icon: Map,
      items: locations.map((location) => {
        return {
          title: location.name,
          url: `/dashboard/locations/${location.id}/`,
        };
      }),
    },
    {
      title: "Calendar",
      url: "/dashboard/calendar",
      icon: Calendar1,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "App Settings",
          url: "#",
        },
        {
          title: "App Info",
          url: "#",
        },
      ],
    },
  ];
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={data} />
      </SidebarContent>
      <SidebarFooter>
        {isLoaded && isSignedIn && (
          <NavUser
            user={{
              name: user.fullName ?? "",
              email: user.emailAddresses[0]?.emailAddress ?? "",
              avatar: user.imageUrl,
            }}
          />
        )}
        <SignedOut>
          <SignInButton />
        </SignedOut>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
