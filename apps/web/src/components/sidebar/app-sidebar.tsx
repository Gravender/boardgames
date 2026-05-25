import type * as React from "react";
import { Link } from "~/components/link";
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

import { NavMain } from "~/components/sidebar/nav-main";
import { NavSecondary } from "~/components/sidebar/nav-secondary";
import { NavUser } from "~/components/sidebar/nav-user";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navMain = [
    {
      title: "Games",
      url: "/games",
      icon: Dices,
    },
    {
      title: "Players",
      url: "/players",
      icon: User,
    },
    {
      title: "Groups",
      url: "/groups",
      icon: UsersRound,
    },
    {
      title: "Locations",
      url: "/locations",
      icon: MapPin,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: Calendar1,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              render={
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center p-2"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Dices className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      Board Games Tracker
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
