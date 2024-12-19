"use server";

import { EditGameStoreProvider } from "~/providers/edit-game-provider";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <EditGameStoreProvider>{children}</EditGameStoreProvider>;
}
