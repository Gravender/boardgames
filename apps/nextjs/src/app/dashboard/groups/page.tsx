import { api, HydrateClient } from "~/trpc/server";
import { GroupTable } from "./_components/groupTable";

export default async function Page() {
  const groups = await api.group.getGroups();
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <GroupTable data={groups} />
      </div>
    </HydrateClient>
  );
}
