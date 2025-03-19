import * as React from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@board-games/ui/sidebar";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";

// This is sample data.

// eslint-disable-next-line @typescript-eslint/require-await
export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <NavMain />
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
