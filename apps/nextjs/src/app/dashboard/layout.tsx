"use server";

import { cookies } from "next/headers";

import { Separator } from "@board-games/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@board-games/ui/sidebar";

import { AppSidebar } from "~/components/app-sidebar";
import { BreadCrumbs } from "~/components/breadcrumbs";
import { ModeToggle } from "~/components/theme-toggle";
import { caller } from "~/trpc/server";

async function SidebarLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";
  const games = await caller.dashboard.getGames();
  const players = await caller.dashboard.getPlayers();
  const groups = await caller.dashboard.getGroups();
  const locations = await caller.dashboard.getLocations();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        games={games}
        players={players}
        groups={groups}
        locations={locations}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <BreadCrumbs />
          </div>
          <ModeToggle />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

// eslint-disable-next-line @typescript-eslint/require-await
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
