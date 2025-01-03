"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { AppSidebar } from "~/components/app-sidebar";
import { BreadCrumbs } from "~/components/breadcrumbs";
import { ModeToggle } from "~/components/theme-toggle";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { api, HydrateClient } from "~/trpc/server";

async function SidebarLayout({ children }: { children: React.ReactNode }) {
  const games = await api.dashboard.getGames();
  const players = await api.dashboard.getPlayers();
  const groups = await api.dashboard.getGroups();
  const locations = await api.dashboard.getLocations();

  return (
    <SidebarProvider>
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
            <HydrateClient>
              <BreadCrumbs />
            </HydrateClient>
          </div>
          <ModeToggle />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
