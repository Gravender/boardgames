"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { ProfileConnectedAccounts } from "~/components/better-auth/provider/connected-accounts";
import { ProfileDetails } from "./profile-details";
import { ProfileSecurity } from "./profile-security";

interface ProfileTabsProps {
  user: {
    id: string;
    name: string;
    emailVerified: boolean;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null | undefined;
    username?: string | null | undefined;
    displayUsername?: string | null | undefined;
  };
  defaultTab?: string;
}

export function ProfileTabs({
  user,
  defaultTab = "details",
}: ProfileTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (value: string) => {
    router.push(`${pathname}?tab=${value}`, { scroll: false });
  };
  return (
    <Tabs
      defaultValue={defaultTab}
      className="w-full"
      onValueChange={handleTabChange}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Personal Info</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="connected">Connected Accounts</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="mt-6">
        <ProfileDetails user={user} />
      </TabsContent>
      <TabsContent value="security" className="mt-6">
        <ProfileSecurity />
      </TabsContent>
      <TabsContent value="connected" className="mt-6">
        <ProfileConnectedAccounts />
      </TabsContent>
    </Tabs>
  );
}
