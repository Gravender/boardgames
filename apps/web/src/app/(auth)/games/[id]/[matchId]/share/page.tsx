import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string; id: string }>;
}) {
  const slugs = await params;
  const matchId = slugs.matchId;
  if (isNaN(Number(matchId))) redirect("/games");
  return null;
}
