"use server";

import { AddGroupStoreProvider } from "~/providers/add-group-provider";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddGroupStoreProvider>{children}</AddGroupStoreProvider>;
}
