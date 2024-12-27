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
import { api } from "~/trpc/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }
  const games = await api.dashboard.getGames();
  const players = await api.dashboard.getPlayers();

  return (
    <SidebarProvider>
      <AppSidebar games={games} players={players} />
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
