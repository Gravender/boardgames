"use server";

import { AddGameStoreProvider } from "~/providers/add-game-provider";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddGameStoreProvider>{children}</AddGameStoreProvider>;
}
