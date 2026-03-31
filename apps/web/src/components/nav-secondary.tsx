"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Settings, UserRound } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@board-games/ui/sidebar";

export function NavSecondary({
  ...props
}: {} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const [openProfile, setOpenProfile] = React.useState(false);
  const [openSettings, setOpenSettings] = React.useState(false);
  return (
    <SidebarGroup {...props}>
      <SidebarMenu>
        <SidebarMenuItem>
          <Collapsible
            open={openProfile}
            onOpenChange={setOpenProfile}
            className="w-full"
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton size="sm">
                  <UserRound />
                  <span>Profile</span>
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </SidebarMenuButton>
              }
            />
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link prefetch={true} href="/dashboard/friends">
                        Friends
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link prefetch={true} href="/dashboard/share-requests">
                        Share Requests
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>

        {/* Settings Section with Subitems */}
        <SidebarMenuItem>
          <Collapsible
            open={openSettings}
            onOpenChange={setOpenSettings}
            className="w-full"
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton size="sm">
                  <Settings />
                  <span>Settings</span>
                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </SidebarMenuButton>
              }
            />
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    render={
                      <Link prefetch={true} href="/dashboard/settings/profile">
                        Profile
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
