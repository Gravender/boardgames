"use client";

import * as React from "react";
import { SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Calendar1,
  Command,
  Dices,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
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

// This is sample data.
const data = {
  navMain: [
    {
      title: "Games",
      url: "/dashboard/games",
      icon: Dices,
      isActive: true,
      items: [
        {
          title: "Through the Ages",
          url: "#",
        },
      ],
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
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isLoaded, isSignedIn, user } = useUser();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
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
