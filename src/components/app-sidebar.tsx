"use client"

import * as React from "react"
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
} from "lucide-react"

import { NavMain } from "~/components/nav-main"
import { NavProjects } from "~/components/nav-projects"
import { NavUser } from "~/components/nav-user"
import { TeamSwitcher } from "~/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar"
import { SignedOut, SignInButton, useUser } from "@clerk/nextjs"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Games",
      url: "#",
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
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isLoaded, isSignedIn, user } = useUser();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        { isLoaded && isSignedIn && <NavUser user={{name: user.fullName ?? "", email: user?.emailAddresses[0]?.emailAddress ?? "", avatar: user.imageUrl}} /> }
        <SignedOut>
          <SignInButton />
        </SignedOut>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
