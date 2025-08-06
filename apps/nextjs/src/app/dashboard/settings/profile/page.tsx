import { redirect } from "next/navigation";

import { getSession } from "@board-games/api/auth";
import { Separator } from "@board-games/ui/separator";

import { ProfileHeader } from "./_components/profile-header";
import { ProfileTabs } from "./_components/profile-tabs";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const defaultTab = (await searchParams).tab ?? "details";

  return (
    <div className="container max-w-5xl py-8">
      <ProfileHeader user={session.user} />
      <Separator className="my-6" />
      <ProfileTabs user={session.user} defaultTab={defaultTab} />
    </div>
  );
}
