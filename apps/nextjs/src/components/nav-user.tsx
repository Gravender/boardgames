"use client";

import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { ChevronsUpDown, LogOut, UserRoundPen } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@board-games/ui/sidebar";

export function NavUser() {
  const { user } = useUser();
  const { isMobile } = useSidebar();
  if (!user) return null;

  const initials = `${user.firstName ?? ""}${user.lastName?.[0] ?? ""}`;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  className="object-cover"
                  src={user.imageUrl}
                  alt={user.fullName ?? ""}
                />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user.fullName ?? ""}
                </span>
                <span className="truncate text-xs">
                  {user.emailAddresses[0]?.emailAddress ?? ""}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    className="object-cover"
                    src={user.imageUrl}
                    alt={user.fullName ?? ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user.fullName ?? ""}
                  </span>
                  <span className="truncate text-xs">
                    {user.emailAddresses[0]?.emailAddress ?? ""}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link
                  prefetch={true}
                  href="/dashboard/settings/profile"
                  className="flex items-center gap-2"
                >
                  <UserRoundPen className="h-5 w-5" />
                  Profile
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <SignOutButton>
                <button className="flex w-full items-center gap-2">
                  <LogOut />
                  Log out
                </button>
              </SignOutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
