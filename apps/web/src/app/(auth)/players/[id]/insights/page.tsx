import { notFound, redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  const id = (await params).id;
  if (isNaN(Number(id))) notFound();
  redirect(`/players/${id}/stats`);
}
