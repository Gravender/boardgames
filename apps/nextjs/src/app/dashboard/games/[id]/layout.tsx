"use server";

import { AddMatchStoreProvider } from "~/providers/add-match-provider";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddMatchStoreProvider>{children}</AddMatchStoreProvider>;
}
