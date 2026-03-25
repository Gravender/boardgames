import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const id = (await params).id;
  redirect(`/dashboard/players/shared/${id}/stats`);
}
