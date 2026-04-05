import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { GroupDetail } from "~/components/group/group-detail";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return { title: "Group" };
  }
  try {
    const group = await caller.group.getGroup({ id: numericId });
    return {
      title: group.name,
      description: `${group.name} — group`,
    };
  } catch {
    return { title: "Group" };
  }
}

export default async function Page({ params }: Props) {
  const id = (await params).id;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    redirect("/dashboard/groups");
  }
  try {
    await caller.group.getGroup({ id: numericId });
  } catch {
    redirect("/dashboard/groups");
  }
  void prefetch(trpc.group.getGroup.queryOptions({ id: numericId }));
  void prefetch(trpc.newPlayer.getPlayers.queryOptions());
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <GroupDetail groupId={numericId} />
      </div>
    </HydrateClient>
  );
}
