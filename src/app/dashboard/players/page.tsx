"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { format } from "date-fns/format";
import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { api } from "~/trpc/server";

import { PlayersTable } from "./_components/players";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard");
  const players = await api.player.getPlayers();
  return (
    <div className="flex w-full items-center justify-center">
      <PlayersTable data={players} />
    </div>
  );
}
