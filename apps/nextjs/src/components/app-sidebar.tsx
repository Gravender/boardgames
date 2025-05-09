import * as React from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Calendar1, Dices, MapPin, User, UsersRound } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@board-games/ui/sidebar";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import { NavSecondary } from "./nav-secondary";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navMain = [
    {
      title: "Games",
      url: "/dashboard/games",
      icon: Dices,
    },
    {
      title: "Players",
      url: "/dashboard/players",
      icon: User,
    },
    {
      title: "Groups",
      url: "/dashboard/groups",
      icon: UsersRound,
    },
    {
      title: "Locations",
      url: "/dashboard/locations",
      icon: MapPin,
    },
    {
      title: "Calendar",
      url: "/dashboard/calendar",
      icon: Calendar1,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link prefetch={true} href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Dices className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Board Games Tracker
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <SignedIn>
          <NavUser />
        </SignedIn>
        <SignedOut>
          <SignInButton />
        </SignedOut>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
