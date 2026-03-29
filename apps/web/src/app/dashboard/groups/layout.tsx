"use server";

import { AddGroupStoreProvider } from "~/providers/add-group-provider";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddGroupStoreProvider>{children}</AddGroupStoreProvider>;
}
