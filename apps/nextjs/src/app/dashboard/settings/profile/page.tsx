import type { User } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { Separator } from "@board-games/ui/separator";

import { ProfileHeader } from "./_components/profile-header";
import { ProfileTabs } from "./_components/profile-tabs";

export interface SerializableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  username: string | null;
  imageUrl: string;
  primaryEmailAddress: string | null;
  publicMetadata: Record<string, unknown>;
}

function extractUserData(user: User): SerializableUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    username: user.username,
    imageUrl: user.imageUrl,
    primaryEmailAddress: user.primaryEmailAddress?.emailAddress ?? null,
    publicMetadata: user.publicMetadata,
  };
}
export default async function ProfilePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const serializableUser = extractUserData(user);

  return (
    <div className="container max-w-5xl py-8">
      <ProfileHeader user={serializableUser} />
      <Separator className="my-6" />
      <ProfileTabs user={serializableUser} />
    </div>
  );
}
