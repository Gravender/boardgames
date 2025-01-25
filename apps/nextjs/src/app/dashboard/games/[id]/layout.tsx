"use server";

import { AddMatchStoreProvider } from "~/providers/add-match-provider";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddMatchStoreProvider>{children}</AddMatchStoreProvider>;
}
