"use server";

import { AddGameStoreProvider } from "~/providers/add-game-provider";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddGameStoreProvider>{children}</AddGameStoreProvider>;
}
