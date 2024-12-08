"use client";

import * as React from "react";
import { SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import {
  Calendar1,
  Dices,
  LucideIcon,
  Map,
  Settings2,
  User,
  UsersRound,
} from "lucide-react";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "~/components/ui/sidebar";
import { type RouterOutputs } from "~/trpc/react";

// This is sample data.

export function AppSidebar({
  games,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  games: RouterOutputs["game"]["getSideBarGames"];
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
      url: "#",
      icon: User,
      items: [
        {
          title: "Player",
          url: "#",
        },
      ],
    },
    {
      title: "Groups",
      url: "#",
      icon: UsersRound,
      items: [
        {
          title: "Mascot Lads",
          url: "#",
        },
      ],
    },
    {
      title: "Locations",
      url: "#",
      icon: Map,
      items: [
        {
          title: "Mascot",
          url: "#",
        },
      ],
    },
    {
      title: "Calender",
      url: "#",
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
              email: user?.emailAddresses[0]?.emailAddress ?? "",
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
